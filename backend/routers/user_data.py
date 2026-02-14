from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.auth import get_current_user
from services.firebase import get_db

router = APIRouter(prefix="/user", tags=["User Data"])

# Data Models matches frontend interfaces
class UserProfile(BaseModel):
    name: str
    role: str
    email: str
    phone: str
    location: str

class Experience(BaseModel):
    id: int
    role: str
    company: str
    year: str
    description: str

class Project(BaseModel):
    id: int
    name: str
    tech: str
    description: str
    link: str

class CareerDeskData(BaseModel):
    profile: Optional[UserProfile] = None
    skills: Optional[List[str]] = None
    experiences: Optional[List[Experience]] = None
    projects: Optional[List[Project]] = None

@router.get("/desk")
async def get_career_desk(user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    
    doc_ref = db.collection('users').document(user_id).collection('data').document('career_desk')
    doc = doc_ref.get()
    
    if doc.exists:
        return doc.to_dict()
    else:
        # Return empty structure if not found
        return {
            "profile": None,
            "skills": [],
            "experiences": [],
            "projects": []
        }

@router.put("/desk")
async def update_career_desk(data: CareerDeskData, user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    
    # Check if user exists (optional, but good practice)
    # db.collection('users').document(user_id).get() ... 

    doc_ref = db.collection('users').document(user_id).collection('data').document('career_desk')
    
    # Store data, merging is not needed as we send full state from frontend usually, 
    # but let's use set with merge=True if we want partial updates, 
    # though here we likely want to overwrite the lists to handle deletions.
    # exclude_unset=True to avoid wiping fields if partial data sent? 
    # For now, let's assume the frontend sends the specific sections it wants to update
    # or the full object.
    
    update_data = data.model_dump(exclude_unset=True)
    
    doc_ref.set(update_data, merge=True)
    
    return {"status": "success", "message": "Career desk updated"}
