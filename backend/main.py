from fastapi import FastAPI, HTTPException, Depends, Header, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv
from datetime import datetime, date
from bson import ObjectId
from google_calendar_service import GoogleCalendarService
from fastapi.responses import RedirectResponse
import base64
import json



# Import our custom modules
from user_management import UserAuth, UserManager
from nfl_api_service import NFLAPIService
from sync_nfl_data import NFLDataSync
from database import NFLDatabase
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
CALENDAR_SECRET = os.getenv("GOOGLE_CLIENT_SECRETS_FILE")

if not MONGODB_URL or not JWT_SECRET:
    raise ValueError("Required environment variables are missing")

# Initialize security
security = HTTPBearer()

# Initialize components
app = FastAPI(
    title="NFL Calendar Sync API",
    description="API for syncing NFL games with user calendars",
    version="0.1.0",
)

user_auth = UserAuth(JWT_SECRET)
user_manager = UserManager(MONGODB_URL, user_auth)
nfl_db = NFLDatabase(MONGODB_URL)
google_calendar = GoogleCalendarService(CALENDAR_SECRET)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TeamUpdate(BaseModel):
    team_ids: List[str]

class GameResponse(BaseModel):
    game_id: str
    season: int
    game_date: str
    game_time: str
    week: str
    teams: dict
    participating_teams: List[str]

class GameFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    season: Optional[int] = None

class CalendarAuthResponse(BaseModel):
    authorization_url: str
    state: str

class CalendarSyncRequest(BaseModel):
    teams: Optional[List[str]] = None
    season: Optional[str] = None

class CalendarSyncResponse(BaseModel):
    calendar_id: str
    synced_games_count: int
    message: str
    
class GoogleCredentials(BaseModel):
    token: str
    refresh_token: str
    token_uri: str
    client_id: str
    client_secret: str
    scopes: List[str]

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    try:
        token = credentials.credentials
        user_id = user_auth.verify_token(token)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return user_id
    except Exception as e:
        logger.error(f"Error during token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )

# Basic routes
@app.get("/")
async def root():
    return {"message": "NFL Calendar Sync API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": str(datetime.utcnow())}

# User routes
@app.post("/users/register")
async def register_user(user_data: UserCreate):
    try:
        result = await user_manager.create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        return result
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@app.post("/users/login")
async def login_user(login_data: UserLogin):
    try:
        result = await user_manager.authenticate_user(
            email=login_data.email,
            password=login_data.password
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        return result
    except Exception as e:
        logger.error(f"Error during user login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# Team routes
@app.get("/teams")
async def get_teams(current_user: str = Depends(get_current_user)):
    """Get list of all NFL teams"""
    return NFLDataSync.TEAM_IDS

@app.get("/users/me/teams")
async def get_user_teams(current_user: str = Depends(get_current_user)):
    """Get current user's selected teams"""
    try:
        teams = await user_manager.get_user_teams(current_user)
        return {"teams": teams}
    except Exception as e:
        logger.error(f"Error fetching user teams: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch teams"
        )

@app.put("/users/me/teams")
async def update_user_teams(
    teams: TeamUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user's selected teams"""
    try:
        # Validate team IDs
        valid_team_ids = set(NFLDataSync.TEAM_IDS.keys())
        if not all(team_id in valid_team_ids for team_id in teams.team_ids):
            invalid_teams = [tid for tid in teams.team_ids if tid not in valid_team_ids]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid team IDs provided: {invalid_teams}"
            )
        
        success = await user_manager.update_favorite_teams(
            current_user,
            teams.team_ids
        )
        
        if success:
            return {"message": "Teams updated successfully", "teams": teams.team_ids}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update teams"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teams: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update teams"
        )

# Game routes
@app.get("/games/teams/{team_id}")
async def get_team_games(
    team_id: str,
    current_user: str = Depends(get_current_user)
):
    try:
        if team_id not in NFLDataSync.TEAM_IDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid team ID: {team_id}"
            )
            
        games = await nfl_db.find_games_by_team_id(team_id)
        return {
            "team_id": team_id,
            "team_name": NFLDataSync.TEAM_IDS[team_id],
            "games_count": len(games),
            "games": games
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team games: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch games"
        )

@app.get("/games/my-teams")
async def get_my_teams_games(current_user: str = Depends(get_current_user)):
    try:
        teams = await user_manager.get_user_teams(current_user)
        
        if not teams:
            return {
                "message": "No favorite teams selected",
                "games": []
            }
            
        games = await nfl_db.find_games_by_team_id(teams)
        
        return {
            "favorite_teams": [
                {"id": tid, "name": NFLDataSync.TEAM_IDS[tid]} 
                for tid in teams
            ],
            "games_count": len(games),
            "games": sorted(games, key=lambda x: x["game_date"])
        }
    except Exception as e:
        logger.error(f"Error fetching my teams' games: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch games"
        )

# Calendar routes
@app.get("/calendar/auth", response_model=CalendarAuthResponse)
async def get_calendar_auth(current_user: str = Depends(get_current_user)):
    """Start Google OAuth flow for calendar access"""
    try:
        auth_url, state = google_calendar.get_authorization_url(current_user)
        return {
            "authorization_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Error starting OAuth flow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize calendar authorization"
        )

@app.get("/calendar/callback")
async def handle_calendar_callback(
    code: str,
    state: str,
):
    """Handle OAuth callback, setup calendar and perform initial sync"""
    try:
        # Decode user ID from state parameter
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state))
            user_id = state_data["user_id"]
            # Optional: verify timestamp isn't too old
            timestamp = state_data["timestamp"]
            if datetime.utcnow().timestamp() - timestamp > 3600:  # 1 hour expiry
                raise ValueError("State parameter expired")
        except Exception as e:
            logger.error(f"Error decoding state parameter: {str(e)}")
            return RedirectResponse(
                url="http://localhost:5173/calendar?setup=failed",
                status_code=status.HTTP_302_FOUND
            )

        # Get credentials from Google
        credentials = await google_calendar.handle_oauth_callback(code)
        
        # Create calendar and get ID
        calendar_id = await google_calendar.create_calendar(
            credentials,
            "NFL Game Schedule"
        )
        
        # Setup user's calendar credentials using the correct method name
        setup_response = await user_manager.update_calendar_status(
            user_id,
            calendar_id,
            credentials
        )
        
        if not setup_response:
            logger.error("Failed to store calendar credentials")
            return RedirectResponse(
                url="http://localhost:5173/calendar?setup=failed",
                status_code=status.HTTP_302_FOUND
            )
        
        # Perform initial sync
        user_teams = await user_manager.get_user_teams(user_id)
        if user_teams:
            games = await nfl_db.find_games_by_team_id(user_teams)
            synced_count = await google_calendar.sync_games_to_calendar(
                credentials,
                calendar_id,
                games
            )
            
            # Update last sync timestamp with count
            await user_manager.update_last_sync(user_id, synced_count)
        
        # Redirect back to frontend with success
        return RedirectResponse(
            url="http://localhost:5173/calendar?setup=success",
            status_code=status.HTTP_302_FOUND
        )
        
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {str(e)}")
        return RedirectResponse(
            url="http://localhost:5173/calendar?setup=failed",
            status_code=status.HTTP_302_FOUND
        )
        
