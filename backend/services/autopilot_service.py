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

CONCURRENCY = 1          # sequential to avoid Groq TPM rate limits on free tier
MAX_JOBS_HARD_LIMIT = 30 # how many raw scraped jobs to consider
TARGET_READY_JOBS = 3    # stop tailoring once we have this many ready (high-score) jobs


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
    desk_data: Optional[dict] = None,
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

    # Build base_resume_data from the active CareerDesk profile.
    # This guarantees tailored resumes belong to the correct person (not the most-recently-modified resume).
    base_resume_data = _desk_data_to_resume(desk_data, uid) if desk_data else {}

    # Fallback: if no desk_data was sent, use most-recently-modified resume
    if not base_resume_data:
        try:
            resume_docs = list(
                db.collection("resumes")
                .where("userId", "==", uid)
                .limit(10)
                .stream()
            )
            if resume_docs:
                resume_dicts = [d.to_dict() for d in resume_docs]
                resume_dicts.sort(key=lambda r: r.get("lastModified", ""), reverse=True)
                base_resume_data = resume_dicts[0]
        except Exception as e:
            print(f"[AutoPilot] Could not fetch base resume: {e}")

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
            results_per_search=MAX_JOBS_HARD_LIMIT,
        )

        if not raw_jobs:
            await emit({"type": "error", "message": "No jobs found. Try different keywords."})
            session_ref.update({"status": "done", "total_jobs": 0, "finished_at": _now()})
            return

        target = max(1, min(max_jobs, TARGET_READY_JOBS))  # user setting, capped at constant

        await emit({"type": "found", "total": len(raw_jobs),
                    "message": f"Found {len(raw_jobs)} jobs! Picking best {target}…"})
        session_ref.update({"total_jobs": len(raw_jobs), "status": "processing"})

        # ── 2. Score → stop at target, then tailor those ──────────────────
        processed = 0
        ready_jobs_data = []  # list of (job, match, job_id)

        for idx, job in enumerate(raw_jobs):
            if len(ready_jobs_data) >= target:
                break

            job_id = str(uuid.uuid4())
            title = job.title or "Unknown Role"
            company = job.company or "Unknown Company"
            processed += 1

            await emit({"type": "scoring", "current": processed, "total": len(raw_jobs),
                        "message": f"Scoring {processed}: {title} @ {company}"})

            match = await score_job_match(
                job_title=title,
                company=company,
                description=job.description or "",
                profile=_resume_text_to_profile(resume_text),
            )
            score = match.get("score", 0)

            if score < min_score:
                await emit({"type": "skipped", "current": processed, "total": len(raw_jobs),
                            "message": f"Skip ({score}%): {title} @ {company}"})
                _save_job_firestore(db, session_id, uid, job_id, job, match, None, None, "skipped")
                session_ref.update({"processed": processed})
                continue

            ready_jobs_data.append((job, match, job_id))

        # Tailor the qualifying jobs one by one
        ready_count = 0
        for (job, match, job_id) in ready_jobs_data:
            title = job.title or "Unknown Role"
            company = job.company or "Unknown Company"
            score = match.get("score", 0)

            await emit({"type": "tailoring", "current": ready_count + 1, "total": target,
                        "message": f"Tailoring resume for {title} @ {company}…"})

            tailor_result = await tailor_resume(
                job_title=title,
                company=company,
                job_description=job.description or "",
                base_resume_text=resume_text,
                match_data=match,
            )

            job_doc = _save_job_firestore(
                db, session_id, uid, job_id, job, match,
                tailor_result, None, "ready"
            )
            ready_count += 1
            session_ref.update({"processed": processed})

            await emit({
                "type": "job_ready",
                "current": ready_count,
                "total": TARGET_READY_JOBS,
                "job": job_doc,
                "message": f"✓ Ready: {title} @ {company} — {score}% match",
            })

        # ── 3. Save tailored resumes to Resume Builder ────────────────────
        saved_resume_ids = []
        try:
            saved_resume_ids = _save_top_tailored_resumes(db, session_id, uid, base_resume_data, top_n=target)
        except Exception as e:
            print(f"[AutoPilot] Failed to save tailored resumes: {e}")

        # ── 4. Push ready jobs into Job Tracker ───────────────────────────
        try:
            # Build resume_id lookup: job_id → resume_id
            resume_id_by_job = {item["job_id"]: item["resume_id"] for item in saved_resume_ids if isinstance(item, dict)}
            _push_jobs_to_tracker(db, uid, ready_jobs_data, resume_id_by_job)
        except Exception as e:
            print(f"[AutoPilot] Failed to push jobs to tracker: {e}")

        # ── 5. Finish ─────────────────────────────────────────────────────
        session_ref.update({
            "status": "done",
            "processed": processed,
            "ready_jobs": ready_count,
            "finished_at": _now(),
        })
        await emit({
            "type": "done",
            "total": len(raw_jobs),
            "processed": ready_count,
            "saved_resume_ids": saved_resume_ids,
            "message": f"Done! {ready_count} jobs ready with tailored resumes saved to Resume Builder.",
        })

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

