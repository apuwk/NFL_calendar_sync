import aiohttp
import asyncio
from datetime import datetime
import logging
from typing import List, Dict, Optional
from dotenv import load_dotenv
import os
import pytz

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NFLAPIService:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        self.api_key = os.getenv("NFL_API_KEY")
        if not self.api_key:
            raise ValueError("NFL_API_KEY not found in environment variables")
            
        self.base_url = "https://v1.american-football.api-sports.io"
        self.headers = {
            'x-rapidapi-host': "v1.american-football.api-sports.io",
            'x-rapidapi-key': self.api_key
        }

    async def fetch_team_games(self, team_id: str, season: int) -> List[Dict]:
        """
        Fetch all games for a specific team in a given season
        
        Args:
            team_id (str): Team identifier (e.g., "LV" for Raiders)
            season (int): Season year (e.g., 2023)
            
        Returns:
            List[Dict]: List of game dictionaries
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/games"
                params = {
                    'team': team_id,
                    'season': str(season)
                }
                
                logger.info(f"Fetching games for team {team_id} in season {season}")
                
                async with session.get(url, headers=self.headers, params=params) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"API request failed: {response.status} - {error_text}")
                        return []
                    
                    data = await response.json()
                    
                    if not data.get("response"):
                        logger.error("No response data from API")
                        return []
                    
                    # Transform the API response to our database format
                    return [self._transform_game_data(game) for game in data["response"]]
                    
        except Exception as e:
            logger.error(f"Error fetching team games: {str(e)}")
            return []

    async def fetch_season_games(self, season: int) -> List[Dict]:
        """
        Fetch all NFL games for a specific season
        
        Args:
            season (int): Season year (e.g., 2023)
            
        Returns:
            List[Dict]: List of game dictionaries
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/games"
                params = {
                    'league': '1',  # NFL league ID
                    'season': str(season)
                }
                
                logger.info(f"Fetching all games for season {season}")
                
                async with session.get(url, headers=self.headers, params=params) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"API request failed: {response.status} - {error_text}")
                        return []
                    
                    data = await response.json()
                    
                    if not data.get("response"):
                        logger.error("No response data from API")
                        return []
                    
                    return [self._transform_game_data(game) for game in data["response"]]
                    
        except Exception as e:
            logger.error(f"Error fetching season games: {str(e)}")
            return []

    def _transform_game_data(self, api_game: Dict) -> Dict:
        """
        Transform API response data into our database format
        
        Args:
            api_game (Dict): Raw game data from API
            
        Returns:
            Dict: Transformed game data matching our database schema
        """
        try:
            home_id = str(api_game["teams"]["home"]["id"])
            away_id = str(api_game["teams"]["away"]["id"])
            
            game_date = api_game["game"]["date"]["date"]
            game_time = api_game["game"]["date"]["time"]
            
            # Assuming times are in Eastern Time
            local_dt = datetime.strptime(f"{game_date} {game_time}", "%Y-%m-%d %H:%M")
            eastern = pytz.timezone('America/New_York')
            local_dt = eastern.localize(local_dt)
            utc_dt = local_dt.astimezone(pytz.UTC)
            
            return {
                "game_id": str(api_game["game"]["id"]),
                "season": api_game["league"]["season"],
                "game_date": api_game["game"]["date"]["date"],
                "game_time": api_game["game"]["date"]["time"],
                "week": api_game["game"]["week"],
                "participating_teams": [home_id, away_id],
                "teams": {
                    "home": {
                        "id": api_game["teams"]["home"]["id"],
                        "name": api_game["teams"]["home"]["name"],
                    },
                    "away": {
                        "id": api_game["teams"]["away"]["id"],
                        "name": api_game["teams"]["away"]["name"],
                    }
                },
            }
        except KeyError as e:
            logger.error(f"Error transforming game data: {str(e)}")
            logger.error(f"Problematic game data: {api_game}")
            raise

    async def test_connection(self) -> bool:
        """
        Test the API connection and credentials
        
        Returns:
            bool: True if connection is successful, False otherwise
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/status"
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("response", {}).get("subscription", {}).get("active", False)
                    return False
        except Exception as e:
            logger.error(f"Error testing API connection: {str(e)}")
            return False


if __name__ == "__main__":
    import json