@app.post("/calendar/sync", response_model=CalendarSyncResponse)
async def sync_calendar(current_user: str = Depends(get_current_user)):
    try:
        user_data = await user_manager.get_user(current_user)
        if not user_data or "google_credentials" not in user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Calendar not connected"
            )
        
        teams_to_sync = await user_manager.get_user_teams(current_user)
        if not teams_to_sync:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No teams selected for syncing"
            )
        
        games = await nfl_db.find_games_by_team_id(teams_to_sync)
        if not games:
            return {
                "calendar_id": user_data.get("calendar_id", ""),
                "synced_games_count": 0,
                "message": "No games found for selected teams"
            }
        
        synced_count = await google_calendar.sync_games_to_calendar(
            user_data["google_credentials"],
            user_data["calendar_id"],
            games
        )
        
        # Update last sync timestamp with sync count
        await user_manager.update_last_sync(current_user, synced_count)  # Added sync_count parameter
        
        return {
            "calendar_id": user_data["calendar_id"],
            "synced_games_count": synced_count,
            "message": f"Successfully synced {synced_count} games to calendar"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync calendar"
        )



@app.post("/calendar/setup")
async def setup_calendar(
    credentials: GoogleCredentials,
    current_user: str = Depends(get_current_user)
):
    """
    Setup user's Google Calendar after OAuth flow
    """
    try:
        # Get existing user manager instance instead of creating new one
        success = await user_manager.update_google_credentials(
            current_user, 
            credentials.dict()
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store calendar credentials"
            )
        
        # Create NFL calendar
        calendar_id = await google_calendar.create_calendar(
            credentials.dict(),
            "NFL Game Schedule"
        )
        
        # Store calendar ID in user profile
        await user_manager.update_calendar_id(current_user, calendar_id)
        
        return {
            "message": "Calendar successfully setup",
            "calendar_id": calendar_id
        }
    except Exception as e:
        logger.error(f"Error setting up calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup calendar: {str(e)}"
        )

@app.get("/games/upcoming")
async def get_upcoming_games(
    team_id: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    try:
        if team_id:
            games = await nfl_db.find_upcoming_games_by_team_id(team_id)
        else:
            user_teams = await user_manager.get_user_teams(current_user)
            if not user_teams:
                return {
                    "message": "No favorite teams selected",
                    "games": []
                }
            games = await nfl_db.find_upcoming_games_by_team_id(user_teams)
            
        return {
            "games": games
        }
    except Exception as e:
        logger.error(f"Error fetching upcoming games: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch games"
        )

@app.get("/users/me")
async def get_current_user_profile(current_user: str = Depends(get_current_user)):
    """Get current user's profile information"""
    try:
        user_data = await user_manager.get_user(current_user)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        # Convert ObjectId to string and remove sensitive data
        user_data["_id"] = str(user_data["_id"])
        user_data.pop("password", None)
        
        return user_data
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user profile"
        )
        
@app.get("/calendar/status")
async def get_calendar_status(current_user: str = Depends(get_current_user)):
    """Get user's Google Calendar connection status"""
    try:
        user = await user_manager.get_user(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get calendar status from user document
        calendar_status = user.get("calendar_status", {})
        
        return {
            "is_connected": calendar_status.get("is_connected", False),
            "last_sync": calendar_status.get("last_sync"),
            "calendar_id": calendar_status.get("calendar_id")
        }
    except Exception as e:
        logger.error(f"Error fetching calendar status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch calendar status"
        )