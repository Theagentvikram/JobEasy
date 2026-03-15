"""
JobSpy scraper - 100% FREE, no API keys needed.
Scrapes: LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs.

Already used in JobEasy! Just wrapping it for AutoApply's pipeline.
"""
import asyncio
from typing import List
from datetime import datetime, timedelta

from autoapply.utils.logger import logger
from autoapply.utils.settings import settings
from .base import BaseScraper, JobListing


class JobSpyScraper(BaseScraper):
    """
    Wraps python-jobspy for multi-platform job scraping.
    No API keys, no cost, no rate limits (within reason).
    """

    def __init__(self):
        super().__init__()
        self.name = "jobspy"

    async def search(self, titles: List[str], locations: List[str],
                     hours_old: int = 24, results_per_search: int = 30,
                     **kwargs) -> List[JobListing]:
        """
        Search jobs across all platforms using JobSpy.
        Runs synchronously in thread pool to avoid blocking.
        """
        jobs = []
        for title in titles:
            for location in locations:
                found = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._scrape_sync,
                    title, location, hours_old, results_per_search
                )
                jobs.extend(found)
                # Small delay between searches to be respectful
                await asyncio.sleep(2)

        # Deduplicate by URL
        seen = set()
        unique = []
        for job in jobs:
            if job.url not in seen:
                seen.add(job.url)
                unique.append(job)

        logger.info(f"[JobSpy] Found {len(unique)} unique jobs")
        return unique

    def _scrape_sync(self, title: str, location: str,
                     hours_old: int, results: int) -> List[JobListing]:
        """Synchronous jobspy call (runs in thread executor)."""
        try:
            from jobspy import scrape_jobs
            logger.info(f"[JobSpy] Searching '{title}' in '{location}'...")

            df = scrape_jobs(
                site_name=["linkedin", "indeed", "glassdoor", "zip_recruiter"],
                search_term=title,
                location=location,
                results_wanted=results,
                hours_old=hours_old,
                country_indeed="USA",
                linkedin_fetch_description=True,   # Get full job description
                verbose=0,
            )

            if df is None or df.empty:
                return []

            jobs = []
            for _, row in df.iterrows():
                job = self._row_to_job(row)
                if job:
                    jobs.append(job)

            logger.info(f"[JobSpy] '{title}' in '{location}': {len(jobs)} jobs")
            return jobs

        except Exception as e:
            logger.error(f"[JobSpy] Error for '{title}' in '{location}': {e}")
            return []

    def _row_to_job(self, row) -> JobListing | None:
        """Convert a JobSpy DataFrame row to a JobListing."""
        try:
            title = str(row.get("title", "") or "").strip()
            company = str(row.get("company", "") or "").strip()
            url = str(row.get("job_url", "") or "").strip()

            if not title or not company or not url:
                return None

            # Parse salary
            sal_min = self._safe_int(row.get("min_amount"))
            sal_max = self._safe_int(row.get("max_amount"))
            # Normalize hourly → annual
            interval = str(row.get("interval", "") or "").lower()
            if interval == "hourly":
                sal_min = int(sal_min * 2080) if sal_min else None
                sal_max = int(sal_max * 2080) if sal_max else None

            # Location
            location = str(row.get("location", "") or "").strip()
            is_remote = (
                row.get("is_remote", False) or
                "remote" in location.lower() or
                "remote" in title.lower()
            )

            # Description
            description = str(row.get("description", "") or "").strip()

            # Source site
            site = str(row.get("site", "") or "").lower()

            # External ID: use job_url_direct or job_id if available
            ext_id = str(row.get("id", url[-30:])).strip()
            ext_id = f"{site}_{ext_id}"

            # Apply URL
            apply_url = str(row.get("job_url_direct", url) or url).strip()

            # Posted date
            posted_at = None
            date_posted = row.get("date_posted")
            if date_posted:
                try:
                    posted_at = datetime.combine(date_posted, datetime.min.time())
                except Exception:
                    pass

            return JobListing(
                external_id=ext_id,
                source=site or "jobspy",
                url=url,
                apply_url=apply_url,
                title=title,
                company=company,
                company_domain=str(row.get("company_url", "") or "").strip(),
                location=location,
                is_remote=bool(is_remote),
                employment_type=str(row.get("job_type", "fulltime") or "fulltime").lower(),
                salary_min=sal_min,
                salary_max=sal_max,
                description=description,
                requirements=[],
                benefits=[],
                posted_at=posted_at,
            )
        except Exception as e:
            logger.debug(f"[JobSpy] Row parse error: {e}")
            return None

    def _safe_int(self, val) -> int | None:
        try:
            return int(float(val)) if val and str(val) not in ("nan", "None", "") else None
        except Exception:
            return None
