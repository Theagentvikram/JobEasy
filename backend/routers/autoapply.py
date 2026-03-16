"""
AutoApply router — uses Firestore for all persistence (no SQLite).
Collections:
  autoapply_jobs/{user_id}/jobs/{job_id}
  autoapply_runs/{user_id}/runs/{run_id}
  autoapply_settings/{user_id}
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, File, UploadFile
from pydantic import BaseModel
from services.auth import get_current_user
from services.firebase import get_db
from typing import Optional
import shutil
import asyncio
from pathlib import Path
from datetime import datetime, timezone

router = APIRouter(prefix="/autoapply", tags=["AutoApply Engine"])


def _fs():
    return get_db()


def _jobs_col(user_id: str):
    return _fs().collection("autoapply_jobs").document(user_id).collection("jobs")


def _runs_col(user_id: str):
    return _fs().collection("autoapply_runs").document(user_id).collection("runs")


def _settings_ref(user_id: str):
    return _fs().collection("autoapply_settings").document(user_id)


def _run_blocking(fn):
    """Run a blocking Firestore call in a thread."""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(None, fn)


# ── Health ────────────────────────────────────────────────────

@router.get("/health")
async def autoapply_health():
    try:
        from autoapply.utils.settings import settings
        return {
            "status": "ok",
            "ai_provider": settings.ai_provider,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(503, f"AutoApply not available: {e}")


# ── Pipeline ─────────────────────────────────────────────────

@router.post("/pipeline/run")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    dry_run: bool = False,
):
    from autoapply.tasks.job_pipeline import run_full_pipeline
    background_tasks.add_task(run_full_pipeline, dry_run=dry_run)
    return {"message": "Pipeline started in background", "dry_run": dry_run}


@router.get("/pipeline/history")
async def pipeline_history(user=Depends(get_current_user), limit: int = 10):
    user_id = user["uid"]

    def _fetch():
        docs = (
            _runs_col(user_id)
            .order_by("started_at", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [{"id": d.id, **d.to_dict()} for d in docs]

    runs = await _run_blocking(_fetch)
    return runs


@router.get("/pipeline/next-run")
async def next_run(user=Depends(get_current_user)):
    try:
        from autoapply.tasks.scheduler import scheduler
        from autoapply.utils.settings import settings
        job = scheduler.get_job("daily_pipeline")
        next_time = job.next_run_time if job else None
        return {
            "next_run": next_time,
            "schedule": f"Daily at {settings.pipeline_hour:02d}:{settings.pipeline_minute:02d} UTC",
        }
    except Exception:
        return {"next_run": None, "schedule": "Not scheduled"}


# ── Jobs ─────────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(
    user=Depends(get_current_user),
    status: Optional[str] = None,
    min_score: float = 0,
    limit: int = 50,
    offset: int = 0,
):
    user_id = user["uid"]

    def _fetch():
        q = _jobs_col(user_id)
        if status:
            q = q.where("status", "==", status)
        if min_score > 0:
            q = q.where("match_score", ">=", min_score)
        q = q.order_by("match_score", direction="DESCENDING").limit(limit + offset)
        docs = list(q.stream())
        return [{"id": d.id, **d.to_dict()} for d in docs[offset:]]

    return await _run_blocking(_fetch)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    user_id = user["uid"]

    def _fetch():
        doc = _jobs_col(user_id).document(job_id).get()
        if not doc.exists:
            return None
        return {"id": doc.id, **doc.to_dict()}

    job = await _run_blocking(_fetch)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ── Stats ────────────────────────────────────────────────────

@router.get("/stats")
async def stats(user=Depends(get_current_user)):
    user_id = user["uid"]

    def _fetch():
        all_jobs = list(_jobs_col(user_id).stream())
        total = len(all_jobs)
        applied = sum(1 for d in all_jobs if d.to_dict().get("status") == "applied")
        emails = sum(1 for d in all_jobs if d.to_dict().get("cold_email_sent"))
        scores = [d.to_dict().get("match_score") for d in all_jobs if d.to_dict().get("match_score") is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else 0

        source_counts = {}
        for d in all_jobs:
            src = d.to_dict().get("source")
            if src:
                source_counts[src] = source_counts.get(src, 0) + 1

        return {
            "total_discovered": total,
            "total_applied": applied,
            "total_emails": emails,
            "avg_match_score": avg,
            "by_source": source_counts,
        }

    return await _run_blocking(_fetch)


# ── Settings ─────────────────────────────────────────────────

class AutoApplySettingsUpdate(BaseModel):
    job_titles: Optional[str] = None
    job_locations: Optional[str] = None
    min_salary: Optional[int] = None
    match_score_threshold: Optional[float] = None
    max_applications_per_day: Optional[int] = None
    blacklist_companies: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    cold_email_enabled: Optional[bool] = None
    daily_email_limit: Optional[int] = None
    email_delay_seconds: Optional[int] = None
    gmail_sender_email: Optional[str] = None
    gmail_app_password: Optional[str] = None
    linkedin_email: Optional[str] = None
    linkedin_password: Optional[str] = None
    pipeline_hour: Optional[int] = None
    pipeline_minute: Optional[int] = None
    sources_jobspy: Optional[bool] = None
    sources_wellfound: Optional[bool] = None
    sources_naukri: Optional[bool] = None
    sources_yc: Optional[bool] = None


def _mask(val):
    return "••••••••" if val else ""


SECRET_FIELDS = {"groq_api_key", "openai_api_key", "anthropic_api_key", "gmail_app_password", "linkedin_password"}


@router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    user_id = user["uid"]

    def _fetch():
        from autoapply.utils.settings import settings as env_settings
        doc = _settings_ref(user_id).get()
        overrides = doc.to_dict() if doc.exists else {}

        base = {
            "job_titles": env_settings.job_titles,
            "job_locations": env_settings.job_locations,
            "min_salary": env_settings.min_salary,
            "match_score_threshold": env_settings.match_score_threshold,
            "max_applications_per_day": env_settings.max_applications_per_day,
            "blacklist_companies": env_settings.blacklist_companies,
            "ai_provider": env_settings.ai_provider,
            "ai_model": env_settings.ai_model,
            "groq_api_key": env_settings.groq_api_key,
            "openai_api_key": env_settings.openai_api_key,
            "anthropic_api_key": env_settings.anthropic_api_key,
            "cold_email_enabled": env_settings.cold_email_enabled,
            "daily_email_limit": env_settings.daily_email_limit,
            "email_delay_seconds": env_settings.email_delay_seconds,
            "gmail_sender_email": env_settings.gmail_sender_email,
            "gmail_app_password": env_settings.gmail_app_password,
            "linkedin_email": env_settings.linkedin_email,
            "linkedin_password": env_settings.linkedin_password,
            "pipeline_hour": env_settings.pipeline_hour,
            "pipeline_minute": env_settings.pipeline_minute,
            "sources_jobspy": True,
            "sources_wellfound": True,
            "sources_naukri": True,
            "sources_yc": True,
        }
        for k, v in overrides.items():
            if k in base and v is not None:
                base[k] = v

        display = dict(base)
        for f in SECRET_FIELDS:
            display[f] = _mask(base.get(f))
        display["sources"] = ["JobSpy (LinkedIn/Indeed/Glassdoor)", "Wellfound", "Naukri", "YC WAAS"]
        return display

    return await _run_blocking(_fetch)


@router.put("/settings")
async def update_settings(req: AutoApplySettingsUpdate, user=Depends(get_current_user)):
    user_id = user["uid"]
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    for f in SECRET_FIELDS:
        if updates.get(f) == "••••••••":
            updates.pop(f)

    def _save():
        _settings_ref(user_id).set(updates, merge=True)

    await _run_blocking(_save)
    return {"status": "saved", "updated_fields": list(updates.keys())}


@router.post("/settings/test-connection")
async def test_ai_connection(payload: dict, user=Depends(get_current_user)):
    provider = payload.get("provider", "groq")
    api_key = payload.get("api_key", "")

    if not api_key or api_key == "••••••••":
        raise HTTPException(400, "No API key provided")

    try:
        import httpx
        if provider == "groq":
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            if r.status_code == 200:
                return {"status": "ok", "message": "Groq API key is valid ✓"}
            raise HTTPException(400, f"Groq rejected key: {r.status_code}")

        elif provider == "openai":
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            if r.status_code == 200:
                return {"status": "ok", "message": "OpenAI API key is valid ✓"}
            raise HTTPException(400, f"OpenAI rejected key: {r.status_code}")

        elif provider in ("anthropic", "claude"):
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={"model": "claude-haiku-4-5-20251001", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]},
                )
            if r.status_code in (200, 400):
                return {"status": "ok", "message": "Anthropic API key is valid ✓"}
            raise HTTPException(400, f"Anthropic rejected key: {r.status_code}")

        raise HTTPException(400, f"Unknown provider: {provider}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Connection test failed: {e}")


# ── Resume Upload ────────────────────────────────────────────

@router.post("/resume/upload")
async def upload_resume(user=Depends(get_current_user), file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    save_path = str(uploads_dir / file.filename)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        from autoapply.resume.parser import parse_resume_pdf
        parsed = await parse_resume_pdf(save_path)
        return {
            "message": "Resume uploaded and parsed",
            "file": save_path,
            "name": parsed.get("personal", {}).get("name"),
            "skills_found": len(parsed.get("skills", {}).get("programming_languages", [])),
            "experience_entries": len(parsed.get("experience", [])),
        }
    except Exception as e:
        return {"message": "Resume uploaded (parsing failed)", "file": save_path, "error": str(e)}