def _parse_experience_from_markdown(markdown: str, base_experience: list) -> list:
    """
    Parse experience entries from tailored resume markdown back into
    the Resume Builder's structured Experience format:
    [{id, role, company, startDate, endDate, description}]

    The LLM outputs sections like:
      ### Software Engineer — Acme Corp (Jan 2022 – Present)
      - Built X with Y
      - Led Z initiative

    We match each parsed entry to a base entry by company name (fuzzy) so we
    preserve the original startDate/endDate/id when possible, and only replace
    the description (bullets) with the tailored version.
    """
    import re

    # Find the ## Experience section
    exp_section_match = re.search(
        r'##\s*(?:Work\s+)?Experience\s*\n(.*?)(?=\n##\s|\Z)',
        markdown, re.DOTALL | re.IGNORECASE
    )
    if not exp_section_match:
        return base_experience  # no experience section found, keep original

    exp_text = exp_section_match.group(1)

    # Split into individual job blocks on ### headers
    job_blocks = re.split(r'\n(?=###\s)', exp_text.strip())

    parsed_entries = []
    for block in job_blocks:
        block = block.strip()
        if not block:
            continue

        lines = block.split('\n')
        header = lines[0].lstrip('#').strip()

        # Extract role and company from "Role — Company (dates)" or "Role at Company (dates)"
        role, company_name, start_date, end_date = "", "", "", ""
        date_match = re.search(r'\(([^)]+)\)\s*$', header)
        if date_match:
            date_str = date_match.group(1)
            # Parse date range like "Jan 2022 – Present" or "2020 - 2022"
            parts = re.split(r'\s*[–—-]\s*', date_str, maxsplit=1)
            start_date = parts[0].strip() if parts else ""
            end_date = parts[1].strip() if len(parts) > 1 else "Present"
            header_no_dates = header[:date_match.start()].strip()
        else:
            header_no_dates = header

        # Split on " — " (em dash), " – " (en dash), " - ", " at ", " @ "
        sep_match = re.search(r'\s+(?:[—–]|-(?!\d)|at|@)\s+', header_no_dates)
        if sep_match:
            role = header_no_dates[:sep_match.start()].strip()
            company_name = header_no_dates[sep_match.end():].strip()
        else:
            role = header_no_dates
            company_name = ""

        # Collect bullet lines as the description
        bullet_lines = []
        for line in lines[1:]:
            stripped = line.strip()
            # Handle any bullet prefix: - / • / * / ** (bold marker)
            if stripped.startswith(('- ', '• ', '* ', '** ')):
                bullet_lines.append(stripped.lstrip('*•- ').strip())
            elif stripped and not stripped.startswith('#'):
                bullet_lines.append(stripped)

        description = '\n'.join(f'- {b}' for b in bullet_lines if b)

        parsed_entries.append({
            "role": role,
            "company": company_name,
            "startDate": start_date,
            "endDate": end_date,
            "description": description,
        })

    if not parsed_entries:
        return base_experience

    # Match parsed entries to base entries by company name to preserve IDs and dates
    result = []
    used_base_ids = set()

    for parsed in parsed_entries:
        # Try to find matching base entry by company name (case-insensitive)
        matched_base = None
        for base in base_experience:
            base_id = base.get("id", "")
            if base_id in used_base_ids:
                continue
            base_company = base.get("company", "").lower().strip()
            parsed_company = parsed["company"].lower().strip()
            if base_company and parsed_company and (
                base_company in parsed_company or parsed_company in base_company
            ):
                matched_base = base
                used_base_ids.add(base_id)
                break

        if matched_base:
            # Keep original id/dates, replace description with tailored bullets
            entry = dict(matched_base)
            entry["description"] = parsed["description"] if parsed["description"] else matched_base.get("description", "")
            # Update role if LLM refined it
            if parsed["role"]:
                entry["role"] = parsed["role"]
        else:
            # New entry from LLM — assign a fresh ID
            entry = {
                "id": str(uuid.uuid4()),
                "role": parsed["role"],
                "company": parsed["company"],
                "startDate": parsed["startDate"],
                "endDate": parsed["endDate"],
                "description": parsed["description"],
            }
        result.append(entry)

    # If we got fewer entries than original (LLM dropped some), append the unmatched originals
    for base in base_experience:
        if base.get("id", "") not in used_base_ids:
            result.append(base)

    return result


