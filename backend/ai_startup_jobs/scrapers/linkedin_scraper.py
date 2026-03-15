"""
LinkedIn Jobs Scraper via Apify
Uses the Apify LinkedIn Jobs actor (free tier: ~$5/month compute).
Actor: bebity/linkedin-jobs-scraper
Sign up: https://apify.com

Also handles international freelance/contract roles.
"""

import logging
import os
import time
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")

# Actor options (try in order if one fails)
ACTOR_OPTIONS = [
    "bebity/linkedin-jobs-scraper",
    "curious_coder/linkedin-jobs-scraper",
    "anchor/linkedin-jobs-search",
]

# Startup size signals (keep small companies only)
STARTUP_MAX_EMPLOYEES = 500

SEARCH_CONFIGS = [
    # India - Hyderabad
    {
        "keywords": "AI Engineer",
        "location": "Hyderabad, Telangana, India",
        "limit": 50,
        "tag": "hyderabad",
        "is_freelance": False,
    },
    {
        "keywords": "Machine Learning Engineer",
        "location": "Hyderabad, Telangana, India",
        "limit": 50,
        "tag": "hyderabad",
        "is_freelance": False,
    },
    {
        "keywords": "LLM Engineer GenAI",
        "location": "India",
        "limit": 50,
        "tag": "remote_india",
        "is_freelance": False,
    },
    # International freelance / contract roles
    {
        "keywords": "AI Engineer contract remote",
        "location": "United States",
        "limit": 30,
        "tag": "freelance_us",
        "is_freelance": True,
    },
    {
        "keywords": "Machine Learning freelance remote",
        "location": "Germany",
        "limit": 30,
        "tag": "freelance_de",
        "is_freelance": True,
    },
    {
        "keywords": "AI consultant remote",
        "location": "Netherlands",
        "limit": 30,
        "tag": "freelance_nl",
        "is_freelance": True,
    },
    {
        "keywords": "LLM engineer contract",
        "location": "Canada",
        "limit": 30,
        "tag": "freelance_ca",
        "is_freelance": True,
    },
    {
        "keywords": "AI ML engineer remote",
        "location": "Dubai",
        "limit": 30,
        "tag": "freelance_ae",
        "is_freelance": True,
    },
]


def scrape_linkedin_jobs() -> list[dict]:
    """Scrape LinkedIn jobs via Apify actor."""
    if not APIFY_API_TOKEN:
        logger.error(
            "APIFY_API_TOKEN not set in .env file. "
            "Sign up at https://apify.com for a free token."
        )
        return []

    try:
        from apify_client import ApifyClient
    except ImportError:
        logger.error("apify-client not installed. Run: pip install apify-client")
        return []

    client = ApifyClient(APIFY_API_TOKEN)
    all_jobs = []

    # Find working actor
    actor_id = _find_working_actor(client)
    if not actor_id:
        logger.error("No working LinkedIn Apify actor found. Check your token and try again.")
        return []

    for config in SEARCH_CONFIGS:
        try:
            jobs = _run_linkedin_actor(client, actor_id, config)
            all_jobs.extend(jobs)
            logger.info(
                f"LinkedIn [{config['tag']}] '{config['keywords']}': {len(jobs)} jobs"
            )
            time.sleep(2)  # Small delay between runs
        except Exception as e:
            logger.warning(f"LinkedIn actor failed for {config['tag']}: {e}")
            continue

    # Deduplicate
    seen = set()
    unique = []
    for job in all_jobs:
        url = job.get("job_url", "")
        if url and url not in seen:
            seen.add(url)
            unique.append(job)
        elif not url:
            unique.append(job)

    logger.info(f"LinkedIn scraper complete: {len(unique)} unique jobs")
    return unique


