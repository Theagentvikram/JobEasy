from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.auth import get_current_user
from services.firebase import get_db, ensure_effective_plan
import os
import hmac
import hashlib
from datetime import datetime, timezone, timedelta

try:
    import razorpay
    _razorpay_available = True
except ImportError:
    _razorpay_available = False
    print("WARNING: razorpay package not installed. Run: pip install razorpay")

router = APIRouter(prefix="/payment", tags=["Payment"])

# Initialize Razorpay client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

if _razorpay_available and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    print("Razorpay client initialized.")
else:
    razorpay_client = None
    if not _razorpay_available:
        print("WARNING: razorpay package not installed. Payment features disabled.")
    else:
        print("WARNING: Razorpay credentials not set. Payment features disabled.")

# Hardcoded Coupons
COUPONS = {
    "BOSS45": 100,  # 100% off
    "GETJOB": 30,   # 30% off
    "JOBEASY45": 45 # 45% off
}

PLAN_DURATIONS_DAYS = {
    "weekly": 7,
    "monthly": 30,
    "quarterly": 90,
}


def normalize_plan_type(plan: str) -> str:
    allowed = {"weekly", "monthly", "quarterly", "lifetime"}
    if plan in allowed:
        return plan
    if plan == "pro":
        # Backward compatibility with older frontend payloads
        return "quarterly"
    return "quarterly"


def compute_plan_expiry(plan_type: str):
    if plan_type == "lifetime":
        return None
    days = PLAN_DURATIONS_DAYS.get(plan_type, 90)
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

class CreateOrderRequest(BaseModel):
    amount: int  # Amount in smallest unit (paise for INR, cents for USD)
    plan: str = "quarterly"
    currency: str = "INR"
    coupon_code: str = None # Optional coupon code

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class ValidateCouponRequest(BaseModel):
    code: str

@router.get("/config")
async def get_payment_config():
    """Returns Razorpay key ID for frontend checkout."""
    return {"key_id": RAZORPAY_KEY_ID}

@router.post("/validate-coupon")
async def validate_coupon(req: ValidateCouponRequest):
    """Checks if a coupon code is valid and returns the discount percentage."""
    code = req.code.strip().upper()
    if code in COUPONS:
        return {"valid": True, "discount": COUPONS[code]}
    return {"valid": False, "discount": 0, "message": "Invalid coupon code"}

