from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import json
from services.auth import get_current_user
from services.gemini import stream_chat_with_context

router = APIRouter(prefix="/chat", tags=["AI Chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

@router.post("")
async def chat_endpoint(req: ChatRequest, user=Depends(get_current_user)):
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
    user_name = user.get('name', 'User')

    system_instruction = f"""You are JobEasy's AI Career Coach helping {user_name} with their job search.
You are concise, practical, and encouraging.

You can help with:
- Resume writing and ATS optimization
- Interview preparation and common questions
- Salary negotiation tactics
- LinkedIn profile and cold outreach messages
- Career planning and skill gap analysis
- Job search strategy and prioritization

Keep responses clear and actionable. Use markdown formatting (bold, lists) for readability.
Do not reference any external apps or services not part of JobEasy."""

    async def event_generator():
        try:
            async for token in stream_chat_with_context(req.message, history_dicts, system_instruction):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            print(f"Chat stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
