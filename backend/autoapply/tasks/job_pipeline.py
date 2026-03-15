"""
Main job automation pipeline.
Runs daily via APScheduler (no Celery/Redis needed).
Scrapes from: JobSpy (LinkedIn/Indeed/Glassdoor), Wellfound, Naukri, YC WAAS.
"""
import asyncio
from datetime import datetime
from typing import List
from pathlib import Path

from autoapply.utils.logger import logger
from autoapply.utils.settings import settings
from autoapply.database.models import Job, JobStatus, RunLog, Application
from autoapply.scrapers.jobspy_scraper import JobSpyScraper
from autoapply.scrapers.wellfound_scraper import WellfoundScraper
from autoapply.scrapers.naukri_scraper import NaukriScraper
from autoapply.scrapers.yc_scraper import YCScraper
from autoapply.scrapers.startup_filter import filter_startup_jobs
from autoapply.scrapers.base import JobListing
from autoapply.ai.job_matcher import score_job_match, load_profile
from autoapply.ai.resume_tailor import tailor_resume, generate_cover_letter
from autoapply.ai.company_research import research_company, find_hiring_manager_email
from autoapply.ai.groq_client import parse_job_requirements
from autoapply.resume.pdf_generator import generate_resume_pdf
from autoapply.applicator.linkedin_apply import LinkedInApplyBot
from autoapply.applicator.form_filler import GenericFormFiller
from autoapply.outreach.gmail_client import send_cold_email, generate_cold_email


