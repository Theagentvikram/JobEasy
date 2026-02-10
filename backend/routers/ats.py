from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from models import ATSScan
from services.firebase import get_db, verify_token, check_user_limit, increment_scan_count
from services.auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/ats", tags=["ATS"])

@router.post("/scan", response_model=ATSScan)
async def save_ats_scan(scan: ATSScan, user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    
    # Check limit for ATS SCANS
    if not check_user_limit(user_id, limit_type="ats_scan_count"):
        raise HTTPException(
            status_code=403, 
            detail="Free plan limit reached (2 scans). Upgrade to Pro for unlimited."
        )

    scan.id = str(uuid.uuid4())
    scan.userId = user_id
    scan.createdAt = datetime.utcnow().isoformat()
    
    db.collection('ats_scans').document(scan.id).set(scan.model_dump())
    
    # Increment usage
    increment_scan_count(user_id, limit_type="ats_scan_count")
    
    return scan

@router.get("/history", response_model=List[ATSScan])
async def get_ats_history(user=Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user_id = user['uid']
    docs = db.collection('ats_scans').where('userId', '==', user_id).order_by('createdAt', direction='DESCENDING').limit(20).stream()
    
    scans = []
    for doc in docs:
        scans.append(ATSScan(**doc.to_dict()))
    return scans
