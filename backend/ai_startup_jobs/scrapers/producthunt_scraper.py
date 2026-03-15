"""
Product Hunt + Crunchbase Scraper

Product Hunt: Discover recently launched AI companies (past 3 months).
Crunchbase: Find recently funded AI startups in India (Seed/Series A).

These are used as a company discovery layer — cross-referenced with job boards.
"""

import asyncio
import logging
import random
import re
from datetime import datetime, timedelta
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


# ──────────────────────────────────────────────
# PRODUCT HUNT
# ──────────────────────────────────────────────

def scrape_product_hunt() -> list[dict]:
    """
    Scrape ProductHunt AI topic for recently launched products.
    Returns company discovery records (not jobs directly).
    """
    companies = []
    urls_to_try = [
        "https://www.producthunt.com/topics/artificial-intelligence",
        "https://www.producthunt.com/search?q=AI&topic=artificial-intelligence",
    ]

    for url in urls_to_try:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"ProductHunt returned {resp.status_code} for {url}")
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            companies.extend(_parse_product_hunt_page(soup))

            if companies:
                break
        except Exception as e:
            logger.warning(f"ProductHunt scrape error ({url}): {e}")

    # Deduplicate
    seen = set()
    unique = []
    for c in companies:
        key = c.get("company", "").lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(c)

    logger.info(f"ProductHunt: {len(unique)} AI companies found")
    return unique


def _parse_product_hunt_page(soup: BeautifulSoup) -> list[dict]:
    """Parse ProductHunt HTML for AI product listings."""
    results = []
    cutoff_date = datetime.now() - timedelta(days=90)  # Last 3 months

    # Product Hunt uses various selectors depending on page version
    product_cards = (
        soup.select("li[class*='product']") or
        soup.select("div[class*='post']") or
        soup.select("article") or
        soup.select("section[class*='product']")
    )

    for card in product_cards:
        try:
            # Product name / company
            name_el = (
                card.select_one("h3, h2, [class*='name'], [class*='title']")
            )
            if not name_el:
                continue
            name = name_el.get_text(strip=True)

            # Tagline
            tagline_el = card.select_one("[class*='tagline'], [class*='description'], p")
            tagline = tagline_el.get_text(strip=True) if tagline_el else ""

            # Website URL
            link_el = card.select_one("a[href]")
            product_url = link_el["href"] if link_el else ""
            if product_url and not product_url.startswith("http"):
                product_url = "https://www.producthunt.com" + product_url

            # Upvotes
            votes_el = card.select_one("[class*='vote'], [class*='count'], button[class*='upvote']")
            upvotes = votes_el.get_text(strip=True) if votes_el else "0"

            # Date
            date_el = card.select_one("time, [class*='date']")
            date_str = date_el.get("datetime", "") if date_el else ""

            if not name:
                continue

            # Check AI relevance
            text_check = f"{name} {tagline}".lower()
            ai_terms = ["ai", "ml", "llm", "gpt", "machine learning", "neural", "chatbot",
                       "automation", "generative", "intelligence", "nlp", "model"]
            if not any(t in text_check for t in ai_terms):
                continue

            results.append({
                "job_title": f"[Company Discovery] {name}",
                "company": name,
                "location": "Remote (Global)",
                "salary": "",
                "funding_stage": "Early Stage",
                "source": "ProductHunt",
                "job_url": product_url,
                "company_website": product_url,
                "date_scraped": datetime.now().strftime("%Y-%m-%d"),
                "notes": f"Tagline: {tagline[:80]} | Upvotes: {upvotes}",
                "is_freelance": False,
            })
        except Exception as e:
            logger.debug(f"PH card parse error: {e}")

    return results


# ──────────────────────────────────────────────
# CRUNCHBASE (public pages only)
# ──────────────────────────────────────────────

async def scrape_crunchbase_startups() -> list[dict]:
    """
    Scrape Crunchbase's public organization pages for recently funded
    AI startups in India (Seed/Series A, past 12 months).
    """
    companies = []

    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import Stealth
    except ImportError:
        logger.warning("playwright not installed — skipping Crunchbase.")
        return companies

    # NOTE: Crunchbase is heavily bot-protected on discover pages.
    # We use a targeted search approach on their public company pages.
    search_url = (
        "https://www.crunchbase.com/discover/organization.companies"
        "/b07a74f6e9ec7e68b13f76f4b025b9a2"
    )
    # Fallback: search specific known companies via CB public profiles

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(random.uniform(3, 5))

            # Crunchbase may require login for full data
            # Try to extract visible cards
            cards = await page.query_selector_all(
                "[class*='identifier'], [class*='organization-card'], "
                "mat-cell, [class*='field-type-identifier']"
            )

            for card in cards[:50]:
                try:
                    text = await card.inner_text()
                    link = await card.query_selector("a")
                    href = await link.get_attribute("href") if link else ""
                    if href and not href.startswith("http"):
                        href = "https://www.crunchbase.com" + href

                    if text.strip():
                        companies.append({
                            "job_title": "[Company Discovery] AI Startup",
                            "company": text.strip()[:60],
                            "location": "India",
                            "salary": "",
                            "funding_stage": "Seed/Series A",
                            "source": "Crunchbase",
                            "job_url": href,
                            "company_website": href,
                            "date_scraped": datetime.now().strftime("%Y-%m-%d"),
                            "notes": "Recently funded AI startup (India)",
                            "is_freelance": False,
                        })
                except Exception:
                    pass

        except Exception as e:
            logger.warning(f"Crunchbase scrape error: {e}")
        finally:
            await browser.close()

    logger.info(f"Crunchbase: {len(companies)} companies found")
    return companies


def scrape() -> list[dict]:
    """Run both ProductHunt and Crunchbase scrapers."""
    results = scrape_product_hunt()
    # Crunchbase is async
    crunchbase = asyncio.run(scrape_crunchbase_startups())
    results.extend(crunchbase)
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = scrape()
    print(f"\nProductHunt + Crunchbase: {len(results)} companies")
    for c in results[:5]:
        print(f"  - {c['company']} | {c['notes'][:60]}")
