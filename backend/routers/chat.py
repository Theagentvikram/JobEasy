from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Dict, Any
from services.auth import get_current_user
from services.gemini import chat_with_context

router = APIRouter(prefix="/chat", tags=["AI Chat"])

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

@router.post("")
async def chat_endpoint(req: ChatRequest, user=Depends(get_current_user)):
    try:
        # history conversion if needed
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
        
        user_name = user.get('name', 'User')
        
        system_instruction = f"""
        You are JobEasy's AI Career Coach helping {user_name} with their job search.
        You are concise, practical, and encouraging.

        You can help with:
        - Resume writing and ATS optimization
        - Interview preparation and common questions
        - Salary negotiation tactics
        - LinkedIn profile and cold outreach messages
        - Career planning and skill gap analysis
        - Job search strategy and prioritization

        Keep responses clear and actionable. Use markdown formatting (bold, lists) for readability.
        Do not reference any external apps or services not part of JobEasy.
        """
        
        response_text = await chat_with_context(req.message, history_dicts, system_instruction)
        
        return {"response": response_text}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
