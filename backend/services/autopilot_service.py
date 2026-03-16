"""
Auto Pilot Service — batch job search, ATS scoring, and resume tailoring.

Flow:
  1. Scrape up to max_jobs listings via JobSpy (LinkedIn, Indeed, Glassdoor, ZipRecruiter)
  2. For each job (concurrency=5): score match + tailor resume via Groq
  3. Generate tailored PDF + upload to Firebase Storage
  4. Stream progress events via asyncio.Queue (consumed by SSE endpoint)
  5. Persist every job result to Firestore as it completes
"""

import asyncio
import io
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Optional

from autoapply.ai.job_matcher import score_job_match
from autoapply.ai.resume_tailor import tailor_resume
from autoapply.resume.pdf_generator import generate_resume_pdf
from autoapply.scrapers.jobspy_scraper import JobSpyScraper
from services.firebase import get_db

# In-memory SSE queues: session_id → asyncio.Queue
# (lives for the duration of an active search session)
_sse_queues: dict[str, asyncio.Queue] = {}

CONCURRENCY = 3  # parallel Groq calls
MAX_JOBS_HARD_LIMIT = 10  # cap for testing


def get_queue(session_id: str) -> Optional[asyncio.Queue]:
    return _sse_queues.get(session_id)


def create_queue(session_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _sse_queues[session_id] = q
    return q


def remove_queue(session_id: str):
    _sse_queues.pop(session_id, None)


# ─── Firebase Storage helpers ──────────────────────────────────────────────

def _get_storage_bucket():
    """Return Firebase Storage bucket (lazy init)."""
    try:
        from firebase_admin import storage
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "jobeasy-9.firebasestorage.app")
        return storage.bucket(bucket_name)
    except Exception as e:
        print(f"[AutoPilot] Storage bucket error: {e}")
        return None


def _upload_pdf_bytes(pdf_bytes: bytes, blob_path: str) -> Optional[str]:
    """Upload PDF bytes to Firebase Storage, return public download URL."""
    try:
        bucket = _get_storage_bucket()
        if not bucket:
            return None
        blob = bucket.blob(blob_path)
        blob.upload_from_string(pdf_bytes, content_type="application/pdf")
        # Make publicly readable
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"[AutoPilot] PDF upload error: {e}")
        return None


# ─── Main pipeline ─────────────────────────────────────────────────────────

