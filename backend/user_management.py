from datetime import datetime
import jwt
import bcrypt
from typing import List, Dict, Optional, Union
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class UserAuth:
    """Handles user authentication and token management"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        
    def hash_password(self, password: str) -> str:
        """Hash a password for storing"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify a stored password against one provided by user"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed.encode('utf-8')
        )
        
    def create_token(self, user_id: str, expires_in: int = 86400) -> str:
        """Create a JWT token for user authentication"""
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow().timestamp() + expires_in
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
        
    def verify_token(self, token: str) -> Optional[str]:
        """Verify a JWT token and return user_id if valid"""
        try:
            decoded = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return decoded['user_id']
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {str(e)}")
            return None

class UserManager:
    """Manages user operations and team preferences"""
    
    def __init__(self, mongodb_url: str, auth: UserAuth):
        self.client = AsyncIOMotorClient(mongodb_url)
        self.db = self.client.nfl_calendar
        self.users = self.db.users
        self.auth = auth
        
    async def create_user(
        self,
        email: str,
        password: str,
        name: str
    ) -> Optional[Dict]:
        """Create a new user account"""
        try:
            if await self.users.find_one({"email": email}):
                logger.warning(f"Email already exists: {email}")
                return None
                
            user_doc = {
                "email": email,
                "password": self.auth.hash_password(password),
                "name": name,
                "created_at": datetime.utcnow(),
                "favorite_teams": [],
                "calendar_status": {
                    "is_connected": False,
                    "last_sync": None,
                    "calendar_id": None,
                    "credentials": None
                },
                "updated_at": datetime.utcnow()
            }
            
            result = await self.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            token = self.auth.create_token(user_id)
            
            return {
                "user_id": user_id,
                "email": email,
                "name": name,
                "token": token
            }
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise
            
    async def authenticate_user(
        self,
        email: str,
        password: str
    ) -> Optional[Dict]:
        """Authenticate a user and return token"""
        try:
            user = await self.users.find_one({"email": email})
            if not user or not self.auth.verify_password(password, user["password"]):
                return None
                
            token = self.auth.create_token(str(user["_id"]))
            return {
                "user_id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "token": token
            }
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            raise

    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user profile information"""
        try:
            user = await self.users.find_one({"_id": ObjectId(user_id)})
            if user:
                # Convert ObjectId to string for JSON serialization
                user["_id"] = str(user["_id"])
                return user
            return None
        except Exception as e:
            logger.error(f"Error fetching user: {str(e)}")
            raise

    async def update_favorite_teams(
        self,
        user_id: str,
        team_ids: List[str]
    ) -> bool:
        """Update user's favorite teams list"""
        try:
            result = await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "favorite_teams": team_ids,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating favorite teams: {str(e)}")
            raise

    async def get_user_teams(self, user_id: str) -> List[str]:
        """Get user's selected teams"""
        try:
            user = await self.users.find_one({"_id": ObjectId(user_id)})
            return user.get("favorite_teams", []) if user else []
        except Exception as e:
            logger.error(f"Error fetching user teams: {str(e)}")
            raise

    async def update_calendar_status(
        self,
        user_id: str,
        calendar_id: str,
        credentials: Dict
    ) -> bool:
        """Update user's calendar connection status"""
        try:
            result = await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "calendar_status": {
                            "is_connected": True,
                            "calendar_id": calendar_id,
                            "credentials": credentials,
                            "last_sync": None
                        },
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating calendar status: {str(e)}")
            raise

    async def update_last_sync(
        self,
        user_id: str,
        sync_count: int
    ) -> bool:
        """Update last sync timestamp and count"""
        try:
            result = await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "calendar_status.last_sync": {
                            "timestamp": datetime.utcnow(),
                            "games_synced": sync_count
                        },
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating last sync: {str(e)}")
            raise

    async def get_calendar_status(self, user_id: str) -> Dict:
        """Get user's calendar status"""
        try:
            user = await self.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {
                    "is_connected": False,
                    "last_sync": None,
                    "calendar_id": None
                }
            
            calendar_status = user.get("calendar_status", {})
            return {
                "is_connected": calendar_status.get("is_connected", False),
                "last_sync": calendar_status.get("last_sync"),
                "calendar_id": calendar_status.get("calendar_id"),
                "credentials": calendar_status.get("credentials")
            }
        except Exception as e:
            logger.error(f"Error fetching calendar status: {str(e)}")
            raise

    async def revoke_calendar_access(self, user_id: str) -> bool:
        """Revoke user's calendar access"""
        try:
            result = await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "calendar_status": {
                            "is_connected": False,
                            "last_sync": None,
                            "calendar_id": None,
                            "credentials": None
                        },
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error revoking calendar access: {str(e)}")
            raise

    async def close(self):
        """Close the database connection"""
        self.client.close()