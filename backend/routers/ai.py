from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import List, Optional
import json
from services.gemini import analyze_resume_with_context, generate_bullet_points, generate_summary, extract_json_from_response
from services.auth import get_current_user
from services.firebase import check_user_limit, increment_scan_count

router = APIRouter(prefix="/ai", tags=["AI"])

# Request Models
class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class BulletsRequest(BaseModel):
    role: str
    company: str
    description: Optional[str] = None

class SummaryReq(BaseModel):
    role: str
    skills: List[str]

@router.post("/analyze")
async def analyze_resume(req: AnalyzeRequest, user=Depends(get_current_user)):
    # Check usage limits
    user_id = user['uid']
    
    # Check limit for ATS SCANS
    if not check_user_limit(user_id, limit_type="scan_count"):
        raise HTTPException(
            status_code=403, 
            detail="Free plan limit reached (2 ATS scans). Upgrade to Pro for unlimited."
        )

    try:
        # returns JSON string from Gemini (chatty)
        raw_result = await analyze_resume_with_context(req.resume_text, req.job_description)
        
        print(f"DEBUG: Raw LLM response prefix: {raw_result[:200] if raw_result else 'None'}")
        
        # Use robust extraction
        parsed_result = extract_json_from_response(raw_result)
        
        if not parsed_result:
             # If regex failed, try naive logic one last time or raise
             clean_json = raw_result.replace("```json", "").replace("```", "").strip()
             try:
                parsed_result = json.loads(clean_json)
             except:
                raise ValueError("Could not extract valid JSON from LLM response")


        # Increment usage count only on success (ATS Scans)
        increment_scan_count(user_id, limit_type="scan_count")

        return parsed_result
    except Exception as e:
        print(f"Analyze Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-bullets")
async def generate_bullets_api(req: BulletsRequest, user=Depends(get_current_user)):
    try:
        # Optional: Limit bullet generation too? User didn't specify, but safer to add auth at least.
        # But for now I'll just adding auth, no limits yet unless requested.
        raw_result = await generate_bullet_points(req.role, req.company, req.description)
        if isinstance(raw_result, str):
             return json.loads(raw_result) # Should already be cleaned in service, but double check
        return raw_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-summary")
async def generate_summary_api(req: SummaryReq, user=Depends(get_current_user)):
    try:
        result = await generate_summary(req.role, req.skills)
        return {"summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
