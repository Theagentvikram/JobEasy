"""
Naukri.com Scraper
Targets AI/ML Engineer jobs in Hyderabad and Remote (WFH).
Filters out large IT companies and keeps only startup-like companies.

Uses Naukri's internal API (v2 REST) which returns JSON — far more reliable
than CSS selector scraping (selectors change with every UI rebuild).
"""

import asyncio
import json
import logging
import random
import re
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Known large IT companies to block
LARGE_COMPANY_BLOCKLIST = [
    "tcs", "tata consultancy", "infosys", "wipro", "hcl", "accenture",
    "capgemini", "ibm", "cognizant", "tech mahindra", "mphasis", "hexaware",
    "google", "microsoft", "amazon", "meta", "apple", "flipkart", "swiggy",
    "zomato", "paytm", "byju", "unacademy", "ola", "myntra", "nykaa",
    "persistent systems", "mindtree", "l&t", "ltimindtree", "oracle",
    "sap", "salesforce", "deloitte", "pwc", "kpmg", "ey ", "ernst",
    "genpact", "wns", "concentrix", "sutherland", "igate", "patni",
    "niit", "mastech", "cyient", "birlasoft",
]

# Naukri search queries: (keyword, location_id)
# Location IDs: 73 = Hyderabad, 4 = Bangalore, 130 = Remote/WFH
SEARCH_QUERIES = [
    ("AI Engineer", "73"),       # Hyderabad
    ("Machine Learning Engineer", "73"),
    ("LLM Engineer", "73"),
    ("Generative AI", "73"),
    ("AI Engineer", "4"),        # Bangalore
    ("Machine Learning", "4"),
    ("AI Engineer", ""),         # All India (will filter by wfhType)
    ("LLM Engineer", ""),
    ("GenAI Engineer", ""),
    ("MLOps Engineer", ""),
    ("NLP Engineer", ""),
    ("Data Scientist AI", "73"),
]


def _is_large_company(company_name: str) -> bool:
    name_lower = company_name.lower()
    return any(block in name_lower for block in LARGE_COMPANY_BLOCKLIST)


def _extract_salary_lpa(salary_text: str) -> Optional[float]:
    """Extract max salary in LPA from text like '15-25 Lacs PA' or '20 LPA'."""
    if not salary_text:
        return None
    text = salary_text.lower().replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lacs|lpa|lakhs|l\b)", text)
    if match:
        all_nums = re.findall(r"\d+(?:\.\d+)?", text)
        if all_nums:
            return float(max(all_nums, key=float))
    crore_match = re.search(r"(\d+(?:\.\d+)?)\s*cr", text)
    if crore_match:
        return float(crore_match.group(1)) * 100
    return None


async def scrape_naukri_jobs() -> list[dict]:
    """Scrape Naukri for AI startup jobs via their internal API."""
    jobs = []
    seen_ids = set()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.naukri.com/",
        "appid": "109",
        "systemid": "Naukri",
        "clientid": "d3skt0p",
        "granttype": "client_credentials",
    }

    async with httpx.AsyncClient(
        headers=headers,
        timeout=30,
        follow_redirects=True,
    ) as client:
        for keyword, location_id in SEARCH_QUERIES:
            try:
                # Naukri v2 API endpoint (v3 requires extra auth, v2 works with clientid header)
                params = {
                    "noOf": "20",
                    "urlType": "search_by_keyword",
                    "searchType": "adv",
                    "keyword": keyword,
                    "src": "jobsearchDesk",
                    "pageNo": "1",
                    "wantCtSrc": "data",
                }
                if location_id:
                    params["locationIdList"] = location_id
                else:
                    # Remote/WFH filter
                    params["wfhType"] = "1"  # 1 = remote, 2 = hybrid

                url = "https://www.naukri.com/jobapi/v2/search"
                resp = await client.get(url, params=params)

                if resp.status_code != 200:
                    logger.warning(f"Naukri API {resp.status_code} for '{keyword}'")
                    await asyncio.sleep(random.uniform(2, 4))
                    continue

                data = resp.json()
                # v2 API returns jobs in 'list' key (not 'jobDetails')
                job_list = data.get("jobDetails") or data.get("list") or []
                logger.info(f"Naukri '{keyword}' loc={location_id or 'remote'}: {len(job_list)} results")

                for item in job_list:
                    job = _parse_naukri_api_job(item)
                    if job:
                        job_id = job.get("job_url", "")
                        if job_id not in seen_ids and not _is_large_company(job["company"]):
                            seen_ids.add(job_id)
                            jobs.append(job)

                await asyncio.sleep(random.uniform(1.5, 3))

            except Exception as e:
                logger.warning(f"Naukri query failed for '{keyword}': {e}")
                continue

    logger.info(f"Naukri scraper complete: {len(jobs)} startup jobs found")
    return jobs


