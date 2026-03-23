"""
Auto Pilot router — /autopilot/*

Endpoints:
  POST   /autopilot/search                       Start a new 50-job search session
  GET    /autopilot/sessions                     List user's past sessions
  GET    /autopilot/sessions/{id}                Get session metadata + all jobs
  GET    /autopilot/sessions/{id}/stream         SSE stream of live progress events
  DELETE /autopilot/sessions/{id}                Delete a session
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from fastapi import Query, Header
from services.auth import get_current_user
from services.firebase import get_db, verify_token
import os


async def _auth_from_query_or_header(
    authorization: Optional[str] = Header(default=None),
    token: str = Query(default=None),
):
    """Auth helper that accepts token from query param OR Authorization header (for SSE)."""
    DEV_TOKEN = "dev-token-jobeasy-2026"

    raw = token or (authorization.split(" ")[1] if authorization and " " in authorization else None)
    if not raw:
        raise HTTPException(status_code=401, detail="Missing token")

    if raw == DEV_TOKEN and os.getenv("DEV_MODE", "").lower() in ("1", "true"):
        return {"uid": "dev-user-001", "email": "dev@jobeasy.app"}

    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    _ex = ThreadPoolExecutor(max_workers=2)
    loop = asyncio.get_event_loop()
    decoded = await asyncio.wait_for(
        loop.run_in_executor(_ex, verify_token, raw), timeout=8.0
    )
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    return decoded
from services.autopilot_service import (
    create_queue,
    get_queue,
    run_autopilot_session,
)

router = APIRouter(prefix="/autopilot", tags=["autopilot"])


# ─── Request schemas ────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    keywords: list[str]
    location: str = "Remote"
    resume_text: str
    desk_data: Optional[dict] = None  # active CareerDesk profile dict
    max_jobs: int = 50
    min_score: int = 60


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/search")
async def start_search(
    req: SearchRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    """
    Kick off an Auto Pilot session.
    Returns session_id immediately; processing runs in background.
    Connect to /autopilot/sessions/{session_id}/stream for live progress.
    """
    if not req.keywords:
        raise HTTPException(status_code=400, detail="At least one keyword required")
    if not req.resume_text or len(req.resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text too short")

    uid = user["uid"]
    db = get_db()

    import uuid
    session_id = str(uuid.uuid4())

    # Create session record
    db.collection("autopilot_sessions").document(session_id).set({
        "session_id": session_id,
        "uid": uid,
        "keywords": req.keywords,
        "location": req.location,
        "min_score": req.min_score,
        "max_jobs": req.max_jobs,
        "status": "starting",
        "total_jobs": 0,
        "processed": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
    })

    # Create SSE queue before launching background task
    create_queue(session_id)

    background_tasks.add_task(
        run_autopilot_session,
        session_id=session_id,
        uid=uid,
        keywords=req.keywords,
        location=req.location,
        resume_text=req.resume_text,
        desk_data=req.desk_data,
        max_jobs=req.max_jobs,
        min_score=req.min_score,
    )

    return {"session_id": session_id, "status": "started"}


@router.get("/sessions/{session_id}/stream")
async def stream_progress(
    session_id: str,
    token: str = None,
    user=Depends(_auth_from_query_or_header),
):
    """
    SSE stream for live progress of an Auto Pilot session.
    Events are JSON objects with a `type` field:
      - stage       : pipeline stage update
      - found       : total jobs found
      - scoring     : scoring a specific job
      - tailoring   : tailoring resume for a job
      - skipped     : job skipped (below threshold)
      - job_ready   : full job data ready (includes match + pdf_url)
      - done        : session complete
      - error       : fatal error
    """
    uid = user["uid"]
    db = get_db()

    # Verify session belongs to this user
    doc = db.collection("autopilot_sessions").document(session_id).get()
    if not doc.exists or doc.to_dict().get("uid") != uid:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        q = get_queue(session_id)

        # If no queue (session already done), stream existing jobs from Firestore
        if q is None:
            session_data = doc.to_dict()
            yield _sse({"type": "already_done", "status": session_data.get("status"),
                        "total": session_data.get("total_jobs", 0),
                        "processed": session_data.get("processed", 0)})
            return

        # Stream live events
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send keepalive comment
                yield ": keepalive\n\n"
                continue

            if event.get("type") == "_eof":
                yield _sse({"type": "done"})
                break

            yield _sse(event)

            if event.get("type") in ("done", "error"):
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    """List the user's Auto Pilot sessions, most recent first."""
    uid = user["uid"]
    db = get_db()

    docs = (
        db.collection("autopilot_sessions")
        .where("uid", "==", uid)
        .order_by("created_at", direction="DESCENDING")
        .limit(20)
        .stream()
    )

    sessions = []
    for d in docs:
        data = d.to_dict()
        data.pop("uid", None)  # don't expose uid
        sessions.append(data)

    return sessions


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    """Get session metadata plus all processed jobs."""
    uid = user["uid"]
    db = get_db()

    doc = db.collection("autopilot_sessions").document(session_id).get()
    if not doc.exists or doc.to_dict().get("uid") != uid:
        raise HTTPException(status_code=404, detail="Session not found")

    session = doc.to_dict()
    session.pop("uid", None)

    # Fetch jobs subcollection
    jobs_docs = (
        db.collection("autopilot_sessions")
        .document(session_id)
        .collection("jobs")
        .order_by("match_score", direction="DESCENDING")
        .stream()
    )
    jobs = [j.to_dict() for j in jobs_docs]

    return {"session": session, "jobs": jobs}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    """Delete a session and all its jobs."""
    uid = user["uid"]
    db = get_db()

    doc_ref = db.collection("autopilot_sessions").document(session_id)
    doc = doc_ref.get()
    if not doc.exists or doc.to_dict().get("uid") != uid:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete jobs subcollection
    jobs = doc_ref.collection("jobs").stream()
    for j in jobs:
        j.reference.delete()

    doc_ref.delete()
    return {"deleted": True}


# ─── SSE helper ─────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
