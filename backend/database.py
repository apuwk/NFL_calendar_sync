from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Dict, Optional, Union, Any
import logging
from nfl_api_service import NFLAPIService

logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Base class for database connections and common operations"""
    
    def __init__(self, mongodb_url: str, database_name: str = "nfl_calendar"):
        self.client = AsyncIOMotorClient(mongodb_url)
        self.db = self.client[database_name]
        
    async def close(self):
        """Properly close database connection"""
        self.client.close()
        
    async def ping(self) -> bool:
        """Check database connectivity"""
        try:
            await self.client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            return False

class NFLDatabase(DatabaseConnection):
    """Handles NFL game data storage and retrieval"""
    
    def __init__(self, mongodb_url: str, database_name: str = "nfl_calendar"):
        super().__init__(mongodb_url, database_name)
        self.games = self.db.games
        
    async def setup_indexes(self):
        """Initialize database indexes"""
        try:
            await self.games.create_index("game_id", unique=True)
            await self.games.create_index([
                ("season", 1), 
                ("participating_teams", 1)
            ])
            await self.games.create_index("game_date")
            logger.info("Successfully created indexes for games collection")
        except Exception as e:
            logger.error(f"Error setting up indexes: {str(e)}")
            raise
        
    async def store_game(self, game_data: Dict[str, Any]) -> bool:
        """
        Store a single game in the database
        
        Args:
            game_data: Dictionary containing game information
            
        Returns:
            bool: True if storage was successful, False otherwise
            
        Raises:
            ValueError: If game_data lacks required fields
        """
        required_fields = ['game_id', 'season', 'participating_teams', 'game_date']
        if not all(field in game_data for field in required_fields):
            raise ValueError(f"Game data missing required fields: {required_fields}")
            
        try:
            game_data["last_updated"] = datetime.utcnow()
            game_data["calendar_synced"] = False
            
            result = await self.games.update_one(
                {"game_id": game_data["game_id"]},
                {"$set": game_data},
                upsert=True
            )
            return result.modified_count > 0 or result.upserted_id is not None
            
        except Exception as e:
            logger.error(f"Error storing game {game_data.get('game_id')}: {str(e)}")
            raise
            
    async def find_games_by_team_id(
    self,
    team_id: Union[str, List[str]],  # Changed to str since NFL team IDs are strings
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
        """
        Find all games where specific team(s) are participating.
        
        Args:
            team_id: Single team ID or list of team IDs to search for
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            List of games where any of the specified teams are participating
        """
        try:
            
            # Construct the query
            query = {
                "participating_teams": (
                    {"$in": team_id} if isinstance(team_id, (list, tuple))
                    else team_id
                )
            }
            
            # Add date filters if provided
            if start_date or end_date:
                query["game_date"] = {}
                if start_date:
                    query["game_date"]["$gte"] = start_date
                if end_date:
                    query["game_date"]["$lte"] = end_date
            
            
            # Execute query
            projection = {'_id': 0}
            cursor = self.games.find(query, projection)
            games = await cursor.to_list(length=None)
            
            print(f"Found {len(games)} games")
            
            return games
        
        except Exception as e:
            logger.error(f"Error finding games for team(s) {team_id}: {str(e)}")
            print(f"Error details: {str(e)}")
            raise
    
    async def find_season_games(self, season: str) -> List[Dict]:
        """
        Find all games for a specific season
        
        Args:
            season (int): The season year (e.g., 2024)
            
        Returns:
            List[Dict]: List of games for the specified season
        """
        try:
            print(f"\n=== Find Season Games Debug ===")
            print(f"Looking up games for season: {season}")
            
            projection = {'_id': 0}
            cursor = self.games.find({"season": season}, projection)
            games = await cursor.to_list(length=None)
            
            print(f"Found {len(games)} games for season {season}")
            
            return games
        except Exception as e:
            logger.error(f"Error finding season games: {str(e)}")
            print(f"Error details: {str(e)}")
            raise
    
    async def find_upcoming_games_by_team_id(
    self,
    team_id: Union[str, List[str]]
    ) -> List[Dict[str, Any]]:
        """
        Find all upcoming games where specific team(s) are participating.
        
        Args:
            team_id: Single team ID or list of team IDs to search for
            
        Returns:
            List of games where any of the specified teams are participating
        """
        try:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            query = {
                "participating_teams": (
                    {"$in": team_id} if isinstance(team_id, (list, tuple))
                    else team_id
                ),
                "game_date": {"$gte": today.strftime("%Y-%m-%d")}
            }
            
            projection = {'_id': 0}
            cursor = self.games.find(query, projection).sort("game_date", 1)
            games = await cursor.to_list(length=None)
            
            return games
            
        except Exception as e:
            logger.error(f"Error finding upcoming games for team(s) {team_id}: {str(e)}")
            raise
        
class UserDatabase(DatabaseConnection):
    """Handles user preferences and calendar sync settings"""
    
    def __init__(self, mongodb_url: str, database_name: str = "nfl_calendar"):
        super().__init__(mongodb_url, database_name)
        self.users = self.db.users
        
    async def setup_indexes(self):
        """Initialize database indexes"""
        try:
            await self.users.create_index("user_id", unique=True)
            await self.users.create_index("email", unique=True)
            await self.users.create_index("google_id", sparse=True, unique=True)
            logger.info("Successfully created indexes for users collection")
        except Exception as e:
            logger.error(f"Error setting up indexes: {str(e)}")
            raise
        
    async def create_or_update_user(self, user_data: Dict[str, Any]) -> bool:
        """
        Create or update user profile
        
        Args:
            user_data: Dictionary containing user information
            
        Returns:
            bool: True if operation was successful
            
        Raises:
            ValueError: If required fields are missing
        """
        if not all(field in user_data for field in ['user_id', 'email']):
            raise ValueError("User data missing required fields: user_id, email")
            
        try:
            user_doc = {
                "user_id": user_data["user_id"],
                "email": user_data["email"],
                "google_id": user_data.get("google_id"),
                "google_credentials": user_data.get("google_credentials"),
                "selected_teams": user_data.get("selected_teams", []),
                "calendar_sync_enabled": user_data.get("calendar_sync_enabled", True),
                "last_updated": datetime.utcnow()
            }
            
            result = await self.users.update_one(
                {"user_id": user_data["user_id"]},
                {"$set": user_doc},
                upsert=True
            )
            return result.modified_count > 0 or result.upserted_id is not None
            
        except Exception as e:
            logger.error(f"Error updating user {user_data.get('user_id')}: {str(e)}")
            raise
            
    async def update_user_teams(self, user_id: str, team_ids: List[str]) -> bool:
        """
        Update user's selected teams
        
        Returns:
            bool: True if update was successful
        """
        try:
            result = await self.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "selected_teams": team_ids,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating teams for user {user_id}: {str(e)}")
            raise
            
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        try:
            return await self.users.find_one({"user_id": user_id})
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {str(e)}")
            raise
            
    async def get_user_teams(self, user_id: str) -> List[str]:
        """Get user's selected teams"""
        try:
            user = await self.get_user(user_id)
            return user.get("selected_teams", []) if user else []
        except Exception as e:
            logger.error(f"Error fetching teams for user {user_id}: {str(e)}")
            raise
            
    async def update_google_credentials(
        self,
        user_id: str,
        credentials: Dict[str, Any]
    ) -> bool:
        """
        Update user's Google Calendar credentials
        
        Returns:
            bool: True if update was successful
        """
        try:
            result = await self.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "google_credentials": credentials,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating credentials for user {user_id}: {str(e)}")
            raise
        
    