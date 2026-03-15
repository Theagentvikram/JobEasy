"""
AutoApply router — runs the job automation pipeline directly in the JobEasy backend.
No separate service needed. Scrapes: JobSpy, Wellfound, Naukri, YC WAAS.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, File, UploadFile
from pydantic import BaseModel
from services.auth import get_current_user
from typing import Optional, List
import shutil
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/autoapply", tags=["AutoApply Engine"])

# Lazy imports to avoid blocking app startup if deps are missing
_initialized = False


def _ensure_init():
    """Initialize AutoApply database on first use."""
    global _initialized
    if _initialized:
        return
    try:
        import asyncio
        from autoapply.database.db import init_db
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(init_db())
        else:
            loop.run_until_complete(init_db())
        _initialized = True
    except Exception as e:
        print(f"AutoApply init warning: {e}")
        _initialized = True  # Don't retry on every request


# ── Health ────────────────────────────────────────────────────

@router.get("/health")
async def autoapply_health():
    try:
        from autoapply.utils.settings import settings
        return {
            "status": "ok",
            "ai_provider": settings.ai_provider,
            "timestamp": datetime.utcnow().isoformat(),
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
    """Trigger the AutoApply job pipeline."""
    _ensure_init()
    from autoapply.tasks.job_pipeline import run_full_pipeline

    background_tasks.add_task(run_full_pipeline, dry_run=dry_run)
    return {
        "message": "Pipeline started in background",
        "dry_run": dry_run,
    }


@router.get("/pipeline/history")
async def pipeline_history(user=Depends(get_current_user), limit: int = 10):
    _ensure_init()
    from autoapply.database.db import AsyncSessionLocal
    from autoapply.database.models import RunLog
    from sqlalchemy import select, desc

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RunLog).order_by(desc(RunLog.started_at)).limit(limit)
        )
        runs = result.scalars().all()
        return [
            {
                "id": r.id,
                "started_at": r.started_at,
                "finished_at": r.finished_at,
                "status": r.status,
                "discovered": r.jobs_discovered,
                "applied": r.jobs_applied,
                "emails_sent": r.emails_sent,
            }
            for r in runs
        ]


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
    _ensure_init()
    from autoapply.database.db import AsyncSessionLocal
    from autoapply.database.models import Job
    from sqlalchemy import select, desc

    async with AsyncSessionLocal() as db:
        q = select(Job).order_by(desc(Job.match_score))
        if status:
            q = q.where(Job.status == status)
        if min_score > 0:
            q = q.where(Job.match_score >= min_score)
        q = q.offset(offset).limit(limit)
        jobs = (await db.execute(q)).scalars().all()
        return [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "source": j.source,
                "match_score": j.match_score,
                "status": j.status,
                "url": j.url,
                "applied_at": j.applied_at,
                "cold_email_sent": j.cold_email_sent,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
            }
            for j in jobs
        ]


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, user=Depends(get_current_user)):
    _ensure_init()
    from autoapply.database.db import AsyncSessionLocal
    from autoapply.database.models import Job
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        job = (
            await db.execute(select(Job).where(Job.id == job_id))
        ).scalar_one_or_none()
        if not job:
            raise HTTPException(404, "Job not found")
        return {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "requirements": job.requirements,
            "match_score": job.match_score,
            "match_reasons": job.match_reasons,
            "keywords_matched": job.keywords_matched,
            "keywords_missing": job.keywords_missing,
            "status": job.status,
            "cover_letter": job.cover_letter,
            "tailored_resume_path": job.tailored_resume_path,
            "company_research": job.company_research,
            "hiring_manager_email": job.hiring_manager_email,
            "applied_at": job.applied_at,
            "cold_email_sent": job.cold_email_sent,
        }


# ── Stats ────────────────────────────────────────────────────

@router.get("/stats")
async def stats(user=Depends(get_current_user)):
    _ensure_init()
    from autoapply.database.db import AsyncSessionLocal
    from autoapply.database.models import Job, JobStatus
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count(Job.id)))).scalar() or 0
        applied = (
            await db.execute(
                select(func.count(Job.id)).where(Job.status == JobStatus.APPLIED)
            )
        ).scalar() or 0
        emails = (
            await db.execute(
                select(func.count(Job.id)).where(Job.cold_email_sent == True)
            )
        ).scalar() or 0
        avg = (
            await db.execute(
                select(func.avg(Job.match_score)).where(Job.match_score.isnot(None))
            )
        ).scalar() or 0

        # Per-source breakdown
        source_counts = {}
        for source_name in ["linkedin", "indeed", "glassdoor", "wellfound", "naukri", "yc_waas", "jobspy", "zip_recruiter"]:
            count = (await db.execute(
                select(func.count(Job.id)).where(Job.source == source_name)
            )).scalar() or 0
            if count > 0:
                source_counts[source_name] = count

        return {
            "total_discovered": total,
            "total_applied": applied,
            "total_emails": emails,
            "avg_match_score": round(float(avg), 1),
            "by_source": source_counts,
        }


# ── Settings ─────────────────────────────────────────────────

class AutoApplySettingsUpdate(BaseModel):
    # Job search
    job_titles: Optional[str] = None
    job_locations: Optional[str] = None
    min_salary: Optional[int] = None
    match_score_threshold: Optional[float] = None
    max_applications_per_day: Optional[int] = None
    blacklist_companies: Optional[str] = None
    # AI
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    # Email
    cold_email_enabled: Optional[bool] = None
    daily_email_limit: Optional[int] = None
    email_delay_seconds: Optional[int] = None
    gmail_sender_email: Optional[str] = None
    gmail_app_password: Optional[str] = None
    # LinkedIn
    linkedin_email: Optional[str] = None
    linkedin_password: Optional[str] = None
    # Schedule
    pipeline_hour: Optional[int] = None
    pipeline_minute: Optional[int] = None
    # Sources toggles
    sources_jobspy: Optional[bool] = None
    sources_wellfound: Optional[bool] = None
    sources_naukri: Optional[bool] = None
    sources_yc: Optional[bool] = None


_SETTINGS_OVERRIDE_FILE = Path(__file__).parent.parent / "autoapply_settings_override.json"


def _load_overrides() -> dict:
    """Load user-saved settings overrides from JSON file."""
    if _SETTINGS_OVERRIDE_FILE.exists():
        try:
            import json
            return json.loads(_SETTINGS_OVERRIDE_FILE.read_text())
        except Exception:
            return {}
    return {}


def _save_overrides(data: dict):
    """Save settings overrides to JSON file."""
    import json
    existing = _load_overrides()
    existing.update({k: v for k, v in data.items() if v is not None})
    _SETTINGS_OVERRIDE_FILE.write_text(json.dumps(existing, indent=2))


def _merged_settings() -> dict:
    """Merge base settings with user overrides."""
    from autoapply.utils.settings import settings
    overrides = _load_overrides()
    base = {
        "job_titles": settings.job_titles,
        "job_locations": settings.job_locations,
        "min_salary": settings.min_salary,
        "match_score_threshold": settings.match_score_threshold,
        "max_applications_per_day": settings.max_applications_per_day,
        "blacklist_companies": settings.blacklist_companies,
        "ai_provider": settings.ai_provider,
        "ai_model": settings.ai_model,
        "groq_api_key": settings.groq_api_key,
        "openai_api_key": settings.openai_api_key,
        "anthropic_api_key": settings.anthropic_api_key,
        "cold_email_enabled": settings.cold_email_enabled,
        "daily_email_limit": settings.daily_email_limit,
        "email_delay_seconds": settings.email_delay_seconds,
        "gmail_sender_email": settings.gmail_sender_email,
        "gmail_app_password": settings.gmail_app_password,
        "linkedin_email": settings.linkedin_email,
        "linkedin_password": settings.linkedin_password,
        "pipeline_hour": settings.pipeline_hour,
        "pipeline_minute": settings.pipeline_minute,
        "sources_jobspy": overrides.get("sources_jobspy", True),
        "sources_wellfound": overrides.get("sources_wellfound", True),
        "sources_naukri": overrides.get("sources_naukri", True),
        "sources_yc": overrides.get("sources_yc", True),
    }
    # Apply overrides (non-None values win)
    for k, v in overrides.items():
        if k in base and v is not None:
            base[k] = v
    # Mask secrets for display — send empty string if set, not the actual value
    def mask(val): return "••••••••" if val else ""
    display = dict(base)
    display["groq_api_key"] = mask(base["groq_api_key"])
    display["openai_api_key"] = mask(base["openai_api_key"])
    display["anthropic_api_key"] = mask(base["anthropic_api_key"])
    display["gmail_app_password"] = mask(base["gmail_app_password"])
    display["linkedin_password"] = mask(base["linkedin_password"])
    display["sources"] = ["JobSpy (LinkedIn/Indeed/Glassdoor)", "Wellfound", "Naukri", "YC WAAS"]
    return display


@router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    """Get current AutoApply configuration (base + user overrides)."""
    return _merged_settings()


@router.put("/settings")
async def update_settings(req: AutoApplySettingsUpdate, user=Depends(get_current_user)):
    """Persist AutoApply settings overrides to a local JSON file."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    # Don't overwrite secrets with the masked placeholder
    for secret_field in ["groq_api_key", "openai_api_key", "anthropic_api_key", "gmail_app_password", "linkedin_password"]:
        if updates.get(secret_field) == "••••••••":
            updates.pop(secret_field)
    _save_overrides(updates)
    return {"status": "saved", "updated_fields": list(updates.keys())}


@router.post("/settings/test-connection")
async def test_ai_connection(
    payload: dict,
    user=Depends(get_current_user),
):
    """Test if an AI provider API key is valid."""
    provider = payload.get("provider", "groq")
    api_key = payload.get("api_key", "")

    if not api_key or api_key == "••••••••":
        raise HTTPException(400, "No API key provided")

    try:
        if provider == "groq":
            import httpx
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            if r.status_code == 200:
                return {"status": "ok", "message": "Groq API key is valid ✓"}
            raise HTTPException(400, f"Groq rejected key: {r.status_code}")

        elif provider == "openai":
            import httpx
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            if r.status_code == 200:
                return {"status": "ok", "message": "OpenAI API key is valid ✓"}
            raise HTTPException(400, f"OpenAI rejected key: {r.status_code}")

        elif provider in ("anthropic", "claude"):
            import httpx
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
            if r.status_code in (200, 400):  # 400 = model error but key is valid
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
            "skills_found": len(
                parsed.get("skills", {}).get("programming_languages", [])
            ),
            "experience_entries": len(parsed.get("experience", [])),
        }
    except Exception as e:
        return {
            "message": "Resume uploaded (parsing failed)",
            "file": save_path,
            "error": str(e),
        }
