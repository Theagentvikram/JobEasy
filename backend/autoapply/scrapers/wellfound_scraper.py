"""
Wellfound (AngelList Talent) scraper — best source for funded startup jobs.
Uses requests + BeautifulSoup to hit Wellfound's GraphQL API.
No Playwright needed — their public API is accessible.
"""
import asyncio
import re
from typing import List, Optional
from datetime import datetime

import httpx
from autoapply.utils.logger import logger
from .base import BaseScraper, JobListing

# Wellfound GraphQL endpoint (public, no auth needed for job search)
WELLFOUND_GRAPHQL = "https://wellfound.com/graphql"

# Funding stages we care about (early-stage startups only)
STARTUP_FUNDING_STAGES = {"seed", "series_a", "series_b", "pre_seed", "angel"}

AI_KEYWORDS = [
    "AI", "ML", "Machine Learning", "LLM", "GenAI", "NLP",
    "Data Scientist", "Computer Vision", "Deep Learning", "RAG",
    "Prompt", "Generative AI", "MLOps", "AI Engineer",
    "Artificial Intelligence", "Neural Network", "GPT", "Transformer",
]


class WellfoundScraper(BaseScraper):
    """Scrape AI startup jobs from Wellfound (AngelList Talent)."""

    def __init__(self):
        super().__init__()
        self.name = "wellfound"

    async def search(
        self,
        titles: List[str],
        locations: List[str],
        **kwargs,
    ) -> List[JobListing]:
        """Search Wellfound for AI startup jobs."""
        jobs: List[JobListing] = []

        # Build search queries combining AI keywords with locations
        search_terms = []
        for title in titles[:5]:  # Limit to avoid too many requests
            for kw in ["AI", "Machine Learning", "LLM", "GenAI"]:
                if kw.lower() in title.lower():
                    search_terms.append(title)
                    break
            else:
                search_terms.append(title)

        # Deduplicate
        search_terms = list(set(search_terms))[:6]

        for term in search_terms:
            for location in locations[:3]:
                try:
                    found = await self._search_wellfound(term, location)
                    jobs.extend(found)
                    await self.human_delay(2, 4)
                except Exception as e:
                    logger.warning(f"[Wellfound] Error searching '{term}' in '{location}': {e}")

        # Deduplicate by URL
        seen = set()
        unique = []
        for job in jobs:
            if job.url not in seen:
                seen.add(job.url)
                unique.append(job)

        logger.info(f"[Wellfound] Found {len(unique)} unique startup jobs")
        return unique

    async def _search_wellfound(self, query: str, location: str) -> List[JobListing]:
        """Use python-jobspy's built-in wellfound site (most reliable) with HTML fallback."""
        jobs = []

        # Primary: use jobspy which handles Wellfound scraping correctly
        try:
            import asyncio as _asyncio
            loop = _asyncio.get_event_loop()
            df = await loop.run_in_executor(None, lambda: self._jobspy_wellfound(query, location))
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    try:
                        title = str(row.get("title", "") or "").strip()
                        company = str(row.get("company", "") or "").strip()
                        url = str(row.get("job_url", "") or "").strip()
                        if not title or not company or not url:
                            continue
                        jobs.append(JobListing(
                            external_id=f"wellfound_{hash(url)}",
                            source="wellfound",
                            url=url,
                            apply_url=str(row.get("job_url_direct", url) or url),
                            title=title,
                            company=company,
                            location=str(row.get("location", "") or ""),
                            is_remote=bool(row.get("is_remote", False)),
                            salary_min=self._safe_int(row.get("min_amount")),
                            salary_max=self._safe_int(row.get("max_amount")),
                            description=str(row.get("description", "") or "")[:500],
                        ))
                    except Exception:
                        continue
                if jobs:
                    return jobs
        except Exception as e:
            logger.debug(f"[Wellfound] jobspy path failed: {e}")

        # Fallback: HTTP scrape
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml",
            }
            async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                search_url = f"https://wellfound.com/jobs?query={query}&location={location}"
                resp = await client.get(search_url, headers=headers)
                if resp.status_code == 200:
                    jobs.extend(self._parse_html_listings(resp.text, query))
        except Exception as e:
            logger.error(f"[Wellfound] Search error: {e}")

        return jobs

    def _jobspy_wellfound(self, query: str, location: str):
        """Sync jobspy call for wellfound only."""
        try:
            from jobspy import scrape_jobs
            return scrape_jobs(
                site_name=["wellfound"],
                search_term=query,
                location=location or "Remote",
                results_wanted=25,
                hours_old=48,
                verbose=0,
            )
        except Exception:
            return None

    def _safe_int(self, val) -> "int | None":
        try:
            return int(float(val)) if val and str(val) not in ("nan", "None", "") else None
        except Exception:
            return None

    def _parse_api_response(self, data: dict) -> List[JobListing]:
        """Parse Wellfound API JSON response."""
        jobs = []
        results = data.get("results", data.get("jobs", []))
        if isinstance(results, dict):
            results = results.get("hits", results.get("data", []))

        for item in results:
            try:
                company_data = item.get("startup", item.get("company", {}))
                company_name = company_data.get("name", "")
                funding = (company_data.get("funding_stage", "") or "").lower().replace(" ", "_")

                # Only keep early-stage startups
                if funding and funding not in STARTUP_FUNDING_STAGES:
                    continue

                title = item.get("title", item.get("job_title", ""))
                if not title or not company_name:
                    continue

                # Check if AI-related
                combined = f"{title} {item.get('description', '')}".lower()
                if not any(kw.lower() in combined for kw in AI_KEYWORDS):
                    continue

                location = item.get("location", "")
                salary_min = item.get("salary_min")
                salary_max = item.get("salary_max")
                job_url = item.get("url", f"https://wellfound.com/jobs/{item.get('slug', item.get('id', ''))}")

                jobs.append(JobListing(
                    external_id=f"wellfound_{item.get('id', hash(job_url))}",
                    source="wellfound",
                    url=job_url if job_url.startswith("http") else f"https://wellfound.com{job_url}",
                    apply_url=job_url,
                    title=title,
                    company=company_name,
                    company_domain=company_data.get("website", ""),
                    location=location,
                    is_remote="remote" in location.lower(),
                    salary_min=salary_min,
                    salary_max=salary_max,
                    description=item.get("description", ""),
                ))
            except Exception as e:
                logger.debug(f"[Wellfound] Parse error: {e}")

        return jobs

    def _parse_html_listings(self, html: str, query: str) -> List[JobListing]:
        """Parse job listings from Wellfound HTML page."""
        from bs4 import BeautifulSoup
        jobs = []

        try:
            soup = BeautifulSoup(html, "lxml")

            # Look for job cards - Wellfound uses various class patterns
            job_cards = soup.select('[class*="job"], [class*="listing"], [data-test*="job"]')
            if not job_cards:
                # Try finding links that look like job listings
                job_cards = soup.find_all("a", href=re.compile(r"/jobs/|/l/"))

            for card in job_cards[:50]:
                try:
                    # Extract title
                    title_el = card.select_one('h2, h3, [class*="title"], [class*="name"]')
                    title = title_el.get_text(strip=True) if title_el else ""

                    # Extract company
                    company_el = card.select_one('[class*="company"], [class*="startup"]')
                    company = company_el.get_text(strip=True) if company_el else ""

                    if not title or not company:
                        continue

                    # Check if AI-related
                    card_text = card.get_text().lower()
                    if not any(kw.lower() in card_text for kw in AI_KEYWORDS):
                        continue

                    # Extract URL
                    link = card.get("href", "")
                    if not link:
                        link_el = card.select_one("a[href]")
                        link = link_el.get("href", "") if link_el else ""
                    if link and not link.startswith("http"):
                        link = f"https://wellfound.com{link}"

                    # Extract location
                    loc_el = card.select_one('[class*="location"]')
                    location = loc_el.get_text(strip=True) if loc_el else ""

                    # Extract salary
                    salary_el = card.select_one('[class*="salary"], [class*="compensation"]')
                    salary_text = salary_el.get_text(strip=True) if salary_el else ""
                    sal_min, sal_max = self.parse_salary(salary_text)

                    # Extract funding stage
                    funding_el = card.select_one('[class*="funding"], [class*="stage"]')
                    funding = funding_el.get_text(strip=True).lower() if funding_el else ""

                    jobs.append(JobListing(
                        external_id=f"wellfound_{hash(link or title + company)}",
                        source="wellfound",
                        url=link or f"https://wellfound.com/jobs?query={query}",
                        apply_url=link,
                        title=title,
                        company=company,
                        location=location,
                        is_remote="remote" in location.lower() or "remote" in card_text,
                        salary_min=sal_min,
                        salary_max=sal_max,
                        description=card_text[:500],
                    ))
                except Exception:
                    continue

        except Exception as e:
            logger.debug(f"[Wellfound] HTML parse error: {e}")

        return jobs
