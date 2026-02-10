from fastapi import HTTPException, Header, Depends
from typing import Optional
from services.firebase import verify_token

# DEV MODE: Set to False for production!
DEV_MODE = False
DEV_USER = {"uid": "dev_user_123", "email": "dev@jobeasy.local", "name": "Developer"}

async def get_current_user(authorization: Optional[str] = Header(None)):
    # DEV MODE bypass - skip auth entirely
    if DEV_MODE:
        return DEV_USER
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    
    # Handle Mock Token from Frontend (for testing without Firebase Auth)
    if token.startswith("mock-token-"):
        email = token.replace("mock-token-", "")
        # Create a consistent UID for this mock user so limits work
        # e.g. mock_user_sidhardharoy9@gmail.com
        return {
            "uid": f"mock_user_{email}",
            "email": email,
            "name": "Test User",
            "picture": ""
        }

    decoded = verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    return decoded