async def run_autopilot_session(
    session_id: str,
    uid: str,
    keywords: list[str],
    location: str,
    resume_text: str,
    max_jobs: int = 50,
    min_score: int = 60,
):
    """
    Full Auto Pilot pipeline. Runs as a FastAPI background task.
    Progress events are pushed to the SSE queue for this session.
    """
    db = get_db()
    session_ref = db.collection("autopilot_sessions").document(session_id)
    q = get_queue(session_id)

    async def emit(event: dict):
        """Push an SSE event to the queue (non-blocking)."""
        if q:
            await q.put(event)

    try:
        # ── 1. Scrape jobs ────────────────────────────────────────────────
        await emit({"type": "stage", "stage": "scraping",
                    "message": f"Searching jobs for: {', '.join(keywords)}…"})

        scraper = JobSpyScraper()
        raw_jobs = await scraper.search(
            titles=keywords,
            locations=[location] if location else ["Remote", "United States"],
            hours_old=72,
            results_per_search=max(25, max_jobs // max(len(keywords), 1)),
        )

        # Cap at max_jobs (hard limit for testing)
        jobs = raw_jobs[:min(max_jobs, MAX_JOBS_HARD_LIMIT)]
        total = len(jobs)

        if total == 0:
            await emit({"type": "error", "message": "No jobs found. Try different keywords."})
            session_ref.update({"status": "done", "total_jobs": 0,
                                "finished_at": _now()})
            return

        await emit({"type": "found", "total": total,
                    "message": f"Found {total} jobs! Starting analysis…"})

        session_ref.update({"total_jobs": total, "status": "processing"})

        # ── 2. Process jobs concurrently ──────────────────────────────────
        semaphore = asyncio.Semaphore(CONCURRENCY)
        processed = 0

        async def process_job(idx: int, job):
            nonlocal processed
            async with semaphore:
                job_id = str(uuid.uuid4())
                title = job.title
                company = job.company

                await emit({"type": "scoring", "current": idx + 1, "total": total,
                            "message": f"Scoring: {title} @ {company}"})

                # Score
                match = await score_job_match(
                    job_title=title,
                    company=company,
                    description=job.description or "",
                    profile=_resume_text_to_profile(resume_text),
                )
                score = match.get("score", 0)

                if score < min_score:
                    processed += 1
                    session_ref.update({"processed": processed})
                    await emit({"type": "skipped", "current": processed, "total": total,
                                "message": f"Skipped {title} @ {company} (score: {score})"})
                    # Still save to Firestore as skipped so frontend can show full list
                    _save_job_firestore(db, session_id, uid, job_id, job, match, None, None, "skipped")
                    return

                await emit({"type": "tailoring", "current": idx + 1, "total": total,
                            "message": f"Tailoring resume for {title} @ {company}…"})

                # Tailor resume
                tailor_result = await tailor_resume(
                    job_title=title,
                    company=company,
                    job_description=job.description or "",
                    base_resume_text=resume_text,
                    match_data=match,
                )
                tailored_md = tailor_result.get("resume_markdown", resume_text)

                # Generate + upload PDF
                pdf_url = None
                try:
                    with tempfile.TemporaryDirectory() as tmp_dir:
                        pdf_path = generate_resume_pdf(
                            markdown_text=tailored_md,
                            output_dir=tmp_dir,
                            filename=f"{job_id}.pdf",
                        )
                        with open(pdf_path, "rb") as f:
                            pdf_bytes = f.read()

                    blob_path = f"autopilot/{uid}/{session_id}/{job_id}.pdf"
                    pdf_url = _upload_pdf_bytes(pdf_bytes, blob_path)
                except Exception as e:
                    print(f"[AutoPilot] PDF gen error for {title}: {e}")

                processed += 1
                session_ref.update({"processed": processed})

                job_doc = _save_job_firestore(
                    db, session_id, uid, job_id, job, match,
                    tailor_result, pdf_url, "ready"
                )

                await emit({
                    "type": "job_ready",
                    "current": processed,
                    "total": total,
                    "job": job_doc,
                    "message": f"Ready: {title} @ {company} — {score}% match",
                })

        await asyncio.gather(*[process_job(i, j) for i, j in enumerate(jobs)])

        # ── 3. Finish ─────────────────────────────────────────────────────
        session_ref.update({
            "status": "done",
            "processed": processed,
            "finished_at": _now(),
        })
        await emit({"type": "done", "total": total, "processed": processed,
                    "message": f"Done! {processed} jobs ready to review."})

    except Exception as e:
        print(f"[AutoPilot] Session {session_id} crashed: {e}")
        session_ref.update({"status": "error", "error": str(e), "finished_at": _now()})
        await emit({"type": "error", "message": f"Pipeline error: {e}"})
    finally:
        # Signal SSE stream to close after short delay
        await asyncio.sleep(2)
        await emit({"type": "_eof"})
        remove_queue(session_id)


# ─── Helpers ───────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resume_text_to_profile(resume_text: str) -> dict:
    """
    Wrap raw resume text into the minimal profile dict expected by score_job_match.
    We don't have parsed YAML here, so we pass raw text as a special key.
    The job_matcher prompt will receive it via description substitution.
    """
    return {
        "skills": {"general": _extract_skill_keywords(resume_text)},
        "experience": [],
        "job_preferences": {"titles": [], "min_salary": 0, "visa_sponsorship_needed": False},
        "_raw_resume": resume_text,
    }


def _extract_skill_keywords(text: str) -> list[str]:
    """Heuristic keyword extraction for profile building."""
    common_skills = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI", "Django",
        "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "GCP", "Azure", "Docker",
        "Kubernetes", "CI/CD", "Machine Learning", "TensorFlow", "PyTorch", "LLM",
        "REST", "GraphQL", "Git", "Java", "Go", "Rust", "C++", "Swift", "Kotlin",
        "Flutter", "Vue", "Angular", "Next.js", "Tailwind", "CSS", "HTML",
        "Data Analysis", "Pandas", "Spark", "Hadoop", "Tableau", "Power BI",
        "Product Management", "Agile", "Scrum", "Figma", "UX", "SEO",
    ]
    text_lower = text.lower()
    return [s for s in common_skills if s.lower() in text_lower]


def _save_job_firestore(
    db, session_id: str, uid: str, job_id: str,
    job, match: dict, tailor_result: Optional[dict],
    pdf_url: Optional[str], status: str,
) -> dict:
    """Save a processed job to Firestore and return the serializable dict."""
    doc = {
        "job_id": job_id,
        "session_id": session_id,
        "uid": uid,
        "title": job.title,
        "company": job.company,
        "location": job.location or "",
        "is_remote": bool(job.is_remote),
        "url": job.url or "",
        "apply_url": job.apply_url or job.url or "",
        "source": job.source or "jobspy",
        "description": (job.description or "")[:3000],
        "employment_type": job.employment_type or "fulltime",
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        # Match
        "match_score": match.get("score", 0),
        "match_tier": match.get("tier", "C"),
        "match_reasons": match.get("reasons", []),
        "keywords_matched": match.get("keywords_matched", []),
        "keywords_missing": match.get("keywords_missing", []),
        "red_flags": match.get("red_flags", []),
        # Tailored resume
        "tailored_resume_md": tailor_result.get("resume_markdown", "") if tailor_result else "",
        "tailored_summary": tailor_result.get("summary_statement", "") if tailor_result else "",
        "key_changes": tailor_result.get("key_changes", []) if tailor_result else [],
        "ats_keywords_added": tailor_result.get("ats_keywords_added", []) if tailor_result else [],
        "pdf_url": pdf_url or "",
        "status": status,
        "created_at": _now(),
    }

    db.collection("autopilot_sessions").document(session_id) \
      .collection("jobs").document(job_id).set(doc)

    return doc
