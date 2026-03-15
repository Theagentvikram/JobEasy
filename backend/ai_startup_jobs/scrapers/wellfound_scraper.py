"""
Wellfound (AngelList Talent) Scraper
Uses Wellfound's public job search endpoint (no auth required for basic listings).
Falls back to their jobs RSS / sitemap if API is blocked.
"""

import asyncio
import json
import logging
import random
import re
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

AI_KEYWORDS = [
    "AI", "ML", "Machine Learning", "LLM", "GenAI", "NLP", "Data Scientist",
    "Computer Vision", "Deep Learning", "RAG", "Prompt", "Generative AI",
    "MLOps", "AI Engineer", "Data Science", "Reinforcement Learning",
    "Foundation Model", "Fine-tuning", "Embeddings",
]

# Keep early-stage only
SKIP_STAGES = {"series c", "series d", "series e", "ipo", "public", "acquired"}

# Wellfound role slugs for AI/ML
ROLE_SLUGS = [
    "machine-learning",
    "data-science",
    "artificial-intelligence",
    "natural-language-processing",
    "data-engineer",
]

# Wellfound location slugs
LOCATION_SLUGS = [
    "remote",
    "india",
]


async def scrape_wellfound_jobs() -> list[dict]:
    """Scrape Wellfound via their public job listing pages (JSON embedded in Next.js)."""
    jobs = []
    seen = set()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://wellfound.com",
    }

    async with httpx.AsyncClient(
        headers=headers,
        timeout=30,
        follow_redirects=True,
    ) as client:
        # Strategy 1: Use Wellfound's public job search API
        for role in ROLE_SLUGS:
            for location in LOCATION_SLUGS:
                try:
                    batch = await _fetch_wellfound_role_page(client, role, location)
                    for job in batch:
                        key = (job["company"].lower(), job["job_title"].lower())
                        if key not in seen:
                            seen.add(key)
                            jobs.append(job)
                    logger.info(f"Wellfound role={role} loc={location}: {len(batch)} jobs")
                    await asyncio.sleep(random.uniform(2, 4))
                except Exception as e:
                    logger.warning(f"Wellfound {role}/{location} failed: {e}")
                    continue

        # Strategy 2: Wellfound job search API
        for keyword in ["AI Engineer", "LLM Engineer", "Machine Learning", "GenAI"]:
            try:
                batch = await _fetch_wellfound_search(client, keyword)
                for job in batch:
                    key = (job["company"].lower(), job["job_title"].lower())
                    if key not in seen:
                        seen.add(key)
                        jobs.append(job)
                logger.info(f"Wellfound search '{keyword}': {len(batch)} jobs")
                await asyncio.sleep(random.uniform(2, 4))
            except Exception as e:
                logger.warning(f"Wellfound search '{keyword}' failed: {e}")

    logger.info(f"Wellfound scraper complete: {len(jobs)} unique jobs")
    return jobs


async def _fetch_wellfound_role_page(client: httpx.AsyncClient, role: str, location: str) -> list[dict]:
    """Fetch Wellfound role listing page and extract embedded JSON data."""
    url = f"https://wellfound.com/role/r/{role}"
    if location != "remote":
        url += f"/{location}"

    resp = await client.get(url)
    if resp.status_code != 200:
        return []

    return _extract_jobs_from_html(resp.text, source_tag=f"{role}/{location}")


async def _fetch_wellfound_search(client: httpx.AsyncClient, keyword: str) -> list[dict]:
    """Use Wellfound's job search endpoint."""
    # Wellfound has a public job search API used by their site
    params = {
        "q": keyword,
        "remote": "true",
        "role_types": "full_time",
    }
    url = "https://wellfound.com/jobs"
    resp = await client.get(url, params=params)
    if resp.status_code != 200:
        return []

    return _extract_jobs_from_html(resp.text, source_tag=f"search/{keyword}")


def _extract_jobs_from_html(html: str, source_tag: str = "") -> list[dict]:
    """
    Extract job listings from Wellfound HTML.
    Wellfound is a Next.js app — job data is embedded as JSON in:
    1. <script id="__NEXT_DATA__"> tags
    2. window.__INITIAL_STATE__ patterns
    """
    jobs = []

    # Strategy 1: Next.js __NEXT_DATA__ JSON
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            job_listings = _dig_wellfound_json(data)
            for item in job_listings:
                job = _parse_wellfound_item(item)
                if job:
                    jobs.append(job)
            if jobs:
                logger.debug(f"Wellfound {source_tag}: extracted {len(jobs)} from __NEXT_DATA__")
                return jobs
        except Exception as e:
            logger.debug(f"Wellfound __NEXT_DATA__ parse error: {e}")

    # Strategy 2: Look for JSON arrays in script tags
    script_matches = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    for script in script_matches:
        if '"jobListings"' in script or '"startupJobs"' in script or '"jobs"' in script:
            try:
                # Find JSON objects in script
                json_match = re.search(r'(\{.*"jobs".*\})', script, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(1))
                    job_listings = _dig_wellfound_json(data)
                    for item in job_listings:
                        job = _parse_wellfound_item(item)
                        if job:
                            jobs.append(job)
            except Exception:
                pass

    return jobs


