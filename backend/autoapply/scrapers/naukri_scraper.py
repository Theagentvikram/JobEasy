"""
Naukri.com scraper — India's largest job board.
Uses httpx to hit Naukri's public job search API.
Filters for AI/ML roles at startups in Hyderabad/Bangalore.
"""
import asyncio
import re
from typing import List, Optional
from datetime import datetime

import httpx
from autoapply.utils.logger import logger
from .base import BaseScraper, JobListing

# Large companies to exclude (service companies + big tech)
LARGE_COMPANY_BLOCKLIST = {
    "tcs", "infosys", "wipro", "hcl", "accenture", "capgemini", "ibm",
    "cognizant", "tech mahindra", "mphasis", "hexaware", "mindtree",
    "ltimindtree", "l&t infotech", "persistent", "zensar", "cyient",
    "birlasoft", "kpit", "virtusa", "mulesoft", "oracle", "sap",
    "deloitte", "ey", "kpmg", "pwc", "mckinsey", "bain",
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "flipkart", "swiggy", "zomato", "paytm", "ola", "uber",
    "byju", "unacademy", "vedantu", "whitehat",
    "tata consultancy", "hcl technologies", "wipro technologies",
    "infosys limited", "tech mahindra limited",
}

# Naukri search URLs for different AI roles and locations
NAUKRI_SEARCHES = [
    {"keyword": "AI Engineer", "location": "Hyderabad"},
    {"keyword": "AI Engineer", "location": "Bangalore"},
    {"keyword": "Machine Learning", "location": "Hyderabad"},
    {"keyword": "Machine Learning", "location": "Bangalore"},
    {"keyword": "LLM Engineer", "location": "Hyderabad"},
    {"keyword": "GenAI", "location": "Hyderabad"},
    {"keyword": "GenAI", "location": "Bangalore"},
    {"keyword": "NLP Engineer", "location": "Hyderabad"},
    {"keyword": "Data Scientist AI", "location": "Hyderabad"},
    {"keyword": "AI Engineer", "location": ""},  # Remote / WFH
    {"keyword": "MLOps", "location": "Hyderabad"},
    {"keyword": "Deep Learning", "location": "Bangalore"},
    {"keyword": "Computer Vision Engineer", "location": "Hyderabad"},
]

# Naukri's public API endpoint
NAUKRI_API = "https://www.naukri.com/jobapi/v3/search"