async def run_full_pipeline(dry_run: bool = False) -> dict:
    """
    Full daily pipeline:
    1. Scrape jobs from multiple sources (all free)
    2. Filter for AI startup roles in target locations
    3. Score match (Groq - free)
    4. Tailor resume (Groq - free)
    5. Apply (Playwright - free)
    6. Cold email (Gmail SMTP - free)
    """
    from autoapply.database.db import AsyncSessionLocal, init_db
    from sqlalchemy import select

    await init_db()

    profile = load_profile()
    titles = settings.job_titles_list
    locations = settings.job_locations_list

    stats = {"discovered": 0, "scored": 0, "applied": 0,
             "emails_sent": 0, "skipped": 0, "errors": 0,
             "by_source": {}}

    logger.info("=" * 55)
    logger.info("AUTOAPPLY PIPELINE STARTING" + (" [DRY RUN]" if dry_run else ""))
    logger.info("=" * 55)

    async with AsyncSessionLocal() as db:
        run_log = RunLog(started_at=datetime.utcnow(), status="running")
        db.add(run_log)
        await db.commit()

        try:
            # ── 1. Scrape jobs from ALL sources ───────────────
            all_jobs: List[JobListing] = []

            # Source 1: JobSpy (LinkedIn, Indeed, Glassdoor, ZipRecruiter)
            logger.info("📡 [1/4] Scraping via JobSpy (LinkedIn/Indeed/Glassdoor)...")
            try:
                jobspy = JobSpyScraper()
                jobspy_jobs = await jobspy.search(
                    titles=titles,
                    locations=locations,
                    hours_old=24,
                    results_per_search=25,
                )
                all_jobs.extend(jobspy_jobs)
                stats["by_source"]["jobspy"] = len(jobspy_jobs)
                logger.info(f"   JobSpy: {len(jobspy_jobs)} jobs")
            except Exception as e:
                logger.error(f"   JobSpy failed: {e}")
                stats["by_source"]["jobspy"] = 0

            # Source 2: Wellfound (funded startups)
            logger.info("📡 [2/4] Scraping Wellfound (AngelList — funded startups)...")
            try:
                wellfound = WellfoundScraper()
                wf_jobs = await wellfound.search(titles=titles, locations=locations)
                all_jobs.extend(wf_jobs)
                stats["by_source"]["wellfound"] = len(wf_jobs)
                logger.info(f"   Wellfound: {len(wf_jobs)} jobs")
            except Exception as e:
                logger.error(f"   Wellfound failed: {e}")
                stats["by_source"]["wellfound"] = 0

            # Source 3: Naukri (India — AI startups)
            logger.info("📡 [3/4] Scraping Naukri.com (India AI startups)...")
            try:
                naukri = NaukriScraper()
                naukri_jobs = await naukri.search(titles=titles, locations=locations)
                all_jobs.extend(naukri_jobs)
                stats["by_source"]["naukri"] = len(naukri_jobs)
                logger.info(f"   Naukri: {len(naukri_jobs)} jobs")
            except Exception as e:
                logger.error(f"   Naukri failed: {e}")
                stats["by_source"]["naukri"] = 0

            # Source 4: YC Work at a Startup
            logger.info("📡 [4/4] Scraping YC Work at a Startup...")
            try:
                yc = YCScraper()
                yc_jobs = await yc.search(titles=titles, locations=locations)
                all_jobs.extend(yc_jobs)
                stats["by_source"]["yc"] = len(yc_jobs)
                logger.info(f"   YC WAAS: {len(yc_jobs)} jobs")
            except Exception as e:
                logger.error(f"   YC WAAS failed: {e}")
                stats["by_source"]["yc"] = 0

            # ── 1b. Apply startup filter ──────────────────────
            logger.info("🔍 Filtering for AI startup jobs...")
            all_jobs = filter_startup_jobs(
                all_jobs,
                extra_blocklist=settings.blacklist_list,
            )

            stats["discovered"] = len(all_jobs)
            logger.info(f"   Total after filter: {len(all_jobs)} jobs")
            logger.info(f"   Found {len(all_jobs)} jobs")

            # ── 2. Score + filter ─────────────────────────────
            logger.info("🎯 Scoring matches with Groq...")
            top_jobs = []
            applications_today = 0

            for raw_job in all_jobs:
                if applications_today >= settings.max_applications_per_day:
                    break

                # Skip blacklisted
                if raw_job.company.lower() in settings.blacklist_list:
                    continue

                # Skip already seen
                existing = await db.execute(
                    select(Job).where(Job.external_id == raw_job.external_id)
                )
                if existing.scalar_one_or_none():
                    continue

                # Parse requirements
                requirements = {}
                if raw_job.description:
                    requirements = await parse_job_requirements(raw_job.description)
                    raw_job.requirements = requirements.get("required_skills", [])

                # Score
                match = await score_job_match(
                    job_title=raw_job.title,
                    company=raw_job.company,
                    description=raw_job.description,
                    requirements=raw_job.requirements,
                    profile=profile,
                )
                score = match.get("score", 0)

                db_job = Job(
                    external_id=raw_job.external_id,
                    source=raw_job.source,
                    url=raw_job.url,
                    apply_url=raw_job.apply_url or raw_job.url,
                    title=raw_job.title,
                    company=raw_job.company,
                    company_domain=raw_job.company_domain,
                    location=raw_job.location,
                    is_remote=raw_job.is_remote,
                    description=raw_job.description,
                    requirements=raw_job.requirements,
                    salary_min=raw_job.salary_min,
                    salary_max=raw_job.salary_max,
                    match_score=score,
                    match_reasons=match.get("reasons", []),
                    keywords_matched=match.get("keywords_matched", []),
                    keywords_missing=match.get("keywords_missing", []),
                    status=JobStatus.SCORED if score >= settings.match_score_threshold else JobStatus.SKIPPED,
                )
                db.add(db_job)
                await db.commit()
                await db.refresh(db_job)

                if score < settings.match_score_threshold:
                    stats["skipped"] += 1
                    continue

                top_jobs.append((db_job, raw_job, match))
                stats["scored"] += 1
                logger.info(f"   ✓ {score:.0f}% — {raw_job.title} at {raw_job.company}")

            # ── 3. Tailor + Apply + Email ─────────────────────
            logger.info(f"🚀 Processing {len(top_jobs)} matched jobs...")

            linkedin_bot = None
            if any(j[1].source == "linkedin" for j in top_jobs):
                try:
                    linkedin_bot = LinkedInApplyBot()
                    await linkedin_bot.__aenter__()
                except Exception as e:
                    logger.warning(f"LinkedIn bot unavailable: {e}")
                    linkedin_bot = None

            form_filler = GenericFormFiller()

            for db_job, raw_job, match_data in top_jobs:
                if applications_today >= settings.max_applications_per_day:
                    logger.info("Daily limit reached")
                    break
                try:
                    logger.info(f"   → {db_job.title} at {db_job.company}")

                    # Research company (free - DuckDuckGo + Groq)
                    company_research = await research_company(
                        company=db_job.company,
                        job_title=db_job.title,
                        company_domain=db_job.company_domain or "",
                    )
                    db_job.company_research = company_research

                    # Tailor resume
                    base = _load_base_resume()
                    tailored = await tailor_resume(
                        job_title=db_job.title,
                        company=db_job.company,
                        job_description=db_job.description,
                        base_resume_text=base,
                        match_data=match_data,
                    )

                    # Cover letter
                    cover_letter = await generate_cover_letter(
                        job_title=db_job.title,
                        company=db_job.company,
                        job_description=db_job.description,
                        resume_data=tailored,
                        company_research=company_research,
                    )
                    db_job.cover_letter = cover_letter

                    # PDF resume
                    resume_path = generate_resume_pdf(
                        tailored.get("resume_markdown", base or ""),
                        filename=f"resume_{db_job.company.lower().replace(' ', '_')}_{db_job.id}.pdf",
                    )
                    db_job.tailored_resume_path = resume_path
                    db_job.status = JobStatus.RESUME_TAILORED

                    if not dry_run:
                        # Apply
                        apply_result = await _apply(db_job, raw_job, resume_path,
                                                     cover_letter, linkedin_bot, form_filler)
                        if apply_result.get("success"):
                            db_job.status = JobStatus.APPLIED
                            db_job.applied_at = datetime.utcnow()
                            db.add(Application(job_id=db_job.id, method=raw_job.source, status="submitted"))
                            applications_today += 1
                            stats["applied"] += 1
                            logger.info(f"     ✅ Applied!")

                        # Cold email
                        if settings.cold_email_enabled and stats["emails_sent"] < settings.daily_email_limit:
                            sent = await _cold_email(db_job, profile, tailored,
                                                      company_research, resume_path)
                            if sent:
                                db_job.cold_email_sent = True
                                db_job.cold_email_sent_at = datetime.utcnow()
                                stats["emails_sent"] += 1
                                await asyncio.sleep(settings.email_delay_seconds)

                    await db.commit()

                except Exception as e:
                    logger.error(f"     ✗ Error: {e}")
                    stats["errors"] += 1
                    await db.rollback()

            if linkedin_bot:
                try:
                    await linkedin_bot.__aexit__(None, None, None)
                except Exception:
                    pass

            run_log.finished_at = datetime.utcnow()
            run_log.jobs_discovered = stats["discovered"]
            run_log.jobs_scored = stats["scored"]
            run_log.jobs_applied = stats["applied"]
            run_log.emails_sent = stats["emails_sent"]
            run_log.status = "completed"
            await db.commit()

        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            run_log.status = "failed"
            run_log.finished_at = datetime.utcnow()
            await db.commit()
            raise

    logger.info(f"DONE: {stats}")
    return stats


