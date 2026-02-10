from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from pydantic import BaseModel
from models import Resume
from services.firebase import get_db, verify_token, check_user_limit, increment_scan_count
from services.auth import get_current_user
from services.gemini import parse_resume_to_json as parse_resume_legacy
from services.resume_parser import extract_resume_data
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/resumes", tags=["Resumes"])


# Auth is now handled by services.auth


class UploadRequest(BaseModel):
    file_content: str
    file_url: Optional[str] = None

@router.post("/parse")
async def parse_resume(request: UploadRequest, user=Depends(get_current_user)):
    user_id = user['uid']
    # Check limit for RESUME UPLOADS
    if not check_user_limit(user_id, limit_type="resume_count"):
        raise HTTPException(
            status_code=403, 
            detail="Free plan limit reached (2 resumes). Upgrade to Pro for unlimited."
        )

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
            lastModified=datetime.utcnow().isoformat(),
            score=0,
            fileUrl=request.file_url
        )
        
        # Save to DB immediately so it persists
        db = get_db()
        if db:
            db.collection('resumes').document(resume.id).set(resume.model_dump())
            
        # Increment usage for RESUME UPLOADS
        increment_scan_count(user_id, limit_type="resume_count")
            
        return resume
    except Exception as e:
        print(f"Parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Resume])
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

@router.post("", response_model=Resume)
async def create_resume(resume: Resume, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    
    # Check limit for RESUME CREATION
    if not check_user_limit(user_id, limit_type="resume_count"):
        raise HTTPException(
            status_code=403, 
            detail="Free plan limit reached (2 resumes). Upgrade to Pro for unlimited."
        )

    resume.userId = user_id # Enforce ownership
    
    # Store in Firestore
    db.collection('resumes').document(resume.id).set(resume.model_dump())
    
    # Increment usage
    increment_scan_count(user_id, limit_type="resume_count")
    
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
