from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import Response
from typing import List, Optional
from pydantic import BaseModel
from models import Resume
from services.firebase import get_db, verify_token, check_user_limit, increment_scan_count
from services.auth import get_current_user
from services.gemini import parse_resume_to_json as parse_resume_legacy
from services.resume_parser import extract_resume_data
import json
import uuid
import hashlib
import os
import tempfile

router = APIRouter(prefix="/resumes", tags=["Resumes"])


# Auth is now handled by services.auth


class UploadRequest(BaseModel):
    file_content: str
    file_url: Optional[str] = None


def compute_source_hash(file_content: str) -> str:
    normalized = file_content.split("base64,", 1)[1] if "base64," in file_content else file_content
    return hashlib.md5(normalized.encode("utf-8", errors="ignore")).hexdigest()

@router.post("/parse")
async def parse_resume(request: UploadRequest, user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    source_hash = compute_source_hash(request.file_content)

    # Parse once, store forever for identical uploads by the same user.
    try:
        cached_docs = db.collection('resumes') \
            .where('userId', '==', user_id) \
            .where('sourceHash', '==', source_hash) \
            .limit(1) \
            .stream()
        for doc in cached_docs:
            return Resume(**doc.to_dict())
    except Exception as e:
        # Fallback gracefully if this query isn't indexed yet.
        print(f"Resume hash cache lookup skipped: {e}")

    # Check limit for RESUME UPLOADS
    if not check_user_limit(user_id, limit_type="resume_count"):
        raise HTTPException(
            status_code=403, 
            detail="Free plan limit reached (2 resumes total). Upgrade for premium access (up to 10 uploads/week)."
        )

    print(f"DEBUG: Parse Resume Request received for user: {user_id}")
    try:
        # Try new LLM parser first
        try:
            print("DEBUG: Attempting new extract_resume_data parser...")
            parsed_data = await extract_resume_data(request.file_content)
            print("DEBUG: New parser success.")
        except Exception as e:
            print(f"DEBUG: New parser failed, falling back to legacy: {e}")
            json_str = await parse_resume_legacy(request.file_content)
            parsed_data = json.loads(json_str)
            print("DEBUG: Legacy parser success.")
        
        # Ensure minimal required fields for frontend safety
        resume = Resume(
            id=str(uuid.uuid4()),
            userId=user['uid'],
            sourceHash=source_hash,
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
        if db:
            db.collection('resumes').document(resume.id).set(resume.model_dump())

        # Sync parsed data into Career Desk (merges, never overwrites existing)
        try:
            from routers.user_data import sync_resume_to_desk
            sync_resume_to_desk(user_id, parsed_data)
        except Exception as e:
            print(f"Desk sync warning (non-fatal): {e}")

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
            detail="Free plan limit reached (2 resumes total). Upgrade for premium access (up to 10 uploads/week)."
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


@router.get("/{resume_id}/pdf")
async def get_resume_pdf_url(resume_id: str, user=Depends(get_current_user)):
    """
    Generate a PDF for a resume and return a short-lived signed URL (15 min).
    PDF is generated from the stored resume data using reportlab.
    """
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc = db.collection('resumes').document(resume_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Resume not found")

    data = doc.to_dict()
    if data.get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build markdown text from resume data
    personal = data.get('personalInfo') or data.get('personal_info') or {}
    lines = []
    name = personal.get('fullName') or personal.get('name') or 'Resume'
    lines.append(f"# {name}")
    contact_parts = [p for p in [
        personal.get('email'), personal.get('phone'),
        personal.get('location'), personal.get('linkedin'), personal.get('website')
    ] if p]
    if contact_parts:
        lines.append(' | '.join(contact_parts))

    if data.get('summary'):
        lines += ['', '## Summary', data['summary']]

    experience = data.get('experience') or []
    if experience:
        lines += ['', '## Experience']
        for exp in experience:
            role = exp.get('role') or exp.get('title') or ''
            company = exp.get('company') or ''
            start = exp.get('startDate') or ''
            end = exp.get('endDate') or 'Present'
            lines.append(f"### {role} — {company} ({start} – {end})")
            desc = exp.get('description') or ''
            for line in desc.split('\n'):
                if line.strip():
                    lines.append(line.strip())

    education = data.get('education') or []
    if education:
        lines += ['', '## Education']
        for edu in education:
            degree = edu.get('degree') or ''
            school = edu.get('school') or ''
            year = edu.get('year') or ''
            lines.append(f"**{degree}** — {school} ({year})")

    skills = data.get('skills') or []
    if skills:
        lines += ['', '## Skills']
        if isinstance(skills, list):
            lines.append(', '.join(str(s) for s in skills))
        elif isinstance(skills, dict):
            for cat, items in skills.items():
                lines.append(f"**{cat}**: {', '.join(items)}")

    projects = data.get('projects') or []
    if projects:
        lines += ['', '## Projects']
        for proj in projects:
            pname = proj.get('name') or ''
            pdesc = proj.get('description') or ''
            lines.append(f"### {pname}")
            if pdesc:
                lines.append(pdesc)

    markdown_text = '\n'.join(lines)

    # Generate PDF and stream directly — no Storage upload needed
    try:
        from autoapply.resume.pdf_generator import generate_resume_pdf
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = generate_resume_pdf(markdown_text, output_dir=tmpdir, filename=f"{resume_id}.pdf")
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    safe_title = data.get('title', 'resume').replace('[AutoPilot] ', '').replace('/', '-')[:60]
    filename = f"{safe_title}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
