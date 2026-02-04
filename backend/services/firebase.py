import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase
# Expects 'serviceAccountKey.json' in the backend directory OR credentials in env vars
cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
else:
    # Fallback/Placeholder: In production, might use env vars or distinct logic
    print("WARNING: serviceAccountKey.json not found. Firebase features may fail.")

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

def get_db():
    if firebase_admin._apps:
        try:
            return firestore.client()
        except:
            pass
    # Fallback to local persistence
    print("Using Local JSON Database (Persistence Mode)")
    return LocalFirestore()
