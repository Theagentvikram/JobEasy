from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from models import ATSScan
from services.firebase import get_db, check_user_limit, increment_scan_count
from services.auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/ats", tags=["ATS"])

@router.post("/scan", response_model=ATSScan)
async def save_ats_scan(scan: ATSScan, user=Depends(get_current_user)):
    db = get_db()
    user_id = user['uid']
    
    scan.id = str(uuid.uuid4())
    scan.userId = user_id
    scan.createdAt = datetime.utcnow().isoformat()
    
    db.collection('ats_scans').document(scan.id).set(scan.model_dump())
    
    return scan

@router.get("/history", response_model=List[ATSScan])
async def get_ats_history(user=Depends(get_current_user)):
    db = get_db()
    user_id = user['uid']
    
    # Avoid composite index requirement by sorting in Python
    docs = db.collection('ats_scans').where('userId', '==', user_id).limit(50).stream()
    scans = []
    for doc in docs:
        try:
            scans.append(ATSScan(**doc.to_dict()))
        except Exception:
            pass
    scans.sort(key=lambda s: s.createdAt or "", reverse=True)
    return scans[:20]

@router.get("/scan/{scan_id}", response_model=ATSScan)
async def get_ats_scan(scan_id: str, user=Depends(get_current_user)):
    """Fetch a single saved ATS scan by its ID."""
    db = get_db()
    doc = db.collection('ats_scans').document(scan_id).get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    data = doc.to_dict()
    if data.get('userId') != user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized to view this scan")
    
    return ATSScan(**data)
