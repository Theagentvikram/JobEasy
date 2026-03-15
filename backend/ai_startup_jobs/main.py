"""
AI Startup Jobs Pipeline — Main Orchestrator

Runs all scrapers → filters results → writes to Google Sheets.
Supports one-shot and scheduled (every 24h) modes.

Usage:
    python main.py             # Run once
    python main.py --schedule  # Run every 24 hours
    python main.py --csv-only  # Run + export CSV (no Sheets auth needed)
    python main.py --test      # Test with dummy data
"""

import argparse
import asyncio
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import schedule
from dotenv import load_dotenv

# Setup
load_dotenv()
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "scraper.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("main")

# Import pipeline modules
from filter import apply_filters, print_summary
from sheets_writer import write_to_sheets, export_csv


# ──────────────────────────────────────────────
# SCRAPER REGISTRY
# ──────────────────────────────────────────────

def _run_scraper(name: str, scrape_fn) -> list[dict]:
    """Safely run a scraper and return results."""
    logger.info(f"{'─'*40}")
    logger.info(f"▶ Starting scraper: {name}")
    try:
        results = scrape_fn()
        logger.info(f"✓ {name}: {len(results)} jobs collected")
        return results
    except Exception as e:
        logger.error(f"✗ {name} FAILED: {e}", exc_info=True)
        return []


def run_all_scrapers(
    skip_linkedin: bool = False,
    skip_freelance: bool = False,
) -> list[dict]:
    """
    Run all scrapers in sequence (fail-safe — one failure won't stop others).
    Returns combined raw job list.
    """
    all_jobs: list[dict] = []

    # ── YCombinator ────────────────────────────
    try:
        from scrapers.yc_scraper import scrape as yc_scrape
        jobs = _run_scraper("YCombinator", yc_scrape)
        all_jobs.extend(jobs)
    except ImportError as e:
        logger.warning(f"YC scraper import error: {e}")

    # ── Wellfound ──────────────────────────────
    try:
        from scrapers.wellfound_scraper import scrape as wellfound_scrape
        jobs = _run_scraper("Wellfound", wellfound_scrape)
        all_jobs.extend(jobs)
    except ImportError as e:
        logger.warning(f"Wellfound scraper import error: {e}")

    # ── Naukri ─────────────────────────────────
    try:
        from scrapers.naukri_scraper import scrape as naukri_scrape
        jobs = _run_scraper("Naukri", naukri_scrape)
        all_jobs.extend(jobs)
    except ImportError as e:
        logger.warning(f"Naukri scraper import error: {e}")

    # ── LinkedIn (Apify) ───────────────────────
    if not skip_linkedin:
        try:
            from scrapers.linkedin_scraper import scrape as linkedin_scrape
            jobs = _run_scraper("LinkedIn (Apify)", linkedin_scrape)
            all_jobs.extend(jobs)
        except ImportError as e:
            logger.warning(f"LinkedIn scraper import error: {e}")
    else:
        logger.info("LinkedIn scraper: SKIPPED")

    # ── ProductHunt + Crunchbase ───────────────
    try:
        from scrapers.producthunt_scraper import scrape as ph_scrape
        jobs = _run_scraper("ProductHunt + Crunchbase", ph_scrape)
        all_jobs.extend(jobs)
    except ImportError as e:
        logger.warning(f"ProductHunt scraper import error: {e}")

    # ── Freelance (Upwork / Toptal / Contra / Gun.io) ──
    if not skip_freelance:
        try:
            from scrapers.freelance_scraper import scrape as freelance_scrape
            jobs = _run_scraper("Freelance (Upwork+Toptal+Contra+Gun.io)", freelance_scrape)
            all_jobs.extend(jobs)
        except ImportError as e:
            logger.warning(f"Freelance scraper import error: {e}")
    else:
        logger.info("Freelance scrapers: SKIPPED")

    return all_jobs


# ──────────────────────────────────────────────
# MAIN PIPELINE
# ──────────────────────────────────────────────

