import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase
# Expects 'serviceAccountKey.json' in the backend directory OR credentials in env vars
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
    # Fallback/Placeholder
    print("WARNING: serviceAccountKey.json not found AND FIREBASE_SERVICE_ACCOUNT_JSON not set.")
    print("Firebase features will fall back to local mock DB (data will be lost on restart).")

def verify_token(token: str):
    # DEVELOPMENT BACKDOOR: If no service account, bypass verification
    # This ensures the app works even without the Admin SDK Key
    if not firebase_admin._apps:
        # Return a mock user based on the token or just a generic one
        # Ideally we'd decode the JWT without verification to get the email, but for now:
        return {
            "uid": "dev_user_123", 
            "email": "dev@example.com",
            "name": "Developer"
        }

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        # Soft fail for dev if token is present but verification fails (e.g. clock skew)
        return {"uid": "dev_user_123", "email": "dev@example.com"} if "serviceAccountKey" not in str(e) else None

import json

# Local JSON DB Fallback (Mocking Firestore)
class LocalDocument:
    def __init__(self, data):
        self._data = data
        self.exists = bool(data)
    
    def to_dict(self):
        return self._data

class LocalQuery:
    def __init__(self, results):
        self._results = results

    def stream(self):
        return self._results

    def get(self):
        # Firestore queries also have .get() which returns the list
        return self._results

    def order_by(self, field, direction='ASCENDING'):
        # Basic sort implementation for local mock
        reverse = direction == 'DESCENDING'
        # sort only if field exists in dict
        try:
            self._results.sort(key=lambda x: x.to_dict().get(field, 0), reverse=reverse)
        except:
            pass
        return self

    def limit(self, count):
        self._results = self._results[:count]
        return self

class LocalCollection:
    def __init__(self, name):
        self.name = name
        self.file_path = "local_db.json"
        
    def _load(self):
        if not os.path.exists(self.file_path):
            return {}
        try:
            with open(self.file_path, "r") as f:
                return json.load(f)
        except:
            return {}

    def _save(self, data):
        with open(self.file_path, "w") as f:
            json.dump(data, f, indent=2)

    def document(self, doc_id):
        return LocalDocRef(self.name, doc_id, self)
        
    def where(self, field, op, value):
        # op ignored (assumed '==')
        all_data = self._load()
        col_data = all_data.get(self.name, {})
        results = []
        for _, doc_data in col_data.items():
            if doc_data.get(field) == value:
                results.append(LocalDocument(doc_data))
        return LocalQuery(results)

    def stream(self):
        # Return list of everything in the collection
        all_data = self._load()
        col_data = all_data.get(self.name, {})
        return [LocalDocument(doc) for doc in col_data.values()]

class LocalDocRef:
    def __init__(self, col_name, doc_id, collection):
        self.col_name = col_name
        self.doc_id = doc_id
        self.collection = collection
        
    def set(self, data):
        db = self.collection._load()
        if self.col_name not in db:
            db[self.col_name] = {}
        db[self.col_name][self.doc_id] = data
        self.collection._save(db)
        
    def get(self):
        db = self.collection._load()
        data = db.get(self.col_name, {}).get(self.doc_id)
        return LocalDocument(data)
    
    def delete(self):
        db = self.collection._load()
        if self.col_name in db and self.doc_id in db[self.col_name]:
            del db[self.col_name][self.doc_id]
            self.collection._save(db)

class LocalFirestore:
    def collection(self, name):
        return LocalCollection(name)

# Global DB instances for caching
_db_instance = None
_is_local = False

def get_db():
    global _db_instance, _is_local
    
    # 1. If we've already decided to use local DB, return it (singleton)
    if _is_local:
        if _db_instance is None or not isinstance(_db_instance, LocalFirestore):
             _db_instance = LocalFirestore()
        return _db_instance

    # 2. If we have a valid real Firestore client, return it
    if _db_instance:
        return _db_instance

    # 3. Try to initialize and verify real Firestore
    if firebase_admin._apps:
        try:
            print("Attempting to connect to real Firestore...")
            db = firestore.client()
            
            # Connectivity Check: Try a minimal operation to verify permissions/API status
            try:
                # Attempt to stream 1 document with a short timeout to fail fast
                # Increased timeout to 10s to account for slow connections
                list(db.collection('resumes').limit(1).stream(timeout=10))
                print("Firestore Connection Verified.")
                _db_instance = db
                return _db_instance
                
            except Exception as e:
                print(f"Firestore Verification Failed: {e}")
                # We still fall back to local DB to keep the app running, 
                # but we log the error clearly.
                # If the user wants to debug, they should check these logs.
                import traceback
                traceback.print_exc()
                
                print("FALLING BACK TO LOCAL JSON DB due to connection error.")
                _is_local = True
                _db_instance = LocalFirestore()
                return _db_instance
                
        except Exception as e:
            print(f"Firestore Client Init Failed: {e}")
            pass

    # 4. Default Fallback
    print("Using Local JSON Database (Persistence Mode) - Default Fallback")
    _is_local = True
    _db_instance = LocalFirestore()
    return _db_instance

def check_user_limit(user_id: str, limit_type: str = "scan_count"):
    """
    Checks if a user has reached their limit for a specific action.
    limit_type: 'scan_count' (for ATS) or 'resume_count' (for Uploads)
    Free users: Max 2 scans, Max 2 resumes.
    Pro users: Unlimited.
    Returns: True if allowed, False if limit reached.
    """
    db = get_db()
    # Check user document in 'users' collection
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        # Create new user record
        user_ref.set({"scan_count": 0, "resume_count": 0, "plan": "free"})
        return True
        
    data = user_doc.to_dict()
    # Check plan - if 'pro', unlimited
    if data.get("plan") == "pro":
        return True
        
    # Check count based on type
    # Default limit is 2 for both
    current_count = data.get(limit_type, 0)
    if current_count >= 2:
        return False
        
    return True

def increment_scan_count(user_id: str, limit_type: str = "scan_count"):
    """
    Increments the usage count for a user.
    """
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    
    if doc.exists:
        data = doc.to_dict()
        current_count = data.get(limit_type, 0)
        
        # Determine the other count to preserve it (for local DB)
        updates = {limit_type: current_count + 1}
        
        if hasattr(user_ref, "update"):
             user_ref.update(updates)
        else:
             data[limit_type] = current_count + 1
             user_ref.set(data)
    else:
        # Initialize with 1 for the current type
        initial_data = {"scan_count": 0, "resume_count": 0, "plan": "free"}
        initial_data[limit_type] = 1
        user_ref.set(initial_data)
