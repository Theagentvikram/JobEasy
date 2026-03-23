"""
Country-specific job board scrapers.
Uses public RSS feeds, JSON APIs, and lightweight HTTP scraping.
No API keys required.

Supported platforms:
  South Africa : PNet, CareerJunction
  India        : TimesJobs
  UK           : Reed.co.uk
  Australia    : Jora
  UAE          : Bayt
  Singapore    : MyCareersFuture (gov)
  Canada       : Job Bank (gov)
"""
import asyncio
import hashlib
import re
from typing import List, Optional
from datetime import datetime

import httpx

from autoapply.utils.logger import logger
from .base import BaseScraper, JobListing


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


class LocalBoardsScraper(BaseScraper):
    """
    Scrapes country-specific job boards based on detected location.
    Falls back gracefully — individual platform failures don't break the whole search.
    """

    def __init__(self):
        super().__init__()
        self.name = "local_boards"
        self._client = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=15,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/122.0.0.0 Safari/537.36"
                    ),
                    "Accept-Language": "en-US,en;q=0.9",
                },
                follow_redirects=True,
            )
        return self._client

    async def search(
        self,
        titles: List[str],
        locations: List[str],
        hours_old: int = 48,
        results_per_search: int = 20,
        disabled_sources: Optional[set] = None,
        **kwargs,
    ) -> List[JobListing]:
        """Detect country from locations, then scrape relevant local boards."""
        disabled = disabled_sources or set()
        country = self._detect_country(locations)
        if country == "USA":
            return []  # JobSpy covers US well enough

        scrapers_named = [(name, fn) for name, fn in self._get_scrapers_named(country) if name not in disabled]
        if not scrapers_named:
            return []

        logger.info(f"[LocalBoards] Country={country}, scrapers={[n for n, _ in scrapers_named]}")

        all_jobs: List[JobListing] = []
        for title in titles:
            for location in locations:
                tasks = [
                    self._safe_scrape(fn, title, location, results_per_search)
                    for _, fn in scrapers_named
                ]
                results = await asyncio.gather(*tasks)
                for jobs in results:
                    all_jobs.extend(jobs)
                await asyncio.sleep(1)

        # Deduplicate by URL
        seen: set = set()
        unique = []
        for job in all_jobs:
            if job.url not in seen:
                seen.add(job.url)
                unique.append(job)

        logger.info(f"[LocalBoards] {len(unique)} unique jobs from local boards")
        return unique

    async def _safe_scrape(self, fn, title, location, limit) -> List[JobListing]:
        try:
            return await fn(title, location, limit)
        except Exception as e:
            logger.warning(f"[LocalBoards] {fn.__name__} failed: {e}")
            return []

    # ── Country detection ──────────────────────────────────────────────────────

    _COUNTRY_KEYWORDS = {
        "South Africa": [
            "south africa", "johannesburg", "cape town", "durban", "pretoria",
            "sandton", "bloemfontein", "port elizabeth", "east london", "rustenburg",
        ],
        "India": [
            "india", "bangalore", "bengaluru", "mumbai", "delhi", "pune", "chennai",
            "hyderabad", "noida", "gurgaon", "gurugram", "kolkata", "ahmedabad",
        ],
        "UK": [
            "uk", "united kingdom", "london", "manchester", "birmingham", "edinburgh",
            "leeds", "glasgow", "bristol", "sheffield",
        ],
        "Australia": [
            "australia", "sydney", "melbourne", "brisbane", "perth", "adelaide",
            "gold coast", "canberra",
        ],
        "UAE": [
            "uae", "dubai", "abu dhabi", "sharjah", "ajman",
        ],
        "Singapore": [
            "singapore",
        ],
        "Canada": [
            "canada", "toronto", "vancouver", "montreal", "calgary", "ottawa",
            "edmonton", "winnipeg",
        ],
    }

    def _detect_country(self, locations: List[str]) -> str:
        combined = " ".join(locations).lower()
        for country, keywords in self._COUNTRY_KEYWORDS.items():
            if any(kw in combined for kw in keywords):
                return country
        return "USA"

    def _get_scrapers_named(self, country: str):
        """Returns list of (name, async_fn) tuples for the given country."""
        mapping = {
            "South Africa": [("pnet", self._pnet), ("careerjunction", self._careerjunction)],
            "India": [("timesjobs", self._timesjobs)],
            "UK": [("reed", self._reed)],
            "Australia": [("jora_au", self._jora_au)],
            "UAE": [("bayt", self._bayt)],
            "Singapore": [("mycareersfuture", self._mycareersfuture)],
            "Canada": [("jobbank_ca", self._jobbank_canada)],
        }
        return mapping.get(country, [])

    # ── South Africa ───────────────────────────────────────────────────────────

    async def _pnet(self, title: str, location: str, limit: int) -> List[JobListing]:
        """PNet - South Africa's largest job portal."""
        client = await self._get_client()
        api_url = "https://www.pnet.co.za/api/job/search"
        params = {
            "search": title,
            "location": location,
            "pageSize": min(limit, 20),
        }
        try:
            r = await client.get(api_url, params=params)
            if r.status_code != 200:
                return []
            data = r.json()
            jobs = []
            for item in data.get("ads", [])[:limit]:
                job_url = f"https://www.pnet.co.za/job/{item.get('id', '')}"
                jobs.append(JobListing(
                    external_id=f"pnet_{item.get('id', '')}",
                    source="pnet",
                    url=job_url,
                    apply_url=job_url,
                    title=item.get("jobTitle", ""),
                    company=item.get("company", {}).get("name", ""),
                    location=item.get("location", {}).get("label", location),
                    is_remote="remote" in item.get("jobTitle", "").lower(),
                    employment_type=item.get("jobType", "full-time").lower(),
                    description=item.get("intro", ""),
                ))
            logger.info(f"[PNet] '{title}' → {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.warning(f"[PNet] {e}")
            return []

    async def _careerjunction(self, title: str, location: str, limit: int) -> List[JobListing]:
        """CareerJunction - popular SA job board with RSS feed."""
        client = await self._get_client()
        q = title.replace(" ", "+")
        rss_feed = f"https://www.careerjunction.co.za/jobs/rss/?Keywords={q}"
        try:
            r = await client.get(rss_feed)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="careerjunction", site_base="https://www.careerjunction.co.za")
            logger.info(f"[CareerJunction] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[CareerJunction] {e}")
            return []

    # ── India ──────────────────────────────────────────────────────────────────

    async def _timesjobs(self, title: str, location: str, limit: int) -> List[JobListing]:
        """TimesJobs - Indian job board with RSS search."""
        client = await self._get_client()
        q = title.replace(" ", "%20")
        loc = location.replace(" ", "%20")
        feed_url = f"https://www.timesjobs.com/jobFeed?type=A&searchType=personalizedSearch&from=submit&walkin=true&txtKeywords={q}&txtLocation={loc}"
        try:
            r = await client.get(feed_url)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="timesjobs", site_base="https://www.timesjobs.com")
            logger.info(f"[TimesJobs] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[TimesJobs] {e}")
            return []

    # ── UK ─────────────────────────────────────────────────────────────────────

    async def _reed(self, title: str, location: str, limit: int) -> List[JobListing]:
        """Reed.co.uk - UK's largest job board with public RSS."""
        client = await self._get_client()
        q = title.replace(" ", "+")
        loc = location.replace(" ", "+")
        rss = f"https://www.reed.co.uk/jobs/{q}-jobs-in-{loc}.rss"
        try:
            r = await client.get(rss)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="reed", site_base="https://www.reed.co.uk")
            logger.info(f"[Reed] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[Reed] {e}")
            return []

    # ── Australia ──────────────────────────────────────────────────────────────

    async def _jora_au(self, title: str, location: str, limit: int) -> List[JobListing]:
        """Jora Australia - aggregates from many AU job boards."""
        client = await self._get_client()
        q = title.replace(" ", "+")
        loc = location.replace(" ", "+")
        rss = f"https://au.jora.com/j?q={q}&l={loc}&p=1&sp=browsepage&rss=1"
        try:
            r = await client.get(rss)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="jora_au", site_base="https://au.jora.com")
            logger.info(f"[Jora AU] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[Jora AU] {e}")
            return []

    # ── UAE ────────────────────────────────────────────────────────────────────

    async def _bayt(self, title: str, location: str, limit: int) -> List[JobListing]:
        """Bayt.com - Middle East's largest job board with RSS."""
        client = await self._get_client()
        q = title.replace(" ", "-").lower()
        rss = f"https://www.bayt.com/en/uae/jobs/{q}-jobs/?rss=1"
        try:
            r = await client.get(rss)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="bayt", site_base="https://www.bayt.com")
            logger.info(f"[Bayt] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[Bayt] {e}")
            return []

    # ── Singapore ──────────────────────────────────────────────────────────────

    async def _mycareersfuture(self, title: str, location: str, limit: int) -> List[JobListing]:
        """MyCareersFuture - Singapore government official job portal with public API."""
        client = await self._get_client()
        api_url = "https://api.mycareersfuture.gov.sg/v2/jobs/search"
        params = {"search": title, "limit": min(limit, 20), "page": 0}
        try:
            r = await client.get(api_url, params=params)
            if r.status_code != 200:
                return []
            data = r.json()
            jobs = []
            for item in data.get("results", [])[:limit]:
                job_url = f"https://www.mycareersfuture.gov.sg/job/{item.get('uuid', '')}"
                jobs.append(JobListing(
                    external_id=f"mcf_{item.get('uuid', '')}",
                    source="mycareersfuture",
                    url=job_url,
                    apply_url=job_url,
                    title=item.get("title", ""),
                    company=item.get("postedCompany", {}).get("name", ""),
                    location="Singapore",
                    is_remote=item.get("metadata", {}).get("isRemote", False),
                    employment_type=(item.get("employmentTypes") or ["full-time"])[0].lower(),
                    description=item.get("description", ""),
                    salary_min=item.get("salary", {}).get("minimum"),
                    salary_max=item.get("salary", {}).get("maximum"),
                ))
            logger.info(f"[MyCareersFuture] '{title}' → {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.warning(f"[MyCareersFuture] {e}")
            return []

    # ── Canada ─────────────────────────────────────────────────────────────────

    async def _jobbank_canada(self, title: str, location: str, limit: int) -> List[JobListing]:
        """Canada Job Bank - official government job board with public RSS."""
        client = await self._get_client()
        q = title.replace(" ", "+")
        loc = location.replace(" ", "+")
        rss_url = f"https://www.jobbank.gc.ca/jobsearch/rss?searchstring={q}&locationstring={loc}&fsrc=16"
        try:
            r = await client.get(rss_url)
            if r.status_code != 200:
                return []
            jobs = self._parse_rss(r.text, source="jobbank_ca", site_base="https://www.jobbank.gc.ca")
            logger.info(f"[JobBank CA] '{title}' → {len(jobs[:limit])} jobs")
            return jobs[:limit]
        except Exception as e:
            logger.warning(f"[JobBank CA] {e}")
            return []

    # ── RSS parser ─────────────────────────────────────────────────────────────

    def _parse_rss(self, xml: str, source: str, site_base: str) -> List[JobListing]:
        """Generic RSS/Atom feed parser for job boards."""
        import xml.etree.ElementTree as ET
        jobs = []
        try:
            root = ET.fromstring(xml)
            items = root.findall(".//item")
            for item in items:
                title = (item.findtext("title") or "").strip()
                url = (item.findtext("link") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub_date_str = (item.findtext("pubDate") or "").strip()
                company = ""

                if not title or not url:
                    continue

                creator_el = item.find("{http://purl.org/dc/elements/1.1/}creator")
                if creator_el is not None:
                    company = (creator_el.text or "").strip()

                posted_at = None
                try:
                    from email.utils import parsedate_to_datetime
                    posted_at = parsedate_to_datetime(pub_date_str) if pub_date_str else None
                except Exception:
                    pass

                uid = hashlib.md5(url.encode()).hexdigest()[:12]
                jobs.append(JobListing(
                    external_id=f"{source}_{uid}",
                    source=source,
                    url=url,
                    apply_url=url,
                    title=title,
                    company=company,
                    location="",
                    description=re.sub(r"<[^>]+>", " ", desc)[:500],
                    posted_at=posted_at,
                ))
        except ET.ParseError as e:
            logger.debug(f"[RSS parser] {source}: {e}")
        return jobs