class NaukriScraper(BaseScraper):
    """Scrape AI/ML startup jobs from Naukri.com."""

    def __init__(self):
        super().__init__()
        self.name = "naukri"

    async def search(
        self,
        titles: List[str],
        locations: List[str],
        **kwargs,
    ) -> List[JobListing]:
        """Search Naukri for AI startup jobs in India."""
        jobs: List[JobListing] = []

        # Build search combinations from config + defaults
        searches = []
        for title in titles[:6]:
            for loc in locations[:4]:
                # Only search Indian locations on Naukri
                loc_lower = loc.lower()
                if any(city in loc_lower for city in ["hyderabad", "bangalore", "bengaluru", "remote", "work from home", "wfh", "india"]):
                    searches.append({"keyword": title, "location": loc if "remote" not in loc_lower else ""})

        # Add our default startup-focused searches
        searches.extend(NAUKRI_SEARCHES)

        # Deduplicate
        seen_searches = set()
        unique_searches = []
        for s in searches:
            key = f"{s['keyword'].lower()}_{s['location'].lower()}"
            if key not in seen_searches:
                seen_searches.add(key)
                unique_searches.append(s)

        for search in unique_searches[:15]:  # Cap at 15 searches
            try:
                found = await self._search_naukri(search["keyword"], search["location"])
                jobs.extend(found)
                await self.human_delay(2, 5)
            except Exception as e:
                logger.warning(f"[Naukri] Error for '{search['keyword']}' in '{search['location']}': {e}")

        # Deduplicate by URL
        seen = set()
        unique = []
        for job in jobs:
            if job.url not in seen:
                seen.add(job.url)
                unique.append(job)

        logger.info(f"[Naukri] Found {len(unique)} unique AI startup jobs")
        return unique

    async def _search_naukri(self, keyword: str, location: str) -> List[JobListing]:
        """Search Naukri's API for jobs."""
        jobs = []
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://www.naukri.com/",
            "systemId": "Starter",
            "appid": "109",
            "Content-Type": "application/json",
        }

        # Build the search URL slug
        kw_slug = keyword.lower().replace(" ", "-")
        loc_slug = location.lower().replace(" ", "-") if location else ""

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                # Try the Naukri job listing page and parse
                if loc_slug:
                    url = f"https://www.naukri.com/{kw_slug}-jobs-in-{loc_slug}"
                else:
                    url = f"https://www.naukri.com/{kw_slug}-jobs?wfhType=2"

                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                })

                if resp.status_code == 200:
                    jobs.extend(self._parse_naukri_html(resp.text, keyword))

        except Exception as e:
            logger.error(f"[Naukri] API error: {e}")

        return jobs

    def _parse_naukri_html(self, html: str, keyword: str) -> List[JobListing]:
        """Parse Naukri HTML for job listings."""
        from bs4 import BeautifulSoup
        jobs = []

        try:
            soup = BeautifulSoup(html, "lxml")

            # Naukri uses article tags or specific class patterns for job cards
            job_cards = soup.select('article.jobTuple, div.srp-jobtuple, [class*="jobTuple"], [data-job-id]')

            # Also try finding JSON-LD structured data
            scripts = soup.find_all("script", type="application/ld+json")
            for script in scripts:
                try:
                    import json
                    data = json.loads(script.string)
                    if isinstance(data, list):
                        for item in data:
                            job = self._parse_jsonld_job(item)
                            if job:
                                jobs.append(job)
                    elif isinstance(data, dict):
                        if data.get("@type") == "JobPosting":
                            job = self._parse_jsonld_job(data)
                            if job:
                                jobs.append(job)
                        elif "itemListElement" in data:
                            for item in data["itemListElement"]:
                                posting = item.get("item", item)
                                job = self._parse_jsonld_job(posting)
                                if job:
                                    jobs.append(job)
                except Exception:
                    continue

            # Parse HTML cards
            for card in job_cards[:50]:
                try:
                    title_el = card.select_one('a.title, [class*="title"] a, h2 a, .jobTitle a')
                    title = title_el.get_text(strip=True) if title_el else ""

                    company_el = card.select_one('[class*="company"], .companyName, .subTitle a')
                    company = company_el.get_text(strip=True) if company_el else ""

                    if not title or not company:
                        continue

                    # Filter out large companies
                    if self._is_blocklisted(company):
                        continue

                    # Extract job URL
                    link = ""
                    if title_el and title_el.get("href"):
                        link = title_el["href"]
                    if link and not link.startswith("http"):
                        link = f"https://www.naukri.com{link}"

                    # Extract location
                    loc_el = card.select_one('[class*="location"], .locWdth, .loc')
                    location = loc_el.get_text(strip=True) if loc_el else ""

                    # Extract salary
                    sal_el = card.select_one('[class*="salary"], .sal, .salary')
                    salary_text = sal_el.get_text(strip=True) if sal_el else ""
                    sal_min, sal_max = self._parse_indian_salary(salary_text)

                    # Extract experience
                    exp_el = card.select_one('[class*="experience"], .exp, .expwdth')
                    exp_text = exp_el.get_text(strip=True) if exp_el else ""

                    # Extract description/tags
                    desc_el = card.select_one('[class*="description"], .job-description, .elips')
                    desc = desc_el.get_text(strip=True) if desc_el else ""

                    # Look for startup indicators
                    card_text = card.get_text().lower()
                    is_startup = self._looks_like_startup(card_text, company)

                    # Only keep if it looks like a startup
                    if not is_startup:
                        continue

                    jobs.append(JobListing(
                        external_id=f"naukri_{hash(link or title + company)}",
                        source="naukri",
                        url=link or f"https://www.naukri.com/{keyword.lower().replace(' ', '-')}-jobs",
                        apply_url=link,
                        title=title,
                        company=company,
                        location=location,
                        is_remote="remote" in location.lower() or "work from home" in location.lower(),
                        salary_min=sal_min,
                        salary_max=sal_max,
                        description=f"{desc} | Exp: {exp_text}" if exp_text else desc,
                    ))
                except Exception:
                    continue

        except Exception as e:
            logger.debug(f"[Naukri] HTML parse error: {e}")

        return jobs

    def _parse_jsonld_job(self, data: dict) -> Optional[JobListing]:
        """Parse a JSON-LD JobPosting into a JobListing."""
        try:
            if data.get("@type") != "JobPosting":
                return None

            title = data.get("title", "")
            company_data = data.get("hiringOrganization", {})
            company = company_data.get("name", "") if isinstance(company_data, dict) else str(company_data)

            if not title or not company:
                return None

            if self._is_blocklisted(company):
                return None

            location_data = data.get("jobLocation", {})
            location = ""
            if isinstance(location_data, dict):
                addr = location_data.get("address", {})
                if isinstance(addr, dict):
                    location = addr.get("addressLocality", "")
            elif isinstance(location_data, list) and location_data:
                addr = location_data[0].get("address", {})
                location = addr.get("addressLocality", "") if isinstance(addr, dict) else ""

            url = data.get("url", "")
            salary = data.get("baseSalary", {})
            sal_min, sal_max = None, None
            if isinstance(salary, dict):
                value = salary.get("value", {})
                if isinstance(value, dict):
                    sal_min = value.get("minValue")
                    sal_max = value.get("maxValue")

            return JobListing(
                external_id=f"naukri_{hash(url or title + company)}",
                source="naukri",
                url=url,
                apply_url=url,
                title=title,
                company=company,
                location=location,
                is_remote="remote" in (location or "").lower(),
                salary_min=int(sal_min) if sal_min else None,
                salary_max=int(sal_max) if sal_max else None,
                description=data.get("description", "")[:500],
                posted_at=self._parse_date(data.get("datePosted")),
            )
        except Exception:
            return None

    def _is_blocklisted(self, company: str) -> bool:
        """Check if company is a large corp we want to skip."""
        name = company.lower().strip()
        for blocked in LARGE_COMPANY_BLOCKLIST:
            if blocked in name or name in blocked:
                return True
        return False

    def _looks_like_startup(self, card_text: str, company: str) -> bool:
        """Heuristic: does this look like a startup?"""
        if self._is_blocklisted(company):
            return False

        startup_signals = [
            "startup", "founded 20", "series a", "series b", "seed",
            "pre-seed", "funded", "venture", "1-50", "51-200",
            "early stage", "growth stage", "ai company", "ai-first",
            "product company", "saas", "b2b", "b2c",
        ]
        return any(signal in card_text for signal in startup_signals) or True
        # Default to True for non-blocklisted companies (filter further in pipeline)

    def _parse_indian_salary(self, text: str) -> tuple[Optional[int], Optional[int]]:
        """Parse Indian salary format: '20-30 Lacs P.A.' or '₹20L - ₹30L'."""
        if not text:
            return None, None

        text = text.lower().replace(",", "").replace("₹", "").strip()

        # Match patterns like "20-30 lacs" or "20 - 30 lakhs" or "20L - 30L"
        numbers = re.findall(r'(\d+\.?\d*)', text)
        if not numbers:
            return None, None

        multiplier = 100000  # 1 Lakh = 100,000
        if "cr" in text:
            multiplier = 10000000  # 1 Crore

        nums = [float(n) * multiplier for n in numbers[:2]]
        nums = [int(n) for n in nums if n > 100000]

        if len(nums) >= 2:
            return min(nums), max(nums)
        elif len(nums) == 1:
            return nums[0], nums[0]
        return None, None

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse ISO date string."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None
