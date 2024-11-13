# sync_nfl_data.py
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv
import os

# Import our custom classes
from database import NFLDatabase
from nfl_api_service import NFLAPIService

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create console handler and set level to INFO
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Add formatter to console handler
console_handler.setFormatter(formatter)

# Add console handler to logger
logger.addHandler(console_handler)

class NFLDataSync:
    """Utility for syncing NFL game data"""
    
    # NFL team IDs and names mapping
    TEAM_IDS = {
        "1": "Las Vegas Raiders",
        "2": "Jacksonville Jaguars",
        "3": "New England Patriots",
        "4": "New York Giants",
        "5": "Baltimore Ravens",
        "6": "Tennessee Titans",
        "7": "Detroit Lions",
        "8": "Atlanta Falcons",
        "9": "Cleveland Browns",
        "10": "Cincinnati Bengals",
        "11": "Arizona Cardinals",
        "12": "Philadelphia Eagles",
        "13": "New York Jets",
        "14": "San Francisco 49ers",
        "15": "Green Bay Packers",
        "16": "Chicago Bears",
        "17": "Kansas City Chiefs",
        "18": "Washington Commanders",
        "19": "Carolina Panthers",
        "20": "Buffalo Bills",
        "21": "Indianapolis Colts",
        "22": "Pittsburgh Steelers",
        "23": "Seattle Seahawks",
        "24": "Tampa Bay Buccaneers",
        "25": "Miami Dolphins",
        "26": "Houston Texans",
        "27": "New Orleans Saints",
        "28": "Denver Broncos",
        "29": "Dallas Cowboys",
        "30": "Los Angeles Chargers",
        "31": "Los Angeles Rams",
        "32": "Minnesota Vikings"
    }

    
    def __init__(self, mongodb_url: str):
        self.nfl_db = NFLDatabase(mongodb_url)
        self.nfl_api = NFLAPIService()
        self.logger = logging.getLogger(__name__)
        
    async def sync_team(self, team_id: str, season: int):
        """Sync single team's schedule"""
        try:
            team_name = self.TEAM_IDS.get(team_id, f"Unknown Team {team_id}")
            self.logger.info(f"Syncing schedule for {team_name} (ID: {team_id})...")
            
            games = await self.nfl_api.fetch_team_games(team_id, season)
            for game in games:
                await self.nfl_db.store_game(game)
                
            return len(games)
        except Exception as e:
            self.logger.error(f"Error syncing team {team_id}: {str(e)}")
            raise
            
    async def sync_multiple_teams(self, team_ids: List[str], season: int):
        """Sync multiple teams' schedules"""
        total_games = 0
        for team_id in team_ids:
            games_count = await self.sync_team(team_id, season)
            total_games += games_count
            await asyncio.sleep(1)  # Rate limiting
        return total_games
    
    async def sync_season_games(self, season: int):
        """Sync multiple seasons games"""
        self.logger.info(f"Syncing schedule for the Season {season}...")
        games = await self.nfl_api.fetch_season_games(season)
        for game in games:
            await self.nfl_db.store_game(game)
        return len(games)

async def main():
    """Main execution function"""
    logger = logging.getLogger(__name__)
    
    try:
        # Load environment variables
        load_dotenv()
        mongodb_url = os.getenv("MONGODB_URL")
        
        if not mongodb_url:
            raise ValueError("MONGODB_URL not found in environment variables")
            
        # Initialize sync utility
        sync_utility = NFLDataSync(mongodb_url)
        
        team_ids = [str(i) for i in range(1, 33)]
        total_games = await sync_utility.sync_season_games(2024)
        
        logger.info(f"Successfully synced {total_games} games")
        
    except Exception as e:
        logger.error(f"Sync process failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Set up basic configuration for logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    asyncio.run(main())