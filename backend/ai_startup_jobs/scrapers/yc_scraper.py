"""
YC Work at a Startup Scraper
URL: https://www.workatastartup.com/jobs
Extracts embedded JSON from data-page attribute — fast and reliable.
Scrolls to load all jobs, then filters for AI/ML roles from batches 2022+.
"""

import asyncio
import html
import json
import logging
import random
import re
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# YC batches from 2022 onwards (recently funded)
RECENT_BATCHES = {
    "W22", "S22", "W23", "S23", "W24", "S24", "W25", "S25", "W26", "F22", "F23", "F24"
}

AI_ROLE_KEYWORDS = [
    "ai", "ml", "machine learning", "llm", "genai", "nlp", "data scientist",
    "computer vision", "deep learning", "rag", "prompt", "generative ai",
    "mlops", "ai engineer", "data science", "reinforcement learning",
    "foundation model", "fine-tuning", "huggingface", "transformer",
    "neural", "diffusion", "gpt", "bert", "embeddings", "applied scientist",
]

AI_COMPANY_KEYWORDS = [
    "ai", "ml", "machine learning", "llm", "nlp", "computer vision",
    "generative", "language model", "data science", "intelligence",
    "neural", "deep learning", "automation", "robotics",
]

LOCATION_KEYWORDS = ["remote", "hyderabad", "anywhere", "india", "wfh"]


def _is_ai_role(title: str, company_one_liner: str = "") -> bool:
    title_lower = title.lower()
    combined = f"{title_lower} {company_one_liner.lower()}"
    return any(kw in combined for kw in AI_ROLE_KEYWORDS) or \
           any(kw in company_one_liner.lower() for kw in AI_COMPANY_KEYWORDS)


def _is_target_location(location: str) -> bool:
    loc_lower = location.lower()
    if not loc_lower or "remote" in loc_lower or "anywhere" in loc_lower:
        return True
    return any(kw in loc_lower for kw in LOCATION_KEYWORDS)


async def scrape_yc_jobs() -> list[dict]:
    """Scrape YC Work at a Startup for AI/ML jobs."""
    jobs = []

    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import Stealth
    except ImportError:
        logger.error("playwright or playwright-stealth not installed.")
        return jobs

    logger.info("Starting YC Work at a Startup scraper...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        try:
            base_url = "https://www.workatastartup.com/jobs"
            logger.info(f"Loading {base_url}")
            await page.goto(base_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # Scroll repeatedly to trigger lazy-loading of more jobs
            logger.info("Scrolling to load all jobs...")
            prev_count = 0
            for scroll_round in range(20):  # Up to 20 scroll rounds
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(random.uniform(1.5, 2.5))

                # Extract current job count from JSON
                el = await page.query_selector("[data-page]")
                if el:
                    raw = await el.get_attribute("data-page")
                    if raw:
                        try:
                            raw = html.unescape(raw)
                            data = json.loads(raw)
                            current_jobs = data.get("props", {}).get("jobs", [])
                            curr_count = len(current_jobs)
                            logger.info(f"  Scroll {scroll_round+1}: {curr_count} jobs loaded")
                            if curr_count == prev_count and scroll_round > 3:
                                logger.info("  No more jobs loading, stopping scroll")
                                break
                            prev_count = curr_count
                        except Exception:
                            break

            # Final extraction
            el = await page.query_selector("[data-page]")
            if el:
                raw = await el.get_attribute("data-page")
                if raw:
                    raw = html.unescape(raw)
                    page_data = json.loads(raw)
                    all_jobs = page_data.get("props", {}).get("jobs", [])
                    logger.info(f"Total jobs in JSON: {len(all_jobs)}")

                    for job_data in all_jobs:
                        job = _parse_job_json(job_data)
                        if job:
                            jobs.append(job)

        except Exception as e:
            logger.error(f"YC scraper error: {e}")
        finally:
            await browser.close()

    # Filter for AI roles (title or company description)
    ai_jobs = [j for j in jobs if _is_ai_role(j["job_title"], j.get("notes", ""))]

    # Filter for target locations (keep all — YC is global, remote is common)
    # We include ALL locations since YC remote jobs are valuable globally
    # Location filter is applied in the main filter.py

    logger.info(f"YC: {len(jobs)} total → {len(ai_jobs)} AI/ML jobs")
    return ai_jobs


def _parse_job_json(data: dict) -> Optional[dict]:
    """Parse a job dict from the YC data-page JSON."""
    try:
        title = str(data.get("title", "")).strip()
        company = str(data.get("companyName", "")).strip()
        batch = str(data.get("companyBatch", "")).strip()
        location = str(data.get("location", "")).strip()
        one_liner = str(data.get("companyOneLiner", "")).strip()
        job_id = data.get("id", "")
        slug = data.get("companySlug", "")
        apply_url = str(data.get("applyUrl", "")).strip()

        if not title or not company:
            return None

        job_url = f"https://www.workatastartup.com/jobs/{job_id}" if job_id else apply_url
        company_url = f"https://www.workatastartup.com/companies/{slug}" if slug else ""

        is_recent = batch in RECENT_BATCHES if batch else True
        is_remote = "remote" in location.lower() or not location

        notes_parts = []
        if batch:
            notes_parts.append(f"Batch: {batch}")
        if is_remote:
            notes_parts.append("Remote")
        if one_liner:
            notes_parts.append(one_liner[:80])
        role_type = data.get("roleType", "")
        if role_type:
            notes_parts.append(f"Role: {role_type}")

        return {
            "job_title": title,
            "company": company,
            "location": "Remote" if is_remote else (location or "Remote"),
            "salary": "",  # YC doesn't always show salary in list
            "funding_stage": batch or "YC",
            "source": "YCombinator",
            "job_url": job_url,
            "company_website": company_url,
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": " | ".join(notes_parts),
            "is_freelance": False,
            "is_recent_batch": is_recent,
            "_one_liner": one_liner,  # Used for AI filtering
        }
    except Exception as e:
        logger.debug(f"Error parsing YC job JSON: {e}")
        return None


# Sync wrapper
def scrape() -> list[dict]:
    return asyncio.run(scrape_yc_jobs())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\n{'='*50}")
    print(f"YC AI Jobs Found: {len(results)}")
    for j in results[:15]:
        print(f"  [{j['funding_stage']}] {j['job_title']} @ {j['company']} — {j['location']}")
        if j.get('_one_liner'):
            print(f"    → {j['_one_liner']}")
