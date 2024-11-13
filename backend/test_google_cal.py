import asyncio
import os
from dotenv import load_dotenv
from google_calendar_service import GoogleCalendarService
import webbrowser
from aiohttp import web
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to store the authorization code
auth_code = None
received_callback = asyncio.Event()

async def callback_handler(request):
    """Handle the OAuth callback"""
    global auth_code
    auth_code = request.query.get('code')
    received_callback.set()
    return web.Response(text="Authorization successful! You can close this window.")

async def main():
    # Load environment variables
    load_dotenv()
    client_secrets_file = os.getenv('GOOGLE_CLIENT_SECRETS_FILE')
    
    if not client_secrets_file:
        raise ValueError("GOOGLE_CLIENT_SECRETS_FILE environment variable not set")
    
    # Initialize the calendar service
    calendar_service = GoogleCalendarService(client_secrets_file)
    
    # Set up temporary web server for OAuth callback
    app = web.Application()
    app.router.add_get('/auth/google/callback', callback_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8000)
    await site.start()
    
    try:
        # Get authorization URL
        auth_url, state = calendar_service.get_authorization_url()
        print("\nOpening browser for Google Calendar authorization...")
        webbrowser.open(auth_url)
        
        # Wait for the callback
        print("Waiting for authorization...")
        await received_callback.wait()
        
        if not auth_code:
            raise ValueError("Did not receive authorization code")
            
        # Handle the OAuth callback
        print("\nGetting credentials...")
        credentials = await calendar_service.handle_oauth_callback(auth_code)
        
        # Create a test calendar
        print("\nCreating test calendar...")
        calendar_id = await calendar_service.create_calendar(
            credentials,
            "NFL Games Test"
        )
        print(f"Created calendar with ID: {calendar_id}")
        
        # Create some test game data
        test_games = [
            {
                "game_id": "2024_W1_TEST",
                "season": "2024",
                "game_date": "2024-09-08",
                "game_time": "20:00",
                "week": "1",
                "teams": {
                    "away": {
                        "id": "1",
                        "name": "Las Vegas Raiders"
                    },
                    "home": {
                        "id": "18",
                        "name": "Kansas City Chiefs"
                    }
                },
                "participating_teams": ["1", "18"]
            }
        ]
        
        # Sync test games to calendar
        print("\nSyncing test games...")
        synced_count = await calendar_service.sync_games_to_calendar(
            credentials,
            calendar_id,
            test_games
        )
        print(f"Successfully synced {synced_count} games to calendar")
        
        print("\nTest completed successfully!")
        print("Please check your Google Calendar for the new calendar and test event.")
        
    except Exception as e:
        print(f"\nError during testing: {str(e)}")
        raise
    finally:
        # Cleanup
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())