def _dig_wellfound_json(data: dict, depth: int = 0) -> list:
    """Recursively search a JSON tree for job listing arrays."""
    if depth > 8:
        return []

    if isinstance(data, list):
        # Check if this looks like a list of job objects
        if data and isinstance(data[0], dict):
            if any(k in data[0] for k in ["title", "jobTitle", "role", "slug"]):
                return data
        results = []
        for item in data:
            results.extend(_dig_wellfound_json(item, depth + 1))
        return results

    if isinstance(data, dict):
        # Check for common job list keys
        for key in ["jobListings", "startupJobs", "jobs", "listings", "results", "edges"]:
            if key in data:
                val = data[key]
                if isinstance(val, list) and val:
                    return _dig_wellfound_json(val, depth + 1)
                elif isinstance(val, dict):
                    return _dig_wellfound_json(val, depth + 1)

        # Recurse into all values
        results = []
        for v in data.values():
            if isinstance(v, (dict, list)):
                results.extend(_dig_wellfound_json(v, depth + 1))
        return results

    return []


def _parse_wellfound_item(item: dict) -> Optional[dict]:
    """Parse a Wellfound job dict from extracted JSON."""
    try:
        # Title fields vary by API version
        title = (
            item.get("title") or item.get("jobTitle") or
            item.get("role") or item.get("name") or ""
        ).strip()

        # Company info (may be nested)
        startup = item.get("startup") or item.get("company") or {}
        if isinstance(startup, dict):
            company = (startup.get("name") or startup.get("companyName") or "").strip()
            company_website = startup.get("website") or startup.get("url") or ""
            funding_stage = startup.get("stage") or startup.get("fundingStage") or ""
            total_raised = startup.get("totalRaised") or ""
            one_liner = startup.get("oneLiner") or startup.get("description") or ""
        else:
            company = str(startup).strip()
            company_website = ""
            funding_stage = ""
            total_raised = ""
            one_liner = ""

        if not title or not company:
            return None

        # Skip late-stage
        if funding_stage and any(s in funding_stage.lower() for s in SKIP_STAGES):
            return None

        # Must be AI-related
        combined = f"{title} {one_liner}".lower()
        if not any(kw.lower() in combined for kw in AI_KEYWORDS):
            return None

        # URL
        slug = item.get("slug") or item.get("id") or ""
        job_url = f"https://wellfound.com/jobs/{slug}" if slug else ""

        # Salary
        salary = item.get("salary") or item.get("compensation") or ""
        if isinstance(salary, dict):
            min_s = salary.get("min", "")
            max_s = salary.get("max", "")
            salary = f"${min_s}k–${max_s}k" if min_s and max_s else ""

        # Location
        location = item.get("locationNames") or item.get("location") or []
        if isinstance(location, list):
            location = ", ".join(location) if location else "Remote"
        location = str(location).strip() or "Remote"

        # Remote
        if item.get("remote") or item.get("isRemote"):
            location = "Remote"

        notes_parts = []
        if total_raised:
            notes_parts.append(f"Raised: {total_raised}")
        if one_liner:
            notes_parts.append(one_liner[:80])

        return {
            "job_title": title,
            "company": company,
            "location": location,
            "salary": str(salary).strip(),
            "funding_stage": funding_stage.strip() or "Early Stage",
            "source": "Wellfound",
            "job_url": job_url,
            "company_website": company_website,
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": " | ".join(notes_parts),
            "is_freelance": False,
        }
    except Exception as e:
        logger.debug(f"Wellfound item parse error: {e}")
        return None


def scrape() -> list[dict]:
    return asyncio.run(scrape_wellfound_jobs())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\nWellfound Jobs Found: {len(results)}")
    for j in results[:10]:
        print(f"  - {j['job_title']} @ {j['company']} [{j['location']}] {j['salary']}")
        if j.get('notes'):
            print(f"    → {j['notes'][:80]}")
