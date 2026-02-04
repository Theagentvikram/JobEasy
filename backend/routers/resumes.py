from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from pydantic import BaseModel
from models import Resume
from services.firebase import get_db, verify_token
from services.gemini import parse_resume_to_json as parse_resume_legacy
from services.resume_parser import extract_resume_data
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/resumes", tags=["Resumes"])

# DEV MODE: Set to True to bypass authentication
DEV_MODE = True
DEV_USER = {"uid": "dev_user_123", "email": "dev@jobeasy.local", "name": "Developer"}

# Auth Dependency - Must be defined before routes that use it
async def get_current_user(authorization: Optional[str] = Header(None)):
    # DEV MODE bypass - skip auth entirely
    if DEV_MODE:
        return DEV_USER
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    decoded = verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    return decoded

class UploadRequest(BaseModel):
    file_content: str

@router.post("/parse")
async def parse_resume(request: UploadRequest, user=Depends(get_current_user)):
    try:
        # Try new LLM parser first
        try:
            parsed_data = await extract_resume_data(request.file_content)
        except Exception as e:
            print(f"New parser failed, falling back to legacy: {e}")
            json_str = await parse_resume_legacy(request.file_content)
            parsed_data = json.loads(json_str)
        
        # Ensure minimal required fields for frontend safety
        resume = Resume(
            id=str(uuid.uuid4()),
            userId=user['uid'],
            title=parsed_data.get('personalInfo', {}).get('fullName', 'New Resume'),
            personalInfo=parsed_data.get('personalInfo', {}),
            summary=parsed_data.get('summary', ''),
            experience=parsed_data.get('experience', []),
            education=parsed_data.get('education', []),
            skills=parsed_data.get('skills', []),
            projects=parsed_data.get('projects', []),
            templateId="modern",
            lastModified=datetime.utcnow().isoformat()
        )
        
        # Save to DB immediately so it persists
        db = get_db()
        if db:
            db.collection('resumes').document(resume.id).set(resume.model_dump())
            
        return resume
    except Exception as e:
        print(f"Parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Resume])
async def list_resumes(user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    docs = db.collection('resumes').where('userId', '==', user_id).stream()
    
    resumes = []
    for doc in docs:
        resumes.append(Resume(**doc.to_dict()))
    return resumes

@router.post("/", response_model=Resume)
async def create_resume(resume: Resume, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    resume.userId = user_id # Enforce ownership
    
    # Store in Firestore
    db.collection('resumes').document(resume.id).set(resume.model_dump())
    return resume

@router.get("/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    doc = db.collection('resumes').document(resume_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    data = doc.to_dict()
    if data.get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized to view this resume")
        
    return Resume(**data)

@router.put("/{resume_id}", response_model=Resume)
async def update_resume(resume_id: str, resume: Resume, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    doc_ref = db.collection('resumes').document(resume_id)
    doc = doc_ref.get()
    
    if not doc.exists:
         raise HTTPException(status_code=404, detail="Resume not found")
         
    if doc.to_dict().get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized to update this resume")

    resume.userId = user['uid'] # Ensure ID stays consistent
    doc_ref.set(resume.model_dump())
    return resume

@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    doc_ref = db.collection('resumes').document(resume_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if doc.to_dict().get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resume")
        
    doc_ref.delete()
    return {"status": "success", "id": resume_id}
