from fastapi import HTTPException, Header, Depends
from typing import Optional
from services.firebase import verify_token

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    
    try:
        decoded = verify_token(token)
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        return decoded
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token Verification Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
