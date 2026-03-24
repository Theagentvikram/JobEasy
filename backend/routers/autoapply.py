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
from services.google_sheets import (
    get_google_sheets_status,
    resolve_sheets_settings,
    sync_all_google_sheets,
    sync_autoapply_jobs_sheet,
    sync_job_tracker_sheet,
    test_google_sheets_access,
)
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

# In-memory run status (per user_id). Cleared when a new run starts.
# Holds: { status, dry_run, started_at, steps, discovered, scored, applied, emails_sent, error }
_run_status: dict[str, dict] = {}


def _update_status(user_id: str, **kwargs):
    if user_id in _run_status:
        _run_status[user_id].update(kwargs)


async def _run_pipeline_tracked(user_id: str, dry_run: bool, overrides: dict = None):
    """Wrapper around run_full_pipeline that writes progress to _run_status."""
    from autoapply.tasks.job_pipeline import run_full_pipeline  # noqa: F401
    import traceback

    status = _run_status[user_id]

    # Monkey-patch the logger for this run to capture step messages
    from autoapply.utils import logger as logger_mod
    orig_info = logger_mod.logger.info

    import re as _re

    def _patched_info(msg, *a, **kw):
        orig_info(msg, *a, **kw)
        msg_str = str(msg)
        status["steps"].append(msg_str)
        # Parse key progress markers
        if "Scraping" in msg_str or "scraping" in msg_str or "📡" in msg_str:
            status["phase"] = "scraping"
        elif "Scoring" in msg_str or "scoring" in msg_str or "🎯" in msg_str:
            status["phase"] = "scoring"
        elif "Processing" in msg_str or "Tailoring" in msg_str or "Applying" in msg_str:
            status["phase"] = "applying"
        elif "DONE:" in msg_str or "PIPELINE COMPLETE" in msg_str or "Pipeline complete" in msg_str.lower():
            status["phase"] = "done"
        # Parse live counts from log lines like "Total after filter: 55 jobs"
        m = _re.search(r"Total after filter.*?(\d+) jobs", msg_str)
        if m:
            status["discovered"] = int(m.group(1))
        # "✓ 85% — Software Engineer at Zip" => increment scored
        if msg_str.strip().startswith("✓") and "%" in msg_str:
            status["scored"] = status.get("scored", 0) + 1
        # Scraping complete line
        m2 = _re.search(r"(\d+) total jobs from all sources", msg_str)
        if m2:
            status["total_scraped"] = int(m2.group(1))

    logger_mod.logger.info = _patched_info

    # Write a "started" run record to Firestore so history shows it immediately
    run_doc_id = None
    if user_id:
        try:
            import uuid as _uuid
            run_doc_id = str(_uuid.uuid4())
            _fs().collection("autoapply_runs").document(user_id).collection("runs").document(run_doc_id).set({
                "started_at": status["started_at"],
                "finished_at": None,
                "status": "running",
                "dry_run": dry_run,
                "discovered": 0,
                "scored": 0,
                "applied": 0,
                "emails_sent": 0,
                "by_source": {},
            })
        except Exception:
            pass

    try:
        result = await run_full_pipeline(dry_run=dry_run, user_id=user_id, overrides=overrides or {})
        final = {
            "status": "done",
            "phase": "done",
            "discovered": result.get("discovered", 0) if result else 0,
            "scored": result.get("scored", 0) if result else 0,
            "applied": result.get("applied", 0) if result else 0,
            "emails_sent": result.get("emails_sent", 0) if result else 0,
        }
        status.update(final)
        # Update the Firestore run record with final results
        if user_id and run_doc_id:
            try:
                _fs().collection("autoapply_runs").document(user_id).collection("runs").document(run_doc_id).update({
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "status": "completed",
                    **{k: v for k, v in final.items() if k not in ("status", "phase")},
                    "by_source": result.get("by_source", {}) if result else {},
                })
            except Exception:
                pass
    except Exception as e:
        status.update({
            "status": "error",
            "phase": "error",
            "error": str(e),
        })
        if user_id and run_doc_id:
            try:
                _fs().collection("autoapply_runs").document(user_id).collection("runs").document(run_doc_id).update({
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "status": "failed",
                })
            except Exception:
                pass
    finally:
        logger_mod.logger.info = orig_info


class PipelineRunRequest(BaseModel):
    job_titles: Optional[str] = None
    job_locations: Optional[str] = None
    results_per_search: Optional[int] = None
    disabled_sources: Optional[str] = None