@router.post("/create-order")
async def create_order(req: CreateOrderRequest, user=Depends(get_current_user)):
    """Creates a Razorpay order for plan upgrade, applying coupons if valid."""
    plan_type = normalize_plan_type(req.plan)
    coupon_code = (req.coupon_code or "").strip().upper()
    
    # 1. Handle Coupon Logic
    discount_percent = 0
    if coupon_code and coupon_code in COUPONS:
        discount_percent = COUPONS[coupon_code]
        print(f"Applying coupon {coupon_code}: {discount_percent}% off")
    
    # 2. Check for 100% OFF (Direct Activation)
    if discount_percent == 100:
        print(f"Coupon {coupon_code} grants 100% off. Activating paid access directly.")
        try:
            user_id = user['uid']
            db = get_db()
            user_ref = db.collection('users').document(user_id)
            now_iso = datetime.now(timezone.utc).isoformat()
            expires_at = compute_plan_expiry(plan_type)
            
            # Activate paid plan immediately when coupon is full-discount
            user_ref.set({
                "plan": "pro",
                "plan_type": plan_type,
                "plan_activated_at": now_iso,
                "plan_expires_at": expires_at,
                "pro_activated_at": "coupon_" + coupon_code,
                "razorpay_order_id": "bypass_coupon"
            }, merge=True)
            
            return {
                "status": "activated",
                "message": "Paid plan activated successfully via coupon!",
                "plan": "pro",
                "plan_type": plan_type
            }
        except Exception as e:
            print(f"Coupon Activation Error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to activate plan: {str(e)}")

    # 3. Handle Standard/Discounted Payment via Razorpay
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    try:
        # Calculate discounted amount
        final_amount = req.amount
        if discount_percent > 0:
            final_amount = int(req.amount * (1 - discount_percent / 100))
        
        # Ensure amount is at least 100 paise (Razorpay minimum) unless 0 which is handled above
        if final_amount < 100:
            final_amount = 100 
            
        order_data = {
            "amount": final_amount,
            "currency": req.currency,
            "receipt": f"order_{user['uid']}_{plan_type}",
            "notes": {
                "user_id": user['uid'],
                "plan": plan_type,
                "email": user.get('email', ''),
                "coupon": coupon_code
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        # Save order to Firestore for tracking
        db = get_db()
        db.collection('orders').document(order['id']).set({
            "orderId": order['id'],
            "userId": user['uid'],
            "amount": final_amount,
            "originalAmount": req.amount,
            "discount": discount_percent,
            "coupon": coupon_code,
            "plan": plan_type,
            "status": "created",
            "createdAt": order.get('created_at', ''),
        })
        
        return {
            "order_id": order['id'],
            "amount": order['amount'],
            "currency": order['currency'],
            "key_id": RAZORPAY_KEY_ID,
            "discount_applied": discount_percent
        }
    except Exception as e:
        print(f"Razorpay Order Creation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(e)}")

@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, user=Depends(get_current_user)):
    """Verifies Razorpay payment signature and upgrades user to paid plan."""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    try:
        # Verify signature using HMAC SHA256
        message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != req.razorpay_signature:
            raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")
        
        # Resolve purchased plan from order metadata
        user_id = user['uid']
        db = get_db()
        order_ref = db.collection('orders').document(req.razorpay_order_id)
        order_doc = order_ref.get()
        order_data = order_doc.to_dict() if order_doc.exists else {}
        plan_type = normalize_plan_type(order_data.get("plan", "quarterly"))
        now_iso = datetime.now(timezone.utc).isoformat()
        expires_at = compute_plan_expiry(plan_type)
        
        user_ref = db.collection('users').document(user_id)
        doc = user_ref.get()
        
        if doc.exists:
            user_ref.update({
                "plan": "pro",
                "plan_type": plan_type,
                "plan_activated_at": now_iso,
                "plan_expires_at": expires_at,
                "pro_activated_at": req.razorpay_payment_id,
                "razorpay_order_id": req.razorpay_order_id
            })
        else:
            user_ref.set({
                "scan_count": 0,
                "resume_count": 0,
                "resume_count_week": 0,
                "resume_count_week_key": None,
                "plan": "pro",
                "plan_type": plan_type,
                "plan_activated_at": now_iso,
                "plan_expires_at": expires_at,
                "pro_activated_at": req.razorpay_payment_id,
                "razorpay_order_id": req.razorpay_order_id
            })
        
        # Update order status
        order_ref.set({
            "status": "paid",
            "paymentId": req.razorpay_payment_id,
            "plan_type": plan_type
        }, merge=True)
        
        return {
            "status": "success", 
            "message": "Payment verified! Paid pass activated.",
            "plan": "pro",
            "plan_type": plan_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Payment Verification Error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@router.get("/status")
async def get_payment_status(user=Depends(get_current_user)):
    """Check user's current plan status."""
    db = get_db()
    user_ref = db.collection('users').document(user['uid'])
    doc = user_ref.get()
    
    if doc.exists:
        data = ensure_effective_plan(user['uid'], doc.to_dict())
        return {
            "plan": data.get("plan", "free"),
            "plan_type": data.get("plan_type", "free"),
            "plan_expires_at": data.get("plan_expires_at"),
            "scan_count": data.get("scan_count", 0),
            "resume_count": data.get("resume_count", 0)
        }
    
    return {"plan": "free", "plan_type": "free", "plan_expires_at": None, "scan_count": 0, "resume_count": 0}
