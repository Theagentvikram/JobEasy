"""
Startup filter engine — filters scraped jobs for AI roles at funded startups.
Applies location, salary, blocklist, and keyword filters.
Deduplicates across sources.
"""
from typing import List, Optional
from autoapply.utils.logger import logger
from .base import JobListing

# ── AI role keywords (job title must contain at least one) ──
AI_TITLE_KEYWORDS = [
    "ai", "ml", "machine learning", "llm", "genai", "nlp",
    "data scientist", "computer vision", "deep learning", "rag",
    "prompt engineer", "generative ai", "mlops", "ai engineer",
    "artificial intelligence", "neural", "foundation model",
    "data engineer", "applied scientist",
]

# ── Large company blocklist ──
COMPANY_BLOCKLIST = {
    "tcs", "infosys", "wipro", "hcl", "accenture", "capgemini", "ibm",
    "cognizant", "tech mahindra", "mphasis", "hexaware", "mindtree",
    "ltimindtree", "persistent", "zensar", "cyient", "birlasoft",
    "oracle", "sap", "deloitte", "ey", "kpmg", "pwc",
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "flipkart", "swiggy", "zomato", "paytm", "ola", "uber",
    "byju", "unacademy", "vedantu", "whitehat",
    "tata consultancy", "hcl technologies", "wipro technologies",
    "infosys limited", "tech mahindra limited",
}

# ── Accepted locations ──
ACCEPTED_LOCATIONS = [
    "remote", "hyderabad", "bangalore", "bengaluru",
    "work from home", "wfh", "anywhere", "india",
]

# ── Minimum salary for Bangalore (in INR) — 20 LPA ──
BANGALORE_MIN_SALARY = 2000000


def filter_startup_jobs(
    jobs: List[JobListing],
    extra_blocklist: Optional[List[str]] = None,
) -> List[JobListing]:
    """
    Apply startup filter rules:
    1. Job title must contain AI/ML keyword
    2. Location must be Remote/Hyderabad/Bangalore (Bangalore needs >= 20 LPA)
    3. Company must NOT be in blocklist
    4. Deduplicate: same company + same title = keep one, merge sources
    """
    blocklist = COMPANY_BLOCKLIST.copy()
    if extra_blocklist:
        blocklist.update(c.lower().strip() for c in extra_blocklist)

    filtered = []
    for job in jobs:
        # Rule 1: AI keyword in title
        title_lower = job.title.lower()
        desc_lower = (job.description or "").lower()
        has_ai_keyword = any(
            kw in title_lower or kw in desc_lower
            for kw in AI_TITLE_KEYWORDS
        )
        if not has_ai_keyword:
            continue

        # Rule 2: Company blocklist
        company_lower = job.company.lower().strip()
        if any(blocked in company_lower or company_lower in blocked for blocked in blocklist):
            continue

        # Rule 3: Location filter
        location_lower = (job.location or "").lower()
        is_remote = job.is_remote or any(
            loc in location_lower
            for loc in ["remote", "work from home", "wfh", "anywhere"]
        )

        is_hyderabad = "hyderabad" in location_lower
        is_bangalore = "bangalore" in location_lower or "bengaluru" in location_lower

        if not is_remote and not is_hyderabad and not is_bangalore:
            # Check if location is unknown/empty — include these
            if location_lower and "india" not in location_lower:
                continue

        # Rule 4: Bangalore salary filter (20 LPA minimum)
        if is_bangalore and not is_remote:
            if job.salary_max and job.salary_max < BANGALORE_MIN_SALARY:
                continue

        filtered.append(job)

    # Deduplicate: same company + title across sources
    deduped = _deduplicate(filtered)

    logger.info(
        f"[Filter] {len(jobs)} total → {len(filtered)} after filter → {len(deduped)} after dedup"
    )
    return deduped


def _deduplicate(jobs: List[JobListing]) -> List[JobListing]:
    """Deduplicate jobs by company + title. Keep the one with most info."""
    seen = {}
    for job in jobs:
        key = f"{job.company.lower().strip()}_{job.title.lower().strip()}"
        if key in seen:
            existing = seen[key]
            # Keep the one with more data (description, salary, etc.)
            existing_score = _info_score(existing)
            new_score = _info_score(job)
            if new_score > existing_score:
                # Merge source info
                if job.source != existing.source:
                    job.description = f"[Sources: {existing.source}, {job.source}] {job.description}"
                seen[key] = job
            elif job.source != existing.source:
                existing.description = f"[Sources: {existing.source}, {job.source}] {existing.description}"
        else:
            seen[key] = job

    return list(seen.values())


def _info_score(job: JobListing) -> int:
    """Score how much info a job listing has (for dedup preference)."""
    score = 0
    if job.description and len(job.description) > 50:
        score += 3
    if job.salary_min:
        score += 2
    if job.salary_max:
        score += 2
    if job.apply_url:
        score += 1
    if job.company_domain:
        score += 1
    if job.posted_at:
        score += 1
    return score
