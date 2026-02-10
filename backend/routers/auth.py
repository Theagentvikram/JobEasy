from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from services.auth import get_current_user
from services.firebase import get_db

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
            user_ref.update({"plan": "pro"})
        else:
            data = doc.to_dict()
            data["plan"] = "pro"
            user_ref.set(data)
    else:
        # Create user with pro plan
        user_ref.set({"scan_count": 0, "resume_count": 0, "plan": "pro"})
        
    return {"status": "success", "message": "Pro plan unlocked successfully!", "plan": "pro"}

@router.post("/downgrade")
async def downgrade_plan(user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        if hasattr(user_ref, "update"):
            user_ref.update({"plan": "free"})
        else:
            data = doc.to_dict()
            data["plan"] = "free"
            user_ref.set(data)
            
    return {"status": "success", "message": "Plan downgraded to Free", "plan": "free"}

@router.get("/me")
async def get_user_profile(user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        return doc.to_dict()
    else:
        # Return default free profile if not exists
        return {"scan_count": 0, "resume_count": 0, "plan": "free"}
