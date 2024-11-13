from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Tuple
import json
import base64


logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """Handles Google Calendar integration and event management"""
    
    def __init__(self, client_secrets_file: str):
        self.client_secrets_file = client_secrets_file
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        
    def get_authorization_url(self, user_id: str) -> Tuple[str, str]:
        """
        Generate authorization URL for Google OAuth2 flow
        
        Args:
            user_id: User ID to encode in state parameter
            
        Returns:
            Tuple containing authorization URL and state token
        """
        try:
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                redirect_uri="http://localhost:8000/calendar/callback"
            )
            
            # Create state parameter with user ID
            state_data = {
                "user_id": user_id,
                "timestamp": datetime.utcnow().timestamp()
            }
            state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
            
            authorization_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent',
                state=state
            )
            
            logger.info("Successfully generated authorization URL")
            return authorization_url, state
            
        except Exception as e:
            logger.error(f"Error generating authorization URL: {str(e)}")
            raise


    async def handle_oauth_callback(self, code: str) -> Dict:
        """
        Handle OAuth2 callback and get credentials
        """
        try:
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                # Update redirect URI to match FastAPI route
                redirect_uri="http://localhost:8000/calendar/callback"
            )
            
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            creds_dict = {
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            }
            
            logger.info("Successfully obtained OAuth credentials")
            return creds_dict
            
        except Exception as e:
            logger.error(f"Error handling OAuth callback: {str(e)}")
            raise
        
    def _build_calendar_service(self, credentials_dict: Dict):
        """
        Create Google Calendar API service with error handling
        
        Raises:
            ValueError: If credentials are invalid
        """
        try:
            if not all(k in credentials_dict for k in 
                      ["token", "refresh_token", "token_uri", "client_id", "client_secret"]):
                raise ValueError("Invalid credentials dictionary structure")
                
            credentials = Credentials(
                token=credentials_dict["token"],
                refresh_token=credentials_dict["refresh_token"],
                token_uri=credentials_dict["token_uri"],
                client_id=credentials_dict["client_id"],
                client_secret=credentials_dict["client_secret"],
                scopes=credentials_dict.get("scopes", self.scopes)
            )
            
            return build('calendar', 'v3', credentials=credentials)
            
        except Exception as e:
            logger.error(f"Error building calendar service: {str(e)}")
            raise
            
    async def create_calendar(self, credentials_dict: Dict, calendar_name: str) -> str:
        """
        Create a new calendar for NFL games
        
        Returns:
            Calendar ID
            
        Raises:
            HttpError: If calendar creation fails
        """
        try:
            service = self._build_calendar_service(credentials_dict)
            
            # First, check if a calendar with this name already exists
            calendar_list = service.calendarList().list().execute()
            for calendar_entry in calendar_list.get('items', []):
                if calendar_entry['summary'] == calendar_name:
                    logger.info(f"Found existing calendar: {calendar_name}")
                    return calendar_entry['id']
            
            calendar_body = {
                'summary': calendar_name,
                'description': 'NFL Game Schedule - Automatically synced',
                'timeZone': 'America/New_York'
            }
            
            created_calendar = service.calendars().insert(body=calendar_body).execute()
            logger.info(f"Successfully created calendar: {calendar_name}")
            return created_calendar['id']
            
        except Exception as e:
            logger.error(f"Error creating calendar: {str(e)}")
            raise
            
    async def sync_games_to_calendar(
    self,
    credentials_dict: Dict,
    calendar_id: str,
    games: List[Dict]
) -> int:
        """
        Sync NFL games to Google Calendar
        
        Args:
            credentials_dict: Google OAuth credentials
            calendar_id: ID of calendar to sync to
            games: List of game dictionaries
            
        Returns:
            Number of events created/updated
        """
        try:
            logger.info("Building calendar service with credentials")
            service = self._build_calendar_service(credentials_dict)
            synced_count = 0
            
            # Get existing events in the calendar
            existing_events = {}
            try:
                # List all events in the calendar
                events_result = service.events().list(
                    calendarId=calendar_id,
                    timeMin=datetime.now().isoformat() + 'Z'  # Only get future events
                ).execute()
                
                # Index existing events by game ID from description
                for event in events_result.get('items', []):
                    if 'description' in event:
                        # Extract game ID from description
                        for line in event['description'].split('\n'):
                            if line.startswith('Game ID:'):
                                game_id = line.split(':')[1].strip()
                                existing_events[game_id] = event['id']
                                break
                                
            except Exception as e:
                logger.warning(f"Error fetching existing events: {str(e)}")
            
            # Sync each game
            for game in games:
                try:
                    event = self._create_event_from_game(game)
                    game_id = game['game_id']
                    
                    if game_id in existing_events:
                        # Update existing event
                        service.events().update(
                            calendarId=calendar_id,
                            eventId=existing_events[game_id],
                            body=event
                        ).execute()
                        logger.debug(f"Updated existing event for game {game_id}")
                    else:
                        # Create new event
                        service.events().insert(
                            calendarId=calendar_id,
                            body=event
                        ).execute()
                        logger.debug(f"Created new event for game {game_id}")
                    
                    synced_count += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing game {game.get('game_id')}: {str(e)}")
                    continue
                    
            logger.info(f"Successfully synced {synced_count} games to calendar")
            return synced_count
            
        except Exception as e:
            logger.error(f"Error syncing games to calendar: {str(e)}")
            raise
    
    
    
    
    def _create_event_from_game(self, game: Dict) -> Dict:
        """
        Convert game data to Google Calendar event format
        
        Args:
            game: Game data dictionary
            
        Returns:
            Dictionary formatted for Google Calendar API
        """
        game_date = datetime.strptime(game['game_date'], '%Y-%m-%d')
        game_time = datetime.strptime(game['game_time'], '%H:%M').time()
        start_time = datetime.combine(game_date, game_time)
        
        # NFL games typically last about 3 hours
        end_time = start_time + timedelta(hours=3)
        
        teams = game['teams']
        event = {
            'summary': f"NFL: {teams['away']['name']} vs {teams['home']['name']}",
            'location': f"{teams['home']['name']} Stadium",
            'description': (
                f"Week {game['week']} NFL Game\n"
                f"{teams['away']['name']} at {teams['home']['name']}\n\n"
                f"Season: {game['season']}\n"
                f"Game ID: {game['game_id']}"
            ),
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/New_York',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 60},
                    {'method': 'email', 'minutes': 1440},  # 24 hours
                ],
            },
            'colorId': '2'  # Use a consistent color for NFL games
        }
        
        return event