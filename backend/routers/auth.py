from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from services.auth import get_current_user
from services.firebase import get_db, ensure_effective_plan

router = APIRouter(prefix="/auth", tags=["Auth"])

class CouponRequest(BaseModel):
    code: str

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
    user_id = user['uid']
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        return ensure_effective_plan(user_id, doc.to_dict())
    else:
        # Return default free profile if not exists
        return {
            "scan_count": 0,
            "resume_count": 0,
            "resume_count_week": 0,
            "resume_count_week_key": None,
            "plan": "free",
            "plan_type": "free",
            "plan_expires_at": None
        }
