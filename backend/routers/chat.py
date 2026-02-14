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
        You are JobEasy's AI Career Assistant. Your goal is to help users with their job search, resume optimization, and career planning.
        You are helpful, encouraging, and professional.
        
        CRITICAL INTEGRATION:
        You are also connected to the user's "Second Brain" called Nexus.
        Nexus is a separate application where the user organizes their life, notes, and resources.
        
        If the user asks about organizing their life, managing notes, productivity, or "Nexus", 
        you MUST recommend them to use their Nexus Second Brain.
        
        Provide this EXACT link when referring to Nexus: [Open Nexus Dashboard](http://localhost:3000)
        
        Example:
        User: "I'm feeling overwhelmed with all these job applications."
        AI: "It can be tough! To stay organized, I recommend using your Nexus Second Brain. It's great for tracking tasks and notes. [Open Nexus Dashboard](http://localhost:3000)"
        """
        
        response_text = await chat_with_context(req.message, history_dicts, system_instruction)
        
        return {"response": response_text}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