def run_pipeline(csv_only: bool = False, test_mode: bool = False) -> pd.DataFrame:
    """
    Full pipeline:
      1. Run all scrapers
      2. Apply filters + deduplication
      3. Push to Google Sheets (or CSV)
    """
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("  AI STARTUP JOBS PIPELINE STARTING")
    logger.info(f"  {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)

    if test_mode:
        logger.info("Running in TEST MODE with dummy data...")
        raw_jobs = _generate_test_data()
    else:
        # Step 1: Run all scrapers
        raw_jobs = run_all_scrapers()

    # Source breakdown before filter
    logger.info(f"\n{'─'*40}")
    logger.info("RAW JOBS COLLECTED:")
    source_counts: dict[str, int] = {}
    for job in raw_jobs:
        src = job.get("source", "Unknown")
        source_counts[src] = source_counts.get(src, 0) + 1
    for src, cnt in sorted(source_counts.items()):
        logger.info(f"  {src:<25} {cnt:>4}")
    logger.info(f"  {'TOTAL':<25} {len(raw_jobs):>4}")

    # Step 2: Filter
    logger.info(f"\n{'─'*40}")
    logger.info("Applying filters...")
    filtered_df = apply_filters(raw_jobs)

    # Print summary
    print_summary(filtered_df)

    if filtered_df.empty:
        logger.warning("No jobs passed filters. Check scraper output or filter rules.")
        return filtered_df

    # Step 3: Export
    csv_path = "jobs_output.csv"
    export_csv(filtered_df, csv_path)

    if not csv_only:
        sheet_id = os.getenv("GOOGLE_SHEET_ID", "")
        if sheet_id:
            write_to_sheets(filtered_df, sheet_id)
        else:
            logger.warning(
                "GOOGLE_SHEET_ID not in .env — skipping Sheets. "
                f"Data saved to {csv_path}"
            )
            print(f"\n💾 Jobs saved to: {csv_path}")
    else:
        logger.info(f"CSV-only mode: saved to {csv_path}")
        print(f"\n💾 Jobs saved to: {csv_path}")

    # Final summary
    elapsed = (datetime.now() - start_time).seconds
    freelance_count = (filtered_df["Is Freelance"] == "Yes").sum()
    startup_count = len(filtered_df) - freelance_count

    print(f"\n{'='*60}")
    print(f"  ✅ Pipeline complete in {elapsed}s")
    print(f"  📊 {len(filtered_df)} total jobs written")
    print(f"     → {startup_count} startup jobs (Remote/Hyderabad)")
    print(f"     → {freelance_count} freelance/contract (International)")
    print(f"{'='*60}\n")

    logger.info(f"Pipeline completed in {elapsed}s")
    return filtered_df


def _generate_test_data() -> list[dict]:
    """Generate dummy data for testing the pipeline."""
    from datetime import datetime as dt
    today = dt.now().strftime("%Y-%m-%d")

    return [
        # Startup jobs
        {"job_title": "AI Engineer", "company": "Zuvo AI", "location": "Hyderabad",
         "salary": "25-40 LPA", "funding_stage": "Series A", "source": "Naukri",
         "job_url": "https://naukri.com/test1", "company_website": "https://zuvo.ai",
         "date_scraped": today, "notes": "Exp: 2-5 yrs", "is_freelance": False},

        {"job_title": "ML Engineer", "company": "NeuroStack", "location": "Remote",
         "salary": "30-50 LPA", "funding_stage": "Seed", "source": "YCombinator",
         "job_url": "https://workatastartup.com/test2", "company_website": "",
         "date_scraped": today, "notes": "W24", "is_freelance": False},

        {"job_title": "LLM Engineer", "company": "Vectara India", "location": "Hyderabad",
         "salary": "35-55 LPA", "funding_stage": "Series B", "source": "Wellfound",
         "job_url": "https://wellfound.com/test3", "company_website": "https://vectara.com",
         "date_scraped": today, "notes": "", "is_freelance": False},

        # Should be BLOCKED (TCS)
        {"job_title": "AI Developer", "company": "TCS", "location": "Hyderabad",
         "salary": "15 LPA", "funding_stage": "", "source": "Naukri",
         "job_url": "https://naukri.com/test4", "company_website": "",
         "date_scraped": today, "notes": "", "is_freelance": False},

        # International freelance
        {"job_title": "AI Consultant", "company": "US AI Startup", "location": "Remote (US)",
         "salary": "$90/hr", "funding_stage": "N/A", "source": "Upwork",
         "job_url": "https://upwork.com/test5", "company_website": "",
         "date_scraped": today, "notes": "Freelance", "is_freelance": True},

        {"job_title": "Machine Learning Engineer (Contract)", "company": "German FinTech",
         "location": "Remote (Germany)", "salary": "€80/hr",
         "funding_stage": "Series A", "source": "LinkedIn",
         "job_url": "https://linkedin.com/jobs/test6", "company_website": "",
         "date_scraped": today, "notes": "Freelance | Contract", "is_freelance": True},

        {"job_title": "Generative AI Developer", "company": "Dubai AI Lab",
         "location": "Remote (Dubai)", "salary": "$75/hr",
         "funding_stage": "Seed", "source": "Toptal",
         "job_url": "https://toptal.com/test7", "company_website": "",
         "date_scraped": today, "notes": "Freelance", "is_freelance": True},

        # ProductHunt discovery
        {"job_title": "[Company Discovery] Krutrim AI", "company": "Krutrim AI",
         "location": "Remote (Global)", "salary": "",
         "funding_stage": "Early Stage", "source": "ProductHunt",
         "job_url": "https://producthunt.com/test8", "company_website": "https://krutrim.com",
         "date_scraped": today, "notes": "AI company discovery", "is_freelance": False},
    ]


# ──────────────────────────────────────────────
# CLI ENTRY POINT
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="AI Startup Jobs Pipeline — scrape, filter, push to Google Sheets"
    )
    parser.add_argument(
        "--schedule", action="store_true",
        help="Run the pipeline every 24 hours automatically"
    )
    parser.add_argument(
        "--csv-only", action="store_true",
        help="Export to CSV only (skip Google Sheets)"
    )
    parser.add_argument(
        "--test", action="store_true",
        help="Run with dummy test data (no real scraping)"
    )
    parser.add_argument(
        "--interval-hours", type=int, default=24,
        help="Schedule interval in hours (default: 24)"
    )
    args = parser.parse_args()

    if args.schedule:
        interval = args.interval_hours
        logger.info(f"Scheduler mode: running every {interval} hours")
        print(f"⏰ Scheduler started. Running every {interval} hours.")
        print("   Press Ctrl+C to stop.\n")

        # Run immediately on start
        run_pipeline(csv_only=args.csv_only, test_mode=args.test)

        # Then schedule
        schedule.every(interval).hours.do(
            run_pipeline, csv_only=args.csv_only, test_mode=args.test
        )

        while True:
            schedule.run_pending()
            time.sleep(60)

    else:
        run_pipeline(csv_only=args.csv_only, test_mode=args.test)


if __name__ == "__main__":
    main()
