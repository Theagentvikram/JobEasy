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
                     disabled_sources: set = None, **kwargs) -> List[JobListing]:
        """
        Search jobs across all platforms using JobSpy.
        Runs synchronously in thread pool to avoid blocking.
        disabled_sources: set of source names to skip (e.g. {'glassdoor'})
        """
        jobs = []
        for title in titles:
            for location in locations:
                found = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda t=title, l=location: self._scrape_sync(
                        t, l, hours_old, results_per_search,
                        disabled_sources or set()
                    )
                )
                jobs.extend(found)
                # Small delay between title/location combos only
                if len(titles) * len(locations) > 1:
                    await asyncio.sleep(0.5)

        # Deduplicate by URL
        seen = set()
        unique = []
        for job in jobs:
            if job.url not in seen:
                seen.add(job.url)
                unique.append(job)

        logger.info(f"[JobSpy] Found {len(unique)} unique jobs")
        return unique

    @staticmethod
    def _normalize_location(location: str) -> str:
        """Normalize WFH/remote variants to 'Remote'."""
        loc = location.strip().lower()
        if loc in ("work from home", "wfh", "work-from-home", "remote work"):
            return "Remote"
        return location

    @staticmethod
    def _country_indeed(location: str) -> str:
        """Map location string to jobspy country_indeed value."""
        loc = location.strip().lower()
        mapping = [
            (["south africa", "cape town", "johannesburg", "durban", "pretoria"], "South Africa"),
            (["india", "bengaluru", "bangalore", "hyderabad", "mumbai", "delhi", "chennai", "pune"], "India"),
            (["uk", "united kingdom", "london", "manchester", "birmingham"], "UK"),
            (["canada", "toronto", "vancouver", "montreal"], "Canada"),
            (["australia", "sydney", "melbourne", "brisbane"], "Australia"),
            (["germany", "berlin", "munich", "frankfurt", "hamburg"], "Germany"),
            (["netherlands", "amsterdam"], "Netherlands"),
            (["singapore"], "Singapore"),
            (["uae", "dubai", "abu dhabi"], "UAE"),
            (["new zealand", "auckland"], "New Zealand"),
            (["ireland", "dublin"], "Ireland"),
            (["france", "paris"], "France"),
            (["brazil", "são paulo", "rio"], "Brazil"),
            (["remote"], "USA"),  # remote defaults to USA for widest coverage
        ]
        for keywords, country in mapping:
            if any(k in loc for k in keywords):
                return country
        # Default USA for unrecognized / US cities
        return "USA"

    @staticmethod
    def _sites_for_location(location: str, disabled_sources: set) -> list:
        """Return site list, excluding Glassdoor/ZipRecruiter for non-US/UK/CA locations."""
        loc_lower = location.lower()
        is_us_uk_ca = any(x in loc_lower for x in [
            "united states", "usa", "us", "uk", "united kingdom",
            "canada", "remote",
        ])
        all_sites = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
        sites = []
        for s in all_sites:
            if s in disabled_sources:
                continue
            if s == "glassdoor" and not is_us_uk_ca:
                continue
            if s == "zip_recruiter" and not is_us_uk_ca:
                continue
            sites.append(s)
        return sites or ["linkedin", "indeed"]

    def _scrape_sync(self, title: str, location: str,
                     hours_old: int, results: int,
                     disabled_sources: set = None) -> List[JobListing]:
        """Synchronous jobspy call (runs in thread executor)."""
        try:
            from jobspy import scrape_jobs
            disabled_sources = disabled_sources or set()
            location = self._normalize_location(location)
            sites = self._sites_for_location(location, disabled_sources)
            logger.info(f"[JobSpy] Searching '{title}' in '{location}'...")

            country = self._country_indeed(location)
            logger.info(f"[JobSpy] country_indeed={country} for location='{location}'")
            df = scrape_jobs(
                site_name=sites,
                search_term=title,
                location=location,
                results_wanted=results,
                hours_old=hours_old,
                country_indeed=country,
                linkedin_fetch_description=False,
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
