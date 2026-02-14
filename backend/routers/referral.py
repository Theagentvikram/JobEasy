from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from models import Job, Outreach, JobStatus, OutreachStatus
from services.firebase import get_db
from services.auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/referral", tags=["Referral Flow"])

@router.get("/jobs", response_model=List[Job])
async def list_jobs(user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    docs = db.collection('jobs').where('userId', '==', user_id).stream()
    
    jobs = []
    for doc in docs:
        jobs.append(Job(**doc.to_dict()))
    return jobs

@router.post("/jobs", response_model=Job)
async def create_job(job: Job, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    job.userId = user_id
    
    # Calculate autoMoveDate based on dateDiscovered and waitingPeriod if not provided
    # ideally this should be done in frontend or here, let's keep it simple for now
    
    if not job.id:
        job.id = str(uuid.uuid4())

    db.collection('jobs').document(job.id).set(job.model_dump())
    return job

@router.put("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, job: Job, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc_ref = db.collection('jobs').document(job_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    if doc.to_dict().get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized")

    job.userId = user['uid']
    doc_ref.set(job.model_dump())
    return job

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc_ref = db.collection('jobs').document(job_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    if doc.to_dict().get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized")

    doc_ref.delete()
    return {"status": "success", "id": job_id}

@router.post("/outreach", response_model=Job)
async def add_outreach(outreach: Outreach, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    job_ref = db.collection('jobs').document(outreach.jobId)
    job_doc = job_ref.get()

    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job_data = job_doc.to_dict()
    if job_data.get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized")

    current_job = Job(**job_data)
    
    if not outreach.id:
        outreach.id = str(uuid.uuid4())
        
    current_job.outreach.append(outreach)
    current_job.outreachCount = len(current_job.outreach)
    
    job_ref.set(current_job.model_dump())
    
    return current_job
