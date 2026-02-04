from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import json
from services.gemini import analyze_resume_with_context, generate_bullet_points, generate_summary, extract_json_from_response

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
async def analyze_resume(req: AnalyzeRequest):
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

        return parsed_result
    except Exception as e:
        print(f"Analyze Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-bullets")
async def generate_bullets_api(req: BulletsRequest):
    try:
        raw_result = await generate_bullet_points(req.role, req.company, req.description)
        if isinstance(raw_result, str):
             return json.loads(raw_result) # Should already be cleaned in service, but double check
        return raw_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-summary")
async def generate_summary_api(req: SummaryReq):
    try:
        result = await generate_summary(req.role, req.skills)
        return {"summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