def _save_top_tailored_resumes(db, session_id: str, uid: str, base_resume_data: dict, top_n: int = 3) -> list[str]:
    """
    After pipeline completes, save top N tailored resumes as Resume Builder documents.
    Returns list of saved resume IDs.
    """
    jobs_ref = (
        db.collection("autopilot_sessions").document(session_id)
        .collection("jobs")
    )
    job_docs = [d.to_dict() for d in jobs_ref.stream()]
    ready_jobs = [j for j in job_docs if j.get("status") == "ready"]
    ready_jobs.sort(key=lambda j: j.get("match_score", 0), reverse=True)
    top_jobs = ready_jobs[:top_n]

    saved_ids = []
    for job in top_jobs:
        tailored_summary = job.get("tailored_summary", "")
        tailored_md = job.get("tailored_resume_md", "")
        title = job.get("title", "Job")
        company = job.get("company", "")
        score = job.get("match_score", 0)
        ats_keywords = job.get("ats_keywords_added", [])
        key_changes = job.get("key_changes", [])

        # Start from the base resume structure
        resume_doc = dict(base_resume_data) if base_resume_data else {}
        resume_doc["id"] = str(uuid.uuid4())
        resume_doc["userId"] = uid
        resume_doc["title"] = f"[AutoPilot] {title} @ {company} ({score}%)"
        resume_doc["templateId"] = resume_doc.get("templateId", "modern")
        resume_doc["lastModified"] = _now()
        resume_doc["autopilot_session"] = session_id
        resume_doc["autopilot_job_id"] = job.get("job_id", "")
        resume_doc["autopilot_apply_url"] = job.get("apply_url", "") or job.get("url", "")
        resume_doc["autopilot_company"] = company
        resume_doc["autopilot_score"] = score
        resume_doc["autopilot_key_changes"] = key_changes

        # Apply tailored summary
        if tailored_summary:
            resume_doc["summary"] = tailored_summary

        # Parse and apply tailored experience bullets from markdown
        if tailored_md:
            base_experience = base_resume_data.get("experience", [])
            tailored_experience = _parse_experience_from_markdown(tailored_md, base_experience)
            if tailored_experience:
                resume_doc["experience"] = tailored_experience
                print(f"[AutoPilot] Applied {len(tailored_experience)} tailored experience entries for {title}")

        # Merge ATS keywords into skills (deduplicated)
        if ats_keywords:
            existing_skills = resume_doc.get("skills", [])
            resume_doc["skills"] = list(dict.fromkeys(existing_skills + ats_keywords))

        db.collection("resumes").document(resume_doc["id"]).set(resume_doc)
        job_id = job.get("job_id", "")
        saved_ids.append({"resume_id": resume_doc["id"], "job_id": job_id})
        # Write resume_id back onto the job doc so it can be restored on page reload
        if job_id:
            db.collection("autopilot_sessions").document(session_id) \
              .collection("jobs").document(job_id) \
              .update({"resume_id": resume_doc["id"]})
        print(f"[AutoPilot] Saved tailored resume: {resume_doc['title']}")

    return saved_ids


