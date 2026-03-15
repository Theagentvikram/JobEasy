"""
Freelance / High-Paying Contract Scraper

Targets high-paying AI/ML clients from:
  - Upwork (public job feed)
  - Toptal (public jobs page)
  - Gun.io (public listings)
  - Contra (public projects)
  - Wellfound (freelance roles — already in wellfound_scraper.py)

Focus countries: Dubai (UAE), Netherlands, Germany, US, Canada
"""

import asyncio
import logging
import random
import re
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

TARGET_COUNTRIES = ["united states", "usa", "us", "canada", "germany", "netherlands",
                    "dubai", "uae", "united arab emirates"]

AI_KEYWORDS = [
    "AI engineer", "ML engineer", "machine learning", "LLM", "GPT",
    "generative AI", "NLP", "data scientist", "deep learning", "MLOps",
    "AI developer", "AI consultant", "RAG", "fine-tuning", "embeddings",
    "computer vision", "AI automation", "langchain", "openai", "huggingface",
]

# Minimum hourly rate in USD to consider "high paying"
MIN_HOURLY_RATE_USD = 40
# Minimum fixed project budget in USD
MIN_FIXED_BUDGET_USD = 2000


def _extract_rate_usd(text: str) -> Optional[float]:
    """Extract hourly rate or project budget from text."""
    text = text.replace(",", "").replace("$", "")
    # Hourly rate patterns
    hourly = re.search(r"(\d+(?:\.\d+)?)\s*(?:/hr|/hour|per hour|hourly)", text, re.I)
    if hourly:
        return float(hourly.group(1))
    # Budget patterns
    budget = re.search(r"(\d{3,}(?:\.\d+)?)\s*(?:usd|dollar|\$)?", text, re.I)
    if budget:
        val = float(budget.group(1))
        # Convert fixed project to hourly equivalent (rough: /40hrs)
        if val > 10000:
            return val / 40
        return val
    return None


def _is_high_paying(rate_text: str) -> bool:
    rate = _extract_rate_usd(rate_text)
    if rate is None:
        return True  # Unknown rate — include it (better to over-include)
    return rate >= MIN_HOURLY_RATE_USD or rate >= MIN_FIXED_BUDGET_USD


def _is_ai_job(text: str) -> bool:
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in AI_KEYWORDS)


def _is_target_country(text: str) -> bool:
    text_lower = text.lower()
    return any(c in text_lower for c in TARGET_COUNTRIES)


# ──────────────────────────────────────────────
# UPWORK
# ──────────────────────────────────────────────