async def _apply(db_job, raw_job, resume_path, cover_letter,
                  linkedin_bot, form_filler) -> dict:
    if raw_job.source == "linkedin" and linkedin_bot:
        return await linkedin_bot.apply(
            job_url=db_job.apply_url or db_job.url,
            resume_pdf_path=resume_path,
            cover_letter=cover_letter,
        )
    return await form_filler.apply(
        apply_url=db_job.apply_url or db_job.url,
        resume_pdf_path=resume_path,
        cover_letter=cover_letter,
        job_title=db_job.title,
    )


async def _cold_email(db_job, profile, tailored, company_research, resume_path) -> bool:
    from autoapply.ai.company_research import find_hiring_manager_email
    hm = await find_hiring_manager_email(
        company=db_job.company,
        company_domain=db_job.company_domain or "",
        job_title=db_job.title,
    )
    if not hm or not hm.get("email"):
        return False

    db_job.hiring_manager_email = hm["email"]
    db_job.hiring_manager_name = hm.get("name", "")

    content = await generate_cold_email(
        candidate_name=profile.get("personal", {}).get("name", ""),
        hiring_manager_name=hm.get("name", ""),
        hiring_manager_title=hm.get("title", ""),
        company=db_job.company,
        job_title=db_job.title,
        company_research=company_research,
        cover_letter_hooks=tailored.get("cover_letter_hooks", []),
        profile=profile,
    )

    if not content.get("body"):
        return False

    result = await send_cold_email(
        to_email=hm["email"],
        to_name=hm.get("name", ""),
        subject=content["subject"],
        body=content["body"],
        sender_name=profile.get("personal", {}).get("name", ""),
        attachment_path=resume_path,
    )
    return result.get("success", False)


def _load_base_resume() -> str:
    uploads = Path("uploads")
    for pdf in uploads.glob("*.pdf"):
        try:
            import fitz
            doc = fitz.open(str(pdf))
            text = "".join(p.get_text() for p in doc)
            doc.close()
            if text.strip():
                return text
        except Exception:
            pass
    return ""