@router.post("/pipeline/run")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    dry_run: bool = False,
    body: PipelineRunRequest = PipelineRunRequest(),
):
    user_id = user["uid"]
    # Collect only non-None overrides to pass into pipeline
    overrides = {k: v for k, v in body.model_dump().items() if v is not None}
    _run_status[user_id] = {
        "status": "running",
        "phase": "starting",
        "dry_run": dry_run,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "steps": [],
        "discovered": 0,
        "scored": 0,
        "applied": 0,
        "emails_sent": 0,
        "error": None,
    }
    background_tasks.add_task(_run_pipeline_tracked, user_id, dry_run, overrides)
    return {"message": "Pipeline started in background", "dry_run": dry_run}


@router.get("/pipeline/status")
async def pipeline_status(user=Depends(get_current_user)):
    """Poll this endpoint to get live progress of the running pipeline."""
    user_id = user["uid"]
    if user_id not in _run_status:
        return {"status": "idle"}
    return _run_status[user_id]


@router.get("/pipeline/history")
async def pipeline_history(user=Depends(get_current_user), limit: int = 10):
    user_id = user["uid"]

    def _fetch():
        # Fetch without order_by to avoid composite index requirement; sort in Python
        docs = _runs_col(user_id).limit(limit * 3).stream()
        runs = [{"id": d.id, **d.to_dict()} for d in docs]
        runs.sort(key=lambda r: r.get("started_at") or "", reverse=True)
        return runs[:limit]

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


# ── All Jobs (aggregated from autopilot sessions + autoapply pipeline) ────────

