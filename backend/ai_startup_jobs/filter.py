"""
Filter Engine for AI Startup Jobs Pipeline

Applies the following rules to all scraped job records:
  1. Job title must contain AI/ML-related keywords
  2. Location must be Remote, Hyderabad, WFH, or Anywhere
     OR is a freelance role from a target country
  3. Company must NOT be in the blocklist (large IT/non-startups)
  4. Deduplicates by (company, job_title) — merges sources
  5. Outputs a clean pandas DataFrame
"""

import logging
import re
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# KEYWORD LISTS
# ──────────────────────────────────────────────

AI_TITLE_KEYWORDS = [
    "AI", "ML", "Machine Learning", "LLM", "GenAI", "NLP",
    "Data Scientist", "Computer Vision", "Deep Learning", "RAG",
    "Prompt", "Generative AI", "MLOps", "AI Engineer", "Data Science",
    "Reinforcement Learning", "Foundation Model", "Fine-tuning",
    "Embeddings", "Langchain", "Vector", "Huggingface", "OpenAI",
    "Diffusion", "Transformer", "BERT", "GPT", "Neural Network",
    "AI Automation", "AI Developer", "AI Researcher", "AI Product",
    "AI Consultant", "AI Architect", "AI Infrastructure",
]

TARGET_LOCATIONS = [
    "remote", "hyderabad", "work from home", "wfh", "anywhere",
    "india", "telangana", "secunderabad",
    # International freelance
    "united states", "usa", "us", "canada", "germany", "netherlands",
    "dubai", "uae", "united arab emirates", "global",
]

# Companies to ALWAYS exclude
COMPANY_BLOCKLIST = {
    # Large Indian IT
    "tcs", "tata consultancy", "infosys", "wipro", "hcl", "hcltech",
    "accenture", "capgemini", "ibm", "cognizant", "tech mahindra",
    "mphasis", "hexaware", "persistent systems", "mindtree",
    "ltimindtree", "l&t infotech", "niit technologies", "birlasoft",
    "cyient", "mastech", "igate", "patni", "genpact", "wns",
    "concentrix", "sutherland", "firstsource", "mflex", "zensar",
    "oracle financial", "syntel", "igate mastech",

    # Big Tech
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "salesforce", "oracle", "sap", "adobe", "vmware", "nvidia",
    "intel", "amd", "qualcomm",

    # Large Indian consumer tech
    "flipkart", "swiggy", "zomato", "paytm", "byju", "byjus",
    "unacademy", "ola", "myntra", "nykaa", "meesho", "phonepe",
    "razorpay", "freshworks", "zoho", "browserstack",

    # Consulting / Big 4
    "deloitte", "pwc", "kpmg", "ernst & young", "ey", "bain",
    "mckinsey", "bcg", "boston consulting",

    # Other large companies
    "airtel", "jio", "reliance", "hdfc", "icici", "sbi", "axis bank",
    "bajaj", "mahindra", "tata motors", "tata steel", "infra.market",
}

# Freelance source labels (skip location filter for these)
FREELANCE_SOURCES = {"Upwork", "Toptal", "Gun.io", "Contra", "Wellfound"}

# Discovery records (not actual jobs — keep but mark separately)
DISCOVERY_SOURCES = {"ProductHunt", "Crunchbase"}

# Output column order
OUTPUT_COLUMNS = [
    "Job Title",
    "Company",
    "Location",
    "Salary",
    "Funding Stage",
    "Source",
    "Job URL",
    "Company Website",
    "Date Scraped",
    "Is Freelance",
    "Notes",
    "Status",  # For manual tracking: Applied / Interview / Rejected / Saved
]

# Source → color mapping (for Google Sheets)
SOURCE_COLORS = {
    "YCombinator":  (255, 235, 156),   # Yellow
    "Wellfound":    (173, 216, 230),   # Blue
    "LinkedIn":     (144, 238, 144),   # Green
    "Naukri":       (255, 200, 150),   # Orange
    "ProductHunt":  (230, 230, 250),   # Lavender
    "Crunchbase":   (220, 220, 220),   # Gray
    "Upwork":       (255, 182, 193),   # Pink
    "Toptal":       (152, 251, 152),   # Pale Green
    "Gun.io":       (255, 240, 200),   # Peach
    "Contra":       (200, 230, 255),   # Sky Blue
}


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def _is_ai_title(title: str, notes: str = "") -> bool:
    combined = f"{title} {notes}".lower()
    return any(kw.lower() in combined for kw in AI_TITLE_KEYWORDS)


def _is_target_location(location: str, is_freelance: bool = False) -> bool:
    if is_freelance:
        return True  # Freelance roles are always remote/global
    loc_lower = location.lower()
    return any(kw in loc_lower for kw in TARGET_LOCATIONS)