def _push_jobs_to_tracker(db, uid: str, ready_jobs_data: list, resume_id_by_job: dict):
    """
    Write each AutoPilot-ready job into the top-level `jobs` collection
    so it appears in Job Tracker immediately after a session completes.
    Skips any job that already exists (same title + company) to avoid duplicates.
    """
    from routers.referral import list_user_jobs_raw, normalize_source

    existing = list_user_jobs_raw(db, uid)
    existing_keys = {
        (r.get("title", "").strip().lower(), r.get("company", "").strip().lower())
        for r in existing
    }

    for (job, match, job_id) in ready_jobs_data:
        title = (job.title or "").strip()
        company = (job.company or "").strip()
        key = (title.lower(), company.lower())
        if key in existing_keys:
            print(f"[AutoPilot] Tracker: skipping duplicate '{title}' @ '{company}'")
            continue

        tracker_id = str(uuid.uuid4())
        resume_id = resume_id_by_job.get(job_id, "")
        now = _now()

        doc = {
            "id": tracker_id,
            "userId": uid,
            "title": title,
            "company": company,
            "location": job.location or "",
            "link": job.apply_url or job.url or "",
            "source": normalize_source(job.source or "autopilot"),
            "jobType": (job.employment_type or "full-time").lower(),
            "status": "saved",
            "priority": 2 if match.get("score", 0) >= 80 else 1,
            "dateDiscovered": now,
            "createdAt": now,
            "updatedAt": now,
            "autoMoveDate": now,
            "waitingPeriod": 7,
            "outreach": [],
            "outreachCount": 0,
            "tags": ["autopilot"],
            "notes": f"AutoPilot match: {match.get('score', 0)}%\n" + "\n".join(match.get("reasons", [])),
            "jobDescription": (job.description or "")[:2000],
            "sponsorshipRequired": False,
            "autopilot_resume_id": resume_id,
            "autopilot_session_job_id": job_id,
        }
        db.collection("jobs").document(tracker_id).set(doc)
        existing_keys.add(key)
        print(f"[AutoPilot] Tracker: added '{title}' @ '{company}' (score={match.get('score',0)}%)")


def _desk_data_to_resume(desk: dict, uid: str) -> dict:
    """
    Convert an active CareerDesk profile dict into the Resume Builder document
    format used by _save_top_tailored_resumes.
    This ensures tailored resumes always belong to the correct profile/person.
    """
    p = desk.get("profile") or {}
    experiences = []
    for e in (desk.get("experiences") or []):
        experiences.append({
            "id": e.get("id", str(uuid.uuid4())),
            "role": e.get("role", ""),
            "company": e.get("company", ""),
            "startDate": e.get("startDate", ""),
            "endDate": "Present" if e.get("current") else e.get("endDate", ""),
            "description": e.get("description", ""),
        })
    education = []
    for e in (desk.get("education") or []):
        education.append({
            "id": e.get("id", str(uuid.uuid4())),
            "degree": e.get("degree", ""),
            "school": e.get("school", ""),
            "year": e.get("year", ""),
        })
    projects = []
    for pr in (desk.get("projects") or []):
        projects.append({
            "id": pr.get("id", str(uuid.uuid4())),
            "name": pr.get("name", ""),
            "description": pr.get("description", ""),
            "tech": pr.get("tech", ""),
            "url": pr.get("url", ""),
        })
    return {
        "userId": uid,
        "personalInfo": {
            "fullName": p.get("name", ""),
            "email": p.get("email", ""),
            "phone": p.get("phone", ""),
            "location": p.get("location", ""),
            "linkedin": p.get("linkedin", ""),
            "website": p.get("website", ""),
            "github": p.get("github", ""),
            "title": p.get("role", ""),
        },
        "summary": p.get("summary", ""),
        "experience": experiences,
        "education": education,
        "skills": list(desk.get("skills") or []),
        "projects": projects,
        "templateId": "modern",
        "lastModified": _now(),
    }


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