async def scrape_upwork() -> list[dict]:
    """
    Scrape Upwork public job search for high-paying AI contracts.
    Uses Playwright due to Upwork's dynamic JS rendering.
    """
    jobs = []

    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import Stealth
    except ImportError:
        logger.warning("playwright not installed — skipping Upwork")
        return jobs

    search_queries = [
        "AI engineer LLM",
        "machine learning engineer",
        "generative AI developer",
        "LLM fine tuning",
        "AI automation engineer",
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent=HEADERS["User-Agent"]
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        for query in search_queries:
            try:
                encoded = query.replace(" ", "%20")
                url = (
                    f"https://www.upwork.com/nx/search/jobs/"
                    f"?q={encoded}&sort=recency&payment_verified=1"
                )
                logger.info(f"Upwork: searching '{query}'")
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(random.uniform(3, 5))

                # Scroll to load more
                for _ in range(3):
                    await page.evaluate("window.scrollBy(0, window.innerHeight)")
                    await asyncio.sleep(1.5)

                cards = await page.query_selector_all(
                    "article[class*='job-tile'], div[class*='job-tile'], "
                    "[data-test='job-tile-list'] article"
                )

                for card in cards:
                    job = await _parse_upwork_card(card, query)
                    if job:
                        jobs.append(job)

                await asyncio.sleep(random.uniform(4, 7))

            except Exception as e:
                logger.warning(f"Upwork query '{query}' failed: {e}")

        await browser.close()

    logger.info(f"Upwork: {len(jobs)} jobs found")
    return jobs


async def _parse_upwork_card(card, query: str) -> Optional[dict]:
    """Parse a single Upwork job card."""
    try:
        title_el = await card.query_selector(
            "h2, h3, [class*='job-title'], a[class*='title']"
        )
        title = await title_el.inner_text() if title_el else query

        desc_el = await card.query_selector("[class*='description'], p[class*='text']")
        description = await desc_el.inner_text() if desc_el else ""

        budget_el = await card.query_selector(
            "[class*='budget'], [class*='rate'], [data-test='budget']"
        )
        budget = await budget_el.inner_text() if budget_el else ""

        location_el = await card.query_selector("[class*='client-location'], [data-test='location']")
        client_location = await location_el.inner_text() if location_el else ""

        link_el = await card.query_selector("a[href*='/jobs/']")
        job_url = await link_el.get_attribute("href") if link_el else ""
        if job_url and not job_url.startswith("http"):
            job_url = "https://www.upwork.com" + job_url

        # Apply filters
        full_text = f"{title} {description}"
        if not _is_ai_job(full_text):
            return None

        # Check if client is from target country
        if client_location and not _is_target_country(client_location):
            # Still include if no location (global remote)
            if client_location.strip():
                return None

        if budget and not _is_high_paying(budget):
            return None

        return {
            "job_title": title.strip(),
            "company": f"Upwork Client ({client_location.strip() or 'Global'})",
            "location": f"Remote (Client: {client_location.strip() or 'Global'})",
            "salary": budget.strip(),
            "funding_stage": "N/A",
            "source": "Upwork",
            "job_url": job_url,
            "company_website": "",
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": f"Freelance | {description[:80]}",
            "is_freelance": True,
        }
    except Exception as e:
        logger.debug(f"Upwork card error: {e}")
        return None


# ──────────────────────────────────────────────
# TOPTAL
# ──────────────────────────────────────────────

def scrape_toptal() -> list[dict]:
    """Scrape Toptal's public job listings for AI/ML contracts."""
    jobs = []
    urls = [
        "https://www.toptal.com/developers/remote-jobs",
        "https://www.toptal.com/jobs/remote",
    ]

    for url in urls:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"Toptal {resp.status_code}: {url}")
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            cards = (
                soup.select("div[class*='job-card'], article[class*='job']") or
                soup.select("li[class*='job'], div[class*='listing']")
            )

            for card in cards:
                job = _parse_toptal_card(card)
                if job:
                    jobs.append(job)

            if jobs:
                break
        except Exception as e:
            logger.warning(f"Toptal error: {e}")

    logger.info(f"Toptal: {len(jobs)} jobs found")
    return jobs


def _parse_toptal_card(card) -> Optional[dict]:
    """Parse Toptal job card."""
    try:
        title_el = card.select_one("h2, h3, [class*='title'], a[class*='title']")
        title = title_el.get_text(strip=True) if title_el else ""

        company_el = card.select_one("[class*='company'], [class*='client']")
        company = company_el.get_text(strip=True) if company_el else "Toptal Client"

        rate_el = card.select_one("[class*='rate'], [class*='salary'], [class*='budget']")
        rate = rate_el.get_text(strip=True) if rate_el else ""

        link_el = card.select_one("a[href]")
        job_url = link_el["href"] if link_el else ""
        if job_url and not job_url.startswith("http"):
            job_url = "https://www.toptal.com" + job_url

        if not title:
            return None
        if not _is_ai_job(title):
            return None

        return {
            "job_title": title,
            "company": company,
            "location": "Remote (Global — Toptal)",
            "salary": rate,
            "funding_stage": "N/A",
            "source": "Toptal",
            "job_url": job_url,
            "company_website": "https://www.toptal.com",
            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Freelance | Premium network (US/EU clients)",
            "is_freelance": True,
        }
    except Exception as e:
        logger.debug(f"Toptal card error: {e}")
        return None


# ──────────────────────────────────────────────
# CONTRA
# ──────────────────────────────────────────────

