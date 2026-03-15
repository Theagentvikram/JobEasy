import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from typing import Optional

load_dotenv()

FREE_SCAN_DAILY_LIMIT = 1
FREE_RESUME_LIFETIME_LIMIT = 2
PAID_SCAN_DAILY_LIMIT = 20
PAID_RESUME_WEEKLY_LIMIT = 10

# Initialize Firebase Admin SDK
cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")

if os.path.exists(cred_path):
    print(f"Loading Firebase credentials from file: {cred_path}")
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
elif os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"):
    print("Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var")
    import json
    cred_dict = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
    cred = credentials.Certificate(cred_dict)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
else:
    print("CRITICAL: serviceAccountKey.json not found AND FIREBASE_SERVICE_ACCOUNT_JSON not set.")
    print("Firebase features will NOT work. Please provide credentials.")

def verify_token(token: str):
    if not firebase_admin._apps:
        raise Exception("Firebase Admin SDK not initialized. Cannot verify tokens.")

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

# Firestore client singleton
_db_instance = None

def get_db():
    """Returns a Firestore client. Raises Exception if unavailable."""
    global _db_instance

    if _db_instance:
        return _db_instance

    if not firebase_admin._apps:
        raise Exception("Firebase Admin SDK not initialized. Cannot access Firestore.")

    _db_instance = firestore.client()
    print("Firestore client created.")
    return _db_instance


# Eagerly init Firestore at module load so the first request doesn't pay cold-start cost
try:
    _db_instance = get_db()
    print("Firestore client eagerly initialized at startup.")
except Exception as _init_err:
    print(f"Firestore eager init skipped (non-fatal): {_init_err}")


def _get_today_str():
    """Returns today's date as YYYY-MM-DD string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _get_week_key():
    """Returns ISO week key as YYYY-Www."""
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _parse_iso_datetime(value):
    if not value or not isinstance(value, str):
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def is_paid_plan_active(user_data: dict) -> bool:
    """
    Determines whether a paid plan is currently active.
    Legacy users with plan='pro' and no pass metadata remain active.
    """
    if user_data.get("plan") != "pro":
        return False

    pass_type = user_data.get("plan_type")
    if not pass_type:
        # Legacy perpetual "pro" records
        return True

    if pass_type == "lifetime":
        return True

    expires_at_raw = user_data.get("plan_expires_at")
    expires_at = _parse_iso_datetime(expires_at_raw)
    if not expires_at:
        return False

    return expires_at > datetime.now(timezone.utc)


def ensure_effective_plan(user_id: str, user_data: Optional[dict] = None):
    """
    Normalizes expired paid passes to free plan and returns effective user data.
    """
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    data = user_data if user_data is not None else {}

    if user_data is None:
        doc = user_ref.get()
        if not doc.exists:
            return {
                "scan_count": 0,
                "scan_count_date": _get_today_str(),
                "resume_count": 0,
                "resume_count_week": 0,
                "resume_count_week_key": _get_week_key(),
                "plan": "free",
                "plan_type": "free",
                "plan_expires_at": None,
            }
        data = doc.to_dict()

    if data.get("plan") == "pro" and not is_paid_plan_active(data):
        user_ref.set({
            "plan": "free",
            "plan_type": "free",
            "plan_expires_at": None
        }, merge=True)
        data["plan"] = "free"
        data["plan_type"] = "free"
        data["plan_expires_at"] = None

    return data


def check_user_limit(user_id: str, limit_type: str = "scan_count"):
    """
    Checks if a user has reached their daily limit for a specific action.
    Free users: 1 ATS scan/day, 2 resumes total.
    Paid users: 20 ATS scans/day, 10 resume uploads/week.
    Returns: True if allowed, False if limit reached.
    """
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        # Create new user record with today's date
        user_ref.set({
            "scan_count": 0, 
            "scan_count_date": _get_today_str(),
            "resume_count": 0,
            "resume_count_week": 0,
            "resume_count_week_key": _get_week_key(),
            "plan": "free",
            "plan_type": "free",
            "plan_expires_at": None
        })
        return True
        
    data = ensure_effective_plan(user_id, user_doc.to_dict())
    plan = data.get("plan", "free")

    is_paid = plan == "pro"

    # For scan_count: daily reset for all plans
    if limit_type == "scan_count":
        today = _get_today_str()
        last_date = data.get("scan_count_date", "")
        
        if last_date != today:
            # New day — reset counter
            user_ref.update({
                "scan_count": 0,
                "scan_count_date": today
            })
            return True
        
        current_count = data.get("scan_count", 0)
        return current_count < (PAID_SCAN_DAILY_LIMIT if is_paid else FREE_SCAN_DAILY_LIMIT)

    # For resume_count: weekly cap for paid, lifetime cap for free
    if limit_type == "resume_count":
        if is_paid:
            current_week_key = _get_week_key()
            stored_week_key = data.get("resume_count_week_key", "")
            if stored_week_key != current_week_key:
                user_ref.set({
                    "resume_count_week": 0,
                    "resume_count_week_key": current_week_key
                }, merge=True)
                return True
            current_week_count = data.get("resume_count_week", 0)
            return current_week_count < PAID_RESUME_WEEKLY_LIMIT

        current_count = data.get("resume_count", 0)
        return current_count < FREE_RESUME_LIFETIME_LIMIT

    # Unknown limit type defaults to allow
    return True


def increment_scan_count(user_id: str, limit_type: str = "scan_count"):
    """Increments the usage count for a user."""
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        data = ensure_effective_plan(user_id, doc.to_dict())
        updates = {}

        if limit_type == "scan_count":
            current_count = data.get("scan_count", 0)
            updates["scan_count"] = current_count + 1
            updates["scan_count_date"] = _get_today_str()
        elif limit_type == "resume_count":
            if data.get("plan") == "pro":
                current_week_key = _get_week_key()
                stored_week_key = data.get("resume_count_week_key", "")
                current_week_count = data.get("resume_count_week", 0)

                if stored_week_key != current_week_key:
                    current_week_count = 0

                updates["resume_count_week"] = current_week_count + 1
                updates["resume_count_week_key"] = current_week_key
            else:
                current_count = data.get("resume_count", 0)
                updates["resume_count"] = current_count + 1
        else:
            current_count = data.get(limit_type, 0)
            updates[limit_type] = current_count + 1

        if updates:
            user_ref.set(updates, merge=True)
    else:
        # Initialize with 1 for the current type
        initial_data = {
            "scan_count": 0, 
            "scan_count_date": _get_today_str(),
            "resume_count": 0,
            "resume_count_week": 0,
            "resume_count_week_key": _get_week_key(),
            "plan": "free",
            "plan_type": "free",
            "plan_expires_at": None
        }
        if limit_type == "scan_count":
            initial_data["scan_count"] = 1
        elif limit_type == "resume_count":
            initial_data["resume_count"] = 1
        else:
            initial_data[limit_type] = 1
        user_ref.set(initial_data)