def _find_working_actor(client) -> Optional[str]:
    """Find the first available LinkedIn actor."""
    for actor_id in ACTOR_OPTIONS:
        try:
            actor = client.actor(actor_id)
            info = actor.get()
            if info:
                logger.info(f"Using LinkedIn actor: {actor_id}")
                return actor_id
        except Exception as e:
            logger.debug(f"Actor {actor_id} not available: {e}")
    return None


def _run_linkedin_actor(client, actor_id: str, config: dict) -> list[dict]:
    """Run the Apify actor and parse results."""
    from apify_client import ApifyClient

    run_input = {
        "searchQueries": [config["keywords"]],
        "location": config["location"],
        "publishedAt": "r2592000",  # Past month (30 days in seconds)
        "limit": config.get("limit", 50),
        "proxy": {
            "useApifyProxy": True,
            "apifyProxyGroups": ["RESIDENTIAL"],
        },
    }

    # Some actors use different input schema
    alt_input = {
        "keyword": config["keywords"],
        "locationName": config["location"],
        "datePosted": "Past month",
        "rows": config.get("limit", 50),
    }

    jobs = []
    try:
        run = client.actor(actor_id).call(run_input=run_input, timeout_secs=120)
    except Exception:
        try:
            run = client.actor(actor_id).call(run_input=alt_input, timeout_secs=120)
        except Exception as e:
            raise e

    # Fetch results
    items = client.dataset(run["defaultDatasetId"]).iterate_items()

    for item in items:
        job = _normalize_linkedin_item(item, config)
        if job:
            jobs.append(job)

    return jobs


def _normalize_linkedin_item(item: dict, config: dict) -> Optional[dict]:
    """Normalize a LinkedIn job item from Apify."""
    try:
        title = (
            item.get("title") or
            item.get("jobTitle") or
            item.get("name") or ""
        ).strip()

        company = (
            item.get("company") or
            item.get("companyName") or
            item.get("employer") or ""
        ).strip()

        location = (
            item.get("location") or
            item.get("jobLocation") or
            config.get("location", "") or ""
        ).strip()

        job_url = (
            item.get("jobUrl") or
            item.get("url") or
            item.get("applyUrl") or ""
        )

        posted_date = (
            item.get("postedAt") or
            item.get("publishedAt") or
            item.get("datePosted") or ""
        )

        company_size = (
            item.get("companySize") or
            item.get("employeeCount") or ""
        )

        salary = (
            item.get("salary") or
            item.get("salaryRange") or
            item.get("compensation") or ""
        )

        applicants = str(item.get("applicantsCount") or item.get("applicantCount") or "")

        # Filter out large companies
        size_str = str(company_size).lower()
        is_startup = True
        if company_size:
            # Parse employee count
            nums = [int(x) for x in size_str.replace(",", "").split() if x.isdigit()]
            if nums and max(nums) > STARTUP_MAX_EMPLOYEES:
                is_startup = False

        if not is_startup:
            return None

        if not title:
            return None

        notes_parts = []
        if applicants:
            notes_parts.append(f"Applicants: {applicants}")
        if posted_date:
            notes_parts.append(f"Posted: {posted_date}")
        if config.get("is_freelance"):
            notes_parts.append("Freelance/Contract")
        if company_size:
            notes_parts.append(f"Size: {company_size}")

        return {
            "job_title": title,
            "company": company,
            "location": location,
            "salary": str(salary).strip(),
            "funding_stage": "",
            "source": "LinkedIn",
            "job_url": str(job_url),
            "company_website": str(item.get("companyUrl") or ""),
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": " | ".join(notes_parts),
            "is_freelance": config.get("is_freelance", False),
        }
    except Exception as e:
        logger.debug(f"Normalize LinkedIn item error: {e}")
        return None


def scrape() -> list[dict]:
    return scrape_linkedin_jobs()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\nLinkedIn Jobs Found: {len(results)}")
    for j in results[:5]:
        fl = " [FREELANCE]" if j.get("is_freelance") else ""
        print(f"  - {j['job_title']} @ {j['company']} | {j['location']}{fl}")