def _parse_naukri_api_job(item: dict) -> Optional[dict]:
    """Parse a job dict from Naukri v2 API response ('list' field)."""
    try:
        # v2 uses 'post' for title and 'companyName' for company
        title = str(item.get("post") or item.get("title") or "").strip()
        company = str(item.get("companyName") or "").strip()
        if not title or not company:
            return None

        job_id = str(item.get("jobId") or "")
        url_str = item.get("urlStr") or item.get("nonStaticUrlFor") or ""
        if url_str:
            job_url = f"https://www.naukri.com/{url_str.lstrip('/')}"
        elif job_id:
            job_url = f"https://www.naukri.com/job-listings-{job_id}"
        else:
            job_url = ""

        # Location
        city = item.get("city") or item.get("CONTCITY") or ""
        if isinstance(city, list):
            location_text = ", ".join(city)
        else:
            location_text = str(city)

        # Salary
        min_sal = item.get("minSal") or 0
        max_sal = item.get("maxSal") or 0
        show_sal = item.get("showSal", True)
        if show_sal and (min_sal or max_sal):
            if max_sal >= 100000:
                salary_text = f"{int(min_sal/100000)}-{int(max_sal/100000)} LPA" if min_sal else f"Up to {int(max_sal/100000)} LPA"
            else:
                salary_text = f"{min_sal}-{max_sal}"
        else:
            salary_text = "Not Disclosed"

        # Experience
        min_exp = item.get("minExp", "")
        max_exp = item.get("maxExp", "")
        exp_text = f"{min_exp}-{max_exp} yrs" if min_exp != "" and max_exp != "" else ""

        # Posted date
        posted = item.get("addDate") or item.get("dateAdded") or ""

        # Website
        company_website = item.get("website") or item.get("homepage") or ""

        # WFH type
        wfh_type = item.get("wfhType", 0)
        if wfh_type == 1 or "remote" in location_text.lower() or "wfh" in location_text.lower():
            location_text = "Remote"
        elif wfh_type == 2:
            location_text = f"{location_text} (Hybrid)" if location_text else "Hybrid"

        salary_lpa = _extract_salary_lpa(salary_text)
        notes_parts = []
        if exp_text:
            notes_parts.append(f"Exp: {exp_text}")
        if posted:
            notes_parts.append(f"Posted: {posted[:10]}")

        return {
            "job_title": title,
            "company": company,
            "location": location_text or "India",
            "salary": salary_text,
            "salary_lpa": salary_lpa,
            "funding_stage": "",
            "source": "Naukri",
            "job_url": job_url,
            "company_website": company_website,
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": " | ".join(notes_parts),
            "is_freelance": False,
        }
    except Exception as e:
        logger.debug(f"_parse_naukri_api_job error: {e}")
        return None


def scrape() -> list[dict]:
    return asyncio.run(scrape_naukri_jobs())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\nNaukri Jobs Found: {len(results)}")
    for j in results[:10]:
        print(f"  - {j['job_title']} @ {j['company']} | {j['salary']} | {j['location']}")
