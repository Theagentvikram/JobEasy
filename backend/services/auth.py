from fastapi import HTTPException, Header, Depends
from typing import Optional
from services.firebase import verify_token
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

DEV_TOKEN = "dev-token-jobeasy-2026"
DEV_USER = {
    "uid": "dev-user-001",
    "email": "dev@jobeasy.app",
    "name": "Dev User",
}

# Single shared executor for Firebase calls (blocking I/O)
_executor = ThreadPoolExecutor(max_workers=4)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]

    # Dev bypass — skip Firebase when running locally
    if token == DEV_TOKEN and os.getenv("DEV_MODE", "").lower() in ("1", "true"):
        return DEV_USER

    try:
        # Run blocking Firebase verify in thread pool with 8s timeout
        # so it never blocks the async event loop
        loop = asyncio.get_event_loop()
        decoded = await asyncio.wait_for(
            loop.run_in_executor(_executor, verify_token, token),
            timeout=8.0,
        )
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        return decoded
    except asyncio.TimeoutError:
        print("Firebase token verification timed out")
        raise HTTPException(status_code=401, detail="Authentication timed out — please try again")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token Verification Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