def _is_blocked_company(company: str) -> bool:
    company_lower = company.lower().strip()
    # Check exact and partial matches
    for blocked in COMPANY_BLOCKLIST:
        if blocked in company_lower:
            return True
    return False


def _normalize_location(location: str, is_freelance: bool) -> str:
    """Standardize location labels."""
    loc = location.lower().strip()
    if is_freelance:
        # Extract country for freelance roles
        for country_key, label in [
            ("united states", "Remote (US Client)"),
            ("usa", "Remote (US Client)"),
            (" us ", "Remote (US Client)"),
            ("canada", "Remote (Canada Client)"),
            ("germany", "Remote (Germany Client)"),
            ("netherlands", "Remote (Netherlands Client)"),
            ("dubai", "Remote (Dubai/UAE Client)"),
            ("uae", "Remote (Dubai/UAE Client)"),
            ("global", "Remote (Global)"),
        ]:
            if country_key in loc:
                return label
        return "Remote (International)"

    if any(x in loc for x in ["remote", "wfh", "work from home", "anywhere"]):
        return "Remote"
    if any(x in loc for x in ["hyderabad", "secunderabad", "telangana"]):
        return "Hyderabad"
    return location.title()


def _parse_salary_display(salary: str, location_normalized: str) -> str:
    """Clean and normalize salary display."""
    if not salary or salary.strip() in ["Not Disclosed", "N/A", ""]:
        return "Not Disclosed"
    # Truncate long salary strings
    return salary.strip()[:60]


# ──────────────────────────────────────────────
# MAIN FILTER
# ──────────────────────────────────────────────

def apply_filters(raw_jobs: list[dict]) -> pd.DataFrame:
    """
    Apply all filters and deduplication to raw job records.
    Returns a clean pandas DataFrame ready for Google Sheets.
    """
    if not raw_jobs:
        logger.warning("No jobs to filter!")
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    logger.info(f"Filtering {len(raw_jobs)} raw job records...")

    kept = []
    stats = {
        "total": len(raw_jobs),
        "blocked_company": 0,
        "bad_location": 0,
        "not_ai_title": 0,
        "discovery_records": 0,
        "kept": 0,
    }

    for job in raw_jobs:
        title = str(job.get("job_title", "")).strip()
        company = str(job.get("company", "")).strip()
        location = str(job.get("location", "")).strip()
        source = str(job.get("source", "")).strip()
        is_freelance = bool(job.get("is_freelance", False))

        # Mark discovery records separately (ProductHunt/Crunchbase)
        if source in DISCOVERY_SOURCES:
            stats["discovery_records"] += 1
            # Still include them but tag them
            job["_keep"] = True
            job["_reason"] = "company_discovery"
            kept.append(job)
            continue

        # Rule 1: Must be AI-related title or company description (notes)
        notes = str(job.get("notes", ""))
        if not _is_ai_title(title, notes):
            stats["not_ai_title"] += 1
            logger.debug(f"SKIP (not AI): {title} @ {company}")
            continue

        # Rule 2: Location must be target (skip for freelance)
        if not _is_target_location(location, is_freelance or source in FREELANCE_SOURCES):
            stats["bad_location"] += 1
            logger.debug(f"SKIP (location): {title} @ {company} [{location}]")
            continue

        # Rule 3: Company must not be in blocklist
        if _is_blocked_company(company):
            stats["blocked_company"] += 1
            logger.debug(f"SKIP (blocked): {company}")
            continue

        job["_keep"] = True
        kept.append(job)
        stats["kept"] += 1

    logger.info(
        f"Filter results: {stats['kept']} kept | "
        f"{stats['blocked_company']} blocked | "
        f"{stats['bad_location']} wrong location | "
        f"{stats['not_ai_title']} not AI | "
        f"{stats['discovery_records']} discovery records"
    )

    if not kept:
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    # ── DEDUPLICATION ────────────────────────────────
    # Group by (company_normalized, title_normalized) → merge sources
    dedup_map: dict[tuple, dict] = {}

    for job in kept:
        company = str(job.get("company", "")).strip()
        title = str(job.get("job_title", "")).strip()
        source = str(job.get("source", ""))
        location = str(job.get("location", ""))
        is_freelance = bool(job.get("is_freelance", False))

        key = (
            re.sub(r"\s+", " ", company.lower()),
            re.sub(r"\s+", " ", title.lower()),
        )

        if key in dedup_map:
            # Merge: add source to existing record
            existing = dedup_map[key]
            existing_sources = existing.get("_all_sources", [existing.get("source", "")])
            if source not in existing_sources:
                existing_sources.append(source)
            existing["_all_sources"] = existing_sources
        else:
            job["_all_sources"] = [source]
            dedup_map[key] = dict(job)

    logger.info(
        f"After deduplication: {len(dedup_map)} unique jobs "
        f"(removed {len(kept) - len(dedup_map)} duplicates)"
    )

    # ── BUILD DATAFRAME ──────────────────────────────
    rows = []
    for job in dedup_map.values():
        is_freelance = bool(job.get("is_freelance", False))
        location = str(job.get("location", ""))
        source = str(job.get("source", ""))
        all_sources = job.get("_all_sources", [source])

        location_norm = _normalize_location(location, is_freelance or source in FREELANCE_SOURCES)
        salary_display = _parse_salary_display(
            str(job.get("salary", "")), location_norm
        )

        notes = str(job.get("notes", ""))
        if job.get("_reason") == "company_discovery":
            notes = f"[COMPANY DISCOVERY] {notes}"

        rows.append({
            "Job Title": str(job.get("job_title", "")).strip(),
            "Company": str(job.get("company", "")).strip(),
            "Location": location_norm,
            "Salary": salary_display,
            "Funding Stage": str(job.get("funding_stage", "")).strip() or "Unknown",
            "Source": " + ".join(all_sources) if len(all_sources) > 1 else all_sources[0],
            "Job URL": str(job.get("job_url", "")).strip(),
            "Company Website": str(job.get("company_website", "")).strip(),
            "Date Scraped": str(job.get("date_scraped", "")).strip(),
            "Is Freelance": "Yes" if (is_freelance or source in FREELANCE_SOURCES) else "No",
            "Notes": notes[:200],
            "Status": "",  # Empty — for manual tracking
        })

    df = pd.DataFrame(rows, columns=OUTPUT_COLUMNS)

    # Sort: freelance international first, then remote, then hyderabad
    location_order = {
        "remote (us client)": 0,
        "remote (germany client)": 1,
        "remote (netherlands client)": 2,
        "remote (canada client)": 3,
        "remote (dubai/uae client)": 4,
        "remote (international)": 5,
        "remote (global)": 6,
        "remote": 7,
        "hyderabad": 8,
    }
    df["_sort_key"] = df["Location"].apply(
        lambda x: location_order.get(x.lower(), 99)
    )
    df = df.sort_values("_sort_key").drop(columns=["_sort_key"]).reset_index(drop=True)

    return df


