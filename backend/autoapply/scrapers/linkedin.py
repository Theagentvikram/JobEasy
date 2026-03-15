"""
LinkedIn scraper using Playwright.
Handles both job discovery and Easy Apply.
Uses stealth techniques to avoid detection.
"""
import asyncio
import random
from typing import List, Optional
from playwright.async_api import async_playwright, Page, Browser

from .base import BaseScraper, JobListing
from autoapply.utils.logger import logger
from autoapply.utils.settings import settings


STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
window.chrome = { runtime: {} };
"""


class LinkedInScraper(BaseScraper):
    """Scrapes LinkedIn jobs with Playwright stealth mode."""

    def __init__(self):
        super().__init__()
        self.name = "linkedin"
        self._browser: Optional[Browser] = None
        self._logged_in = False

    async def _get_browser(self, playwright):
        return await playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox", "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage", "--window-size=1920,1080",
            ]
        )

    async def _new_page(self, browser: Browser) -> Page:
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-US",
        )
        page = await context.new_page()
        await page.add_init_script(STEALTH_SCRIPT)
        return page

    async def _login(self, page: Page) -> bool:
        """Login to LinkedIn."""
        try:
            await page.goto("https://www.linkedin.com/login", wait_until="networkidle")
            await self.human_delay(1, 2)
            await page.fill("#username", settings.linkedin_email)
            await self.human_delay(0.5, 1)
            await page.fill("#password", settings.linkedin_password)
            await self.human_delay(0.5, 1)
            await page.click('[type="submit"]')
            await page.wait_for_url("**/feed/**", timeout=10000)
            logger.info("[LinkedIn] Login successful")
            self._logged_in = True
            return True
        except Exception as e:
            logger.error(f"[LinkedIn] Login failed: {e}")
            return False

    async def search(self, titles: List[str], locations: List[str], **kwargs) -> List[JobListing]:
        jobs = []
        async with async_playwright() as pw:
            browser = await self._get_browser(pw)
            try:
                page = await self._new_page(browser)
                if settings.linkedin_email and not await self._login(page):
                    logger.warning("[LinkedIn] Skipping - not logged in")
                    return jobs

                for title in titles:
                    for location in locations:
                        found = await self._search_jobs(page, title, location)
                        jobs.extend(found)
                        await self.human_delay(2, 4)
            finally:
                await browser.close()

        logger.info(f"[LinkedIn] Found {len(jobs)} jobs")
        return jobs

    async def _search_jobs(self, page: Page, title: str, location: str) -> List[JobListing]:
        jobs = []
        import urllib.parse
        query = urllib.parse.quote(title)
        loc = urllib.parse.quote(location)

        # f_AL=true filters for Easy Apply jobs only (fastest to apply)
        url = f"https://www.linkedin.com/jobs/search/?keywords={query}&location={loc}&f_AL=true&f_TPR=r86400&sortBy=DD"
        await page.goto(url, wait_until="domcontentloaded")
        await self.human_delay(2, 3)

        # Scroll to load more jobs
        for _ in range(3):
            await page.keyboard.press("End")
            await self.human_delay(1, 2)

        job_cards = await page.query_selector_all(".jobs-search__results-list li")
        logger.info(f"[LinkedIn] Found {len(job_cards)} listings for '{title}' in '{location}'")

        for i, card in enumerate(job_cards[:25]):  # Max 25 per search
            try:
                job = await self._parse_card(card, page)
                if job:
                    jobs.append(job)
                await self.human_delay(0.3, 0.8)
            except Exception as e:
                logger.debug(f"[LinkedIn] Card parse error: {e}")

        return jobs

    async def _parse_card(self, card, page: Page) -> Optional[JobListing]:
        try:
            title_el = await card.query_selector(".base-search-card__title")
            company_el = await card.query_selector(".base-search-card__subtitle")
            location_el = await card.query_selector(".job-search-card__location")
            link_el = await card.query_selector("a.base-card__full-link")

            title = await title_el.inner_text() if title_el else ""
            company = await company_el.inner_text() if company_el else ""
            location = await location_el.inner_text() if location_el else ""
            url = await link_el.get_attribute("href") if link_el else ""

            if not title or not company or not url:
                return None

            # Extract job ID from URL
            import re
            job_id_match = re.search(r'/jobs/view/(\d+)', url)
            job_id = job_id_match.group(1) if job_id_match else url[-20:]

            return JobListing(
                external_id=f"li_{job_id}",
                source="linkedin",
                url=url,
                apply_url=url,
                title=title.strip(),
                company=company.strip(),
                location=location.strip(),
                is_remote="remote" in location.lower(),
            )
        except Exception:
            return None

    async def get_job_details(self, page: Page, job: JobListing) -> JobListing:
        """Fetch full job description by visiting the job page."""
        try:
            await page.goto(job.url, wait_until="domcontentloaded")
            await self.human_delay(1, 2)
            desc_el = await page.query_selector(".description__text")
            if desc_el:
                job.description = await desc_el.inner_text()
        except Exception as e:
            logger.debug(f"[LinkedIn] Detail fetch error: {e}")
        return job