@router.get("/all-jobs")
async def all_jobs(
    user=Depends(get_current_user),
    status: Optional[str] = None,
    min_score: float = 0,
    limit: int = 200,
):
    """
    Unified job list for the Command Center.
    Pulls from both autopilot_sessions (AutoPilot scrapes) and
    autoapply_jobs (pipeline runs). Deduplicates by URL.
    """
    user_id = user["uid"]

    def _fetch():
        db = _fs()
        jobs = []
        seen_urls = set()

        # ── 1. AutoPilot sessions (primary source — this is where actual jobs live) ──
        sessions = (
            db.collection("autopilot_sessions")
            .where("uid", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .limit(10)
            .stream()
        )
        for session_doc in sessions:
            session_data = session_doc.to_dict()
            session_id = session_doc.id
            job_docs = (
                db.collection("autopilot_sessions")
                .document(session_id)
                .collection("jobs")
                .order_by("match_score", direction="DESCENDING")
                .stream()
            )
            for jd in job_docs:
                j = jd.to_dict()
                url = j.get("url") or j.get("job_url") or ""
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                # Normalise field names to match AutoApplyJob interface
                jobs.append({
                    "id": jd.id,
                    "title": j.get("title", ""),
                    "company": j.get("company", ""),
                    "location": j.get("location", ""),
                    "source": j.get("source", ""),
                    "match_score": j.get("match_score", 0),
                    "status": j.get("status", "discovered"),
                    "url": url,
                    "applied_at": j.get("applied_at"),
                    "cold_email_sent": j.get("cold_email_sent", False),
                    "salary_min": j.get("salary_min"),
                    "salary_max": j.get("salary_max"),
                    "session_id": session_id,
                    "keywords": session_data.get("keywords", []),
                })

        # ── 2. AutoApply pipeline jobs (if pipeline has ever run) ──
        pipeline_jobs = (
            _jobs_col(user_id)
            .order_by("match_score", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        for pd in pipeline_jobs:
            p = pd.to_dict()
            url = p.get("url", "")
            if url in seen_urls:
                continue
            seen_urls.add(url)
            jobs.append({"id": pd.id, **p})

        # Apply filters
        if status:
            jobs = [j for j in jobs if j.get("status") == status]
        if min_score > 0:
            jobs = [j for j in jobs if (j.get("match_score") or 0) >= min_score]

        # Sort by score descending
        jobs.sort(key=lambda j: j.get("match_score") or 0, reverse=True)
        return jobs[:limit]

    return await _run_blocking(_fetch)


# ── Stats ────────────────────────────────────────────────────

@router.get("/stats")
async def stats(user=Depends(get_current_user)):
    """Stats aggregated from both autopilot sessions and autoapply pipeline."""
    user_id = user["uid"]

    def _fetch():
        db = _fs()
        all_job_dicts = []
        seen_urls = set()

        # Pull from autopilot sessions
        sessions = (
            db.collection("autopilot_sessions")
            .where("uid", "==", user_id)
            .stream()
        )
        for session_doc in sessions:
            job_docs = (
                db.collection("autopilot_sessions")
                .document(session_doc.id)
                .collection("jobs")
                .stream()
            )
            for jd in job_docs:
                j = jd.to_dict()
                url = j.get("url", jd.id)
                if url not in seen_urls:
                    seen_urls.add(url)
                    all_job_dicts.append(j)

        # Pull from autoapply pipeline
        for pd in _jobs_col(user_id).stream():
            p = pd.to_dict()
            url = p.get("url", pd.id)
            if url not in seen_urls:
                seen_urls.add(url)
                all_job_dicts.append(p)

        total = len(all_job_dicts)
        applied = sum(1 for j in all_job_dicts if j.get("status") == "applied")
        emails = sum(1 for j in all_job_dicts if j.get("cold_email_sent"))
        scores = [j.get("match_score") for j in all_job_dicts if j.get("match_score") is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else 0

        source_counts: dict = {}
        for j in all_job_dicts:
            src = j.get("source")
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
    ollama_host: Optional[str] = None
    ollama_model: Optional[str] = None
    ollama_fast_model: Optional[str] = None
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
    # Granular per-platform list stored as comma-separated disabled keys
    disabled_sources: Optional[str] = None
    # Per-pipeline sources list (enabled platforms as array, stored as comma-separated)
    sources: Optional[list] = None
    # How many results to fetch per title/location combo (lower = faster)
    results_per_search: Optional[int] = None
    # Google Sheets
    google_sheets_enabled: Optional[bool] = None
    google_sheets_spreadsheet_id: Optional[str] = None
    google_sheets_job_tracker_tab: Optional[str] = None
    google_sheets_autoapply_tab: Optional[str] = None


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
        sheets_defaults = resolve_sheets_settings(None, None)

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
            "ollama_host": env_settings.ollama_host,
            "ollama_model": env_settings.ollama_model,
            "ollama_fast_model": env_settings.ollama_fast_model,
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
            "results_per_search": 15,
            "disabled_sources": env_settings.disabled_sources,
            "sources": [],  # granular per-platform list (stored in Firestore)
            "google_sheets_enabled": sheets_defaults["enabled"],
            "google_sheets_spreadsheet_id": sheets_defaults["spreadsheet_id"],
            "google_sheets_job_tracker_tab": sheets_defaults["job_tracker_tab_base"],
            "google_sheets_autoapply_tab": sheets_defaults["autoapply_tab_base"],
        }
        for k, v in overrides.items():
            if k in base and v is not None:
                base[k] = v
            elif k == "sources" and v is not None:
                base["sources"] = v

        display = dict(base)
        for f in SECRET_FIELDS:
            display[f] = _mask(base.get(f))
        # If no per-platform sources saved yet, show empty (frontend defaults to all-enabled)
        if "sources" not in overrides:
            display["sources"] = []
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


class GoogleSheetsSyncRequest(BaseModel):
    scope: str = "all"  # tracker | autoapply | all


@router.get("/google-sheets/status")
async def google_sheets_status(user=Depends(get_current_user)):
    user_id = user["uid"]

    def _fetch():
        return get_google_sheets_status(_fs(), user_id)

    return await _run_blocking(_fetch)


@router.post("/google-sheets/test")
async def google_sheets_test(user=Depends(get_current_user)):
    user_id = user["uid"]

    def _run():
        return test_google_sheets_access(_fs(), user_id)

    try:
        result = await _run_blocking(_run)
        return result
    except Exception as e:
        raise HTTPException(400, f"Google Sheets test failed: {e}")


@router.post("/google-sheets/sync")
async def google_sheets_sync(req: GoogleSheetsSyncRequest, user=Depends(get_current_user)):
    user_id = user["uid"]
    scope = (req.scope or "all").strip().lower()

    def _run():
        db = _fs()
        if scope == "tracker":
            return {
                "status": "ok",
                "scope": "tracker",
                "tracker": sync_job_tracker_sheet(db, user_id),
            }
        if scope == "autoapply":
            return {
                "status": "ok",
                "scope": "autoapply",
                "autoapply": sync_autoapply_jobs_sheet(db, user_id),
            }
        return {
            **sync_all_google_sheets(db, user_id),
            "scope": "all",
        }

    try:
        return await _run_blocking(_run)
    except Exception as e:
        raise HTTPException(400, f"Google Sheets sync failed: {e}")


@router.post("/settings/test-connection")
async def test_ai_connection(payload: dict, user=Depends(get_current_user)):
    provider = payload.get("provider", "groq")
    api_key = payload.get("api_key", "")
    ollama_host = payload.get("ollama_host", "http://192.168.31.246:11434")

    # Ollama doesn't need an API key — test reachability instead
    if provider != "ollama" and (not api_key or api_key == "••••••••"):
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

        elif provider == "ollama":
            # Hit Ollama's /api/tags to list installed models — no auth required
            async with httpx.AsyncClient(timeout=6) as client:
                r = await client.get(f"{ollama_host}/api/tags")
            if r.status_code == 200:
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                model_list = ", ".join(models) if models else "none installed"
                return {
                    "status": "ok",
                    "message": f"Raspberry Pi reachable ✓  Models: {model_list}",
                }
            raise HTTPException(400, f"Ollama returned {r.status_code} — is it running?")

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