def get_source_color(source: str) -> tuple:
    """Return RGB color tuple for a source label."""
    for src, color in SOURCE_COLORS.items():
        if src.lower() in source.lower():
            return color
    return (255, 255, 255)  # White default


def print_summary(df: pd.DataFrame) -> None:
    """Print a human-readable summary of filtered jobs."""
    if df.empty:
        print("No jobs found after filtering.")
        return

    print("\n" + "=" * 60)
    print(f"  TOTAL JOBS: {len(df)}")
    print("=" * 60)

    print("\nBy Source:")
    for src, count in df["Source"].value_counts().items():
        print(f"  {src:<20} {count:>4} jobs")

    print("\nBy Location:")
    for loc, count in df["Location"].value_counts().items():
        print(f"  {loc:<30} {count:>4} jobs")

    print("\nFreelance vs Full-time:")
    for fl, count in df["Is Freelance"].value_counts().items():
        label = "Freelance/Contract" if fl == "Yes" else "Full-time/Startup"
        print(f"  {label:<25} {count:>4}")

    print("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test with dummy data
    test_jobs = [
        {
            "job_title": "AI Engineer", "company": "TestStartup AI",
            "location": "Hyderabad", "salary": "20-30 LPA",
            "funding_stage": "Series A", "source": "Naukri",
            "job_url": "https://example.com/job1", "company_website": "",
            "date_scraped": "2026-03-15", "notes": "", "is_freelance": False,
        },
        {
            "job_title": "Software Engineer", "company": "TCS",
            "location": "Hyderabad", "salary": "10 LPA",
            "funding_stage": "", "source": "Naukri",
            "job_url": "https://example.com/job2", "company_website": "",
            "date_scraped": "2026-03-15", "notes": "", "is_freelance": False,
        },
        {
            "job_title": "ML Engineer (Contract)", "company": "US AI Startup",
            "location": "Remote (US)", "salary": "$80/hr",
            "funding_stage": "Seed", "source": "Upwork",
            "job_url": "https://example.com/job3", "company_website": "",
            "date_scraped": "2026-03-15", "notes": "", "is_freelance": True,
        },
    ]
    df = apply_filters(test_jobs)
    print_summary(df)
    print("\nSample rows:")
    print(df[["Job Title", "Company", "Location", "Is Freelance"]].to_string())