async def scrape_contra() -> list[dict]:
    """Scrape Contra for AI/ML freelance projects."""
    jobs = []

    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import Stealth
    except ImportError:
        logger.warning("playwright not installed — skipping Contra")
        return jobs

    search_url = "https://contra.com/remote-jobs/ai-machine-learning"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=HEADERS["User-Agent"]
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))

            for _ in range(4):
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(1.5)

            cards = await page.query_selector_all(
                "[class*='JobCard'], [class*='job-card'], "
                "article, div[class*='card']"
            )

            for card in cards:
                try:
                    title_el = await card.query_selector("h2, h3, [class*='title']")
                    title = await title_el.inner_text() if title_el else ""

                    rate_el = await card.query_selector("[class*='rate'], [class*='budget']")
                    rate = await rate_el.inner_text() if rate_el else ""

                    link_el = await card.query_selector("a[href]")
                    job_url = await link_el.get_attribute("href") if link_el else ""
                    if job_url and not job_url.startswith("http"):
                        job_url = "https://contra.com" + job_url

                    company_el = await card.query_selector("[class*='company'], [class*='client']")
                    company = await company_el.inner_text() if company_el else "Contra Client"

                    if not title or not _is_ai_job(title):
                        continue

                    jobs.append({
                        "job_title": title.strip(),
                        "company": company.strip(),
                        "location": "Remote (Global — Contra)",
                        "salary": rate.strip(),
                        "funding_stage": "N/A",
                        "source": "Contra",
                        "job_url": job_url,
                        "company_website": "",
                        "date_scraped": datetime.now().strftime("%Y-%m-%d"),
                        "notes": "Freelance | US/EU startup clients",
                        "is_freelance": True,
                    })
                except Exception as e:
                    logger.debug(f"Contra card error: {e}")

        except Exception as e:
            logger.warning(f"Contra scrape error: {e}")
        finally:
            await browser.close()

    logger.info(f"Contra: {len(jobs)} jobs found")
    return jobs


# ──────────────────────────────────────────────
# GUN.IO
# ──────────────────────────────────────────────

def scrape_gunio() -> list[dict]:
    """Scrape Gun.io for AI/ML freelance opportunities."""
    jobs = []
    url = "https://gun.io/find-work/"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "lxml")

        cards = soup.select("div[class*='job'], article[class*='job'], li[class*='listing']")
        for card in cards:
            title_el = card.select_one("h2, h3, [class*='title']")
            title = title_el.get_text(strip=True) if title_el else ""
            if not title or not _is_ai_job(title):
                continue

            link_el = card.select_one("a[href]")
            job_url = link_el["href"] if link_el else "https://gun.io"
            if job_url and not job_url.startswith("http"):
                job_url = "https://gun.io" + job_url

            rate_el = card.select_one("[class*='rate'], [class*='pay']")
            rate = rate_el.get_text(strip=True) if rate_el else ""

            jobs.append({
                "job_title": title,
                "company": "Gun.io Client",
                "location": "Remote (Global — Gun.io)",
                "salary": rate,
                "funding_stage": "N/A",
                "source": "Gun.io",
                "job_url": job_url,
                "company_website": "https://gun.io",
                "date_scraped": datetime.now().strftime("%Y-%m-%d"),
                "notes": "Freelance | Vetted US tech companies",
                "is_freelance": True,
            })
    except Exception as e:
        logger.warning(f"Gun.io scrape error: {e}")

    logger.info(f"Gun.io: {len(jobs)} jobs found")
    return jobs


# ──────────────────────────────────────────────
# MAIN ENTRY POINT
# ──────────────────────────────────────────────

def scrape() -> list[dict]:
    """Run all freelance scrapers and return combined results."""
    all_jobs = []

    # Sync scrapers
    toptal_jobs = scrape_toptal()
    all_jobs.extend(toptal_jobs)

    gunio_jobs = scrape_gunio()
    all_jobs.extend(gunio_jobs)

    # Async scrapers
    async def _run_async():
        upwork_jobs = await scrape_upwork()
        contra_jobs = await scrape_contra()
        return upwork_jobs + contra_jobs

    async_jobs = asyncio.run(_run_async())
    all_jobs.extend(async_jobs)

    logger.info(f"Freelance scraper total: {len(all_jobs)} opportunities")
    return all_jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\nFreelance Opportunities: {len(results)}")
    for j in results[:8]:
        print(f"  [{j['source']}] {j['job_title']} | {j['salary']} | {j['location']}")
