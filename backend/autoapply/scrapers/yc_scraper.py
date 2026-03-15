"""
YC Work at a Startup scraper — jobs from Y Combinator startups.
Uses httpx to hit the WAAS API (public, no auth needed).
Filters for recent batches (2022+) and AI/ML roles.
"""
import asyncio
import re
from typing import List, Optional
from datetime import datetime

import httpx
from autoapply.utils.logger import logger
from .base import BaseScraper, JobListing

# YC WAAS API (public)
WAAS_API = "https://www.workatastartup.com/api"

AI_KEYWORDS = [
    "ai", "ml", "machine learning", "llm", "genai", "nlp",
    "data scientist", "computer vision", "deep learning", "rag",
    "prompt", "generative ai", "mlops", "ai engineer",
    "artificial intelligence", "neural", "gpt", "transformer",
    "foundation model", "large language", "diffusion",
]

# YC batches from 2022 onwards (recently funded)
RECENT_BATCHES = {
    "W22", "S22", "W23", "S23", "W24", "S24", "W25", "S25", "W26", "S26",
    "F22", "F23", "F24", "F25",  # Fellowship batches
}


class YCScraper(BaseScraper):
    """Scrape AI jobs from YC Work at a Startup."""

    def __init__(self):
        super().__init__()
        self.name = "yc_waas"

    async def search(
        self,
        titles: List[str],
        locations: List[str],
        **kwargs,
    ) -> List[JobListing]:
        """Search YC Work at a Startup for AI jobs."""
        jobs: List[JobListing] = []

        try:
            # Method 1: Use the WAAS public API/search
            api_jobs = await self._search_waas_api(titles, locations)
            jobs.extend(api_jobs)
        except Exception as e:
            logger.warning(f"[YC] API search failed: {e}")

        try:
            # Method 2: Scrape the HTML job listing pages
            html_jobs = await self._search_waas_html(titles, locations)
            jobs.extend(html_jobs)
        except Exception as e:
            logger.warning(f"[YC] HTML search failed: {e}")

        # Deduplicate
        seen = set()
        unique = []
        for job in jobs:
            key = f"{job.company}_{job.title}".lower()
            if key not in seen:
                seen.add(key)
                unique.append(job)

        logger.info(f"[YC] Found {len(unique)} unique YC startup jobs")
        return unique

    async def _search_waas_api(self, titles: List[str], locations: List[str]) -> List[JobListing]:
        """Try the WAAS JSON API (workatastartup.com/companies)."""
        jobs = []
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json, text/html",
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            # Try the companies/jobs JSON endpoint
            for query in ["machine learning", "artificial intelligence", "AI engineer", "LLM", "GenAI"]:
                try:
                    # WAAS uses query parameters for filtering
                    params = {
                        "query": query,
                        "page": 1,
                        "demographic": "",
                        "role": "eng",  # Engineering roles
                        "hasSalary": "false",
                    }

                    resp = await client.get(
                        "https://www.workatastartup.com/companies",
                        params=params,
                        headers=headers,
                    )

                    if resp.status_code == 200:
                        content_type = resp.headers.get("content-type", "")
                        if "json" in content_type:
                            data = resp.json()
                            jobs.extend(self._parse_api_companies(data, locations))
                        else:
                            # It returned HTML, parse it
                            jobs.extend(self._parse_waas_html(resp.text, locations))

                    await self.human_delay(1, 3)
                except Exception as e:
                    logger.debug(f"[YC] Query '{query}' failed: {e}")

        return jobs

    async def _search_waas_html(self, titles: List[str], locations: List[str]) -> List[JobListing]:
        """Scrape the WAAS HTML jobs page."""
        jobs = []
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
        }

        urls = [
            "https://www.workatastartup.com/jobs?query=AI&role=eng",
            "https://www.workatastartup.com/jobs?query=machine+learning&role=eng",
            "https://www.workatastartup.com/jobs?query=LLM&role=eng",
            "https://www.workatastartup.com/jobs?query=GenAI&role=eng",
        ]

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            for url in urls:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        jobs.extend(self._parse_waas_html(resp.text, locations))
                    await self.human_delay(2, 4)
                except Exception as e:
                    logger.debug(f"[YC] URL fetch failed: {e}")

        return jobs

    def _parse_api_companies(self, data: dict, locations: List[str]) -> List[JobListing]:
        """Parse WAAS API response (company + jobs format)."""
        jobs = []

        companies = data if isinstance(data, list) else data.get("companies", data.get("results", []))

        for company in companies:
            try:
                company_name = company.get("name", "")
                batch = company.get("batch", "")
                website = company.get("website", company.get("url", ""))

                # Filter: recent YC batches only
                if batch and batch not in RECENT_BATCHES:
                    continue

                company_jobs = company.get("jobs", company.get("job_listings", []))
                for job_data in company_jobs:
                    title = job_data.get("title", "")
                    if not title:
                        continue

                    # Check if AI-related
                    combined = f"{title} {job_data.get('description', '')}".lower()
                    if not any(kw in combined for kw in AI_KEYWORDS):
                        continue

                    location = job_data.get("location", "")
                    is_remote = job_data.get("remote", False) or "remote" in location.lower()

                    # Check location filter
                    if not self._matches_location(location, is_remote, locations):
                        continue

                    job_url = job_data.get("url", "")
                    if job_url and not job_url.startswith("http"):
                        job_url = f"https://www.workatastartup.com{job_url}"

                    salary_text = job_data.get("salary", "")
                    sal_min, sal_max = self.parse_salary(str(salary_text))

                    jobs.append(JobListing(
                        external_id=f"yc_{job_data.get('id', hash(title + company_name))}",
                        source="yc_waas",
                        url=job_url or f"https://www.workatastartup.com/companies/{company.get('slug', '')}",
                        apply_url=job_data.get("apply_url", job_url),
                        title=title,
                        company=company_name,
                        company_domain=website,
                        location=location,
                        is_remote=is_remote,
                        salary_min=sal_min,
                        salary_max=sal_max,
                        description=job_data.get("description", "")[:500],
                    ))
            except Exception as e:
                logger.debug(f"[YC] Company parse error: {e}")

        return jobs

    def _parse_waas_html(self, html: str, locations: List[str]) -> List[JobListing]:
        """Parse WAAS HTML page for job listings."""
        from bs4 import BeautifulSoup
        jobs = []

        try:
            soup = BeautifulSoup(html, "lxml")

            # Look for job cards / company cards
            cards = soup.select('[class*="company"], [class*="job-listing"], [class*="result"]')
            if not cards:
                cards = soup.select("div.w-full, div.mb-4, div.border")

            for card in cards[:100]:
                try:
                    card_text = card.get_text()
                    card_lower = card_text.lower()

                    # Must contain AI keywords
                    if not any(kw in card_lower for kw in AI_KEYWORDS):
                        continue

                    # Extract company name
                    company_el = card.select_one('h2, h3, [class*="company-name"], [class*="font-bold"]')
                    company = company_el.get_text(strip=True) if company_el else ""

                    # Extract job titles (may be multiple per company)
                    title_els = card.select('a[href*="/jobs/"], [class*="job-title"], h4')
                    if not title_els:
                        title_els = card.select("a[href]")

                    for title_el in title_els:
                        title = title_el.get_text(strip=True)
                        if not title or len(title) > 100:
                            continue

                        # Check if this title is AI-related
                        if not any(kw in title.lower() for kw in AI_KEYWORDS):
                            continue

                        link = title_el.get("href", "")
                        if link and not link.startswith("http"):
                            link = f"https://www.workatastartup.com{link}"

                        # Extract batch info
                        batch_match = re.search(r'([WSF]\d{2})', card_text)
                        batch = batch_match.group(1) if batch_match else ""
                        if batch and batch not in RECENT_BATCHES:
                            continue

                        # Location
                        loc_el = card.select_one('[class*="location"], [class*="loc"]')
                        location = loc_el.get_text(strip=True) if loc_el else ""

                        jobs.append(JobListing(
                            external_id=f"yc_{hash(link or title + company)}",
                            source="yc_waas",
                            url=link or "https://www.workatastartup.com/jobs",
                            apply_url=link,
                            title=title,
                            company=company or "YC Startup",
                            location=location,
                            is_remote="remote" in location.lower() or "remote" in card_lower,
                            description=card_lower[:300],
                        ))

                except Exception:
                    continue

        except Exception as e:
            logger.debug(f"[YC] HTML parse error: {e}")

        return jobs

    def _matches_location(self, location: str, is_remote: bool, target_locations: List[str]) -> bool:
        """Check if job location matches any target location."""
        if is_remote:
            return True  # Remote jobs always match
        if not location:
            return True  # Unknown location, include it

        loc_lower = location.lower()
        for target in target_locations:
            target_lower = target.lower()
            if target_lower in loc_lower or loc_lower in target_lower:
                return True
            # Check city aliases
            if "bangalore" in target_lower and "bengaluru" in loc_lower:
                return True
            if "bengaluru" in target_lower and "bangalore" in loc_lower:
                return True
            if "remote" in target_lower and ("remote" in loc_lower or "anywhere" in loc_lower):
                return True
            if "india" in loc_lower:
                return True

        return False
