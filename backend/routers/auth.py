from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from services.auth import get_current_user, DEV_TOKEN, DEV_USER
from services.firebase import get_db, ensure_effective_plan
import os

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/dev-login")
async def dev_login():
    """Dev-only login bypass. Returns a token that skips Firebase auth."""
    if os.getenv("DEV_MODE", "").lower() not in ("1", "true"):
        raise HTTPException(403, "Dev login only available in DEV_MODE")
    return {
        "token": DEV_TOKEN,
        "user": {
            "uid": DEV_USER["uid"],
            "email": DEV_USER["email"],
            "displayName": DEV_USER["name"],
            "photoURL": None,
            "plan": "pro",
            "plan_type": "lifetime",
            "scan_count": 0,
            "resume_count": 0,
            "resume_count_week": 0,
        },
    }

class CouponRequest(BaseModel):
    code: str


class SettingsRequest(BaseModel):
    jobspy_enabled: bool

@router.post("/redeem-coupon")
async def redeem_coupon(req: CouponRequest, user=Depends(get_current_user)):
    user_id = user['uid']
    
    if req.code.upper() != "BOSS45":
        raise HTTPException(status_code=400, detail="Invalid coupon code")
        
    db = get_db()
    # Update user plan to 'pro'
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        if hasattr(user_ref, "update"):
            user_ref.update({"plan": "pro", "plan_type": "lifetime", "plan_expires_at": None})
        else:
            data = doc.to_dict()
            data["plan"] = "pro"
            data["plan_type"] = "lifetime"
            data["plan_expires_at"] = None
            user_ref.set(data)
    else:
        # Create user with pro plan
        user_ref.set({"scan_count": 0, "resume_count": 0, "plan": "pro", "plan_type": "lifetime", "plan_expires_at": None})
        
    return {"status": "success", "message": "Pro plan unlocked successfully!", "plan": "pro"}

@router.post("/downgrade")
async def downgrade_plan(user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        if hasattr(user_ref, "update"):
            user_ref.update({"plan": "free", "plan_type": "free", "plan_expires_at": None})
        else:
            data = doc.to_dict()
            data["plan"] = "free"
            data["plan_type"] = "free"
            data["plan_expires_at"] = None
            user_ref.set(data)
            
    return {"status": "success", "message": "Plan downgraded to Free", "plan": "free"}

@router.get("/me")
async def get_user_profile(user=Depends(get_current_user)):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    user_id = user['uid']

    # Dev user — return mock profile, skip Firestore
    if user_id == DEV_USER["uid"]:
        return {
            "uid": DEV_USER["uid"],
            "email": DEV_USER["email"],
            "displayName": DEV_USER["name"],
            "photoURL": None,
            "plan": "pro",
            "plan_type": "lifetime",
            "plan_expires_at": None,
            "scan_count": 0,
            "resume_count": 0,
            "resume_count_week": 0,
            "settings": {"jobspy_enabled": True},
        }

    def _fetch_profile():
        db = get_db()
        user_ref = db.collection('users').document(user_id)
        doc = user_ref.get()
        if doc.exists:
            profile = ensure_effective_plan(user_id, doc.to_dict())
            settings = profile.get("settings") if isinstance(profile.get("settings"), dict) else {}
            jobspy_enabled = bool(settings.get("jobspy_enabled", profile.get("jobspy_enabled", False)))
            profile["settings"] = {**settings, "jobspy_enabled": jobspy_enabled}
            return profile
        return {
            "scan_count": 0,
            "resume_count": 0,
            "resume_count_week": 0,
            "resume_count_week_key": None,
            "plan": "free",
            "plan_type": "free",
            "plan_expires_at": None,
            "settings": {"jobspy_enabled": False}
        }

    loop = asyncio.get_event_loop()
    try:
        profile = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_profile),
            timeout=8.0,
        )
        return profile
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Profile fetch timed out — please retry")


@router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    user_id = user["uid"]
    db = get_db()
    doc = db.collection("users").document(user_id).get()
    data = doc.to_dict() if doc.exists else {}
    settings = data.get("settings") if isinstance(data.get("settings"), dict) else {}
    jobspy_enabled = bool(settings.get("jobspy_enabled", data.get("jobspy_enabled", False)))
    return {"jobspy_enabled": jobspy_enabled}


@router.put("/settings")
async def update_settings(req: SettingsRequest, user=Depends(get_current_user)):
    user_id = user["uid"]
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    user_ref.set({
        "settings": {
            "jobspy_enabled": bool(req.jobspy_enabled)
        },
        # Keep flat alias for compatibility with older reads.
        "jobspy_enabled": bool(req.jobspy_enabled),
    }, merge=True)

    return {
        "status": "success",
        "settings": {
            "jobspy_enabled": bool(req.jobspy_enabled)
        }
    }
