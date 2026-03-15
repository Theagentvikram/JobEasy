"""
LinkedIn Easy Apply bot.
Automatically fills and submits Easy Apply forms using Playwright.
"""
import asyncio
import random
from pathlib import Path
from typing import Optional
from playwright.async_api import Page, async_playwright

from autoapply.utils.logger import logger
from autoapply.utils.settings import settings
from autoapply.scrapers.linkedin import LinkedInScraper, STEALTH_SCRIPT


class LinkedInApplyBot:
    """Automates LinkedIn Easy Apply submissions."""

    def __init__(self):
        self.scraper = LinkedInScraper()
        self._page: Optional[Page] = None
        self._playwright = None
        self._browser = None

    async def __aenter__(self):
        self._playwright = await async_playwright().__aenter__()
        self._browser = await self.scraper._get_browser(self._playwright)
        self._page = await self.scraper._new_page(self._browser)
        await self.scraper._login(self._page)
        return self

    async def __aexit__(self, *args):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.__aexit__(*args)

    async def apply(self, job_url: str, resume_pdf_path: str,
                    cover_letter: str = "") -> dict:
        """
        Apply to a LinkedIn job via Easy Apply.
        Returns: {success: bool, message: str, application_id: str}
        """
        page = self._page
        try:
            await page.goto(job_url, wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(2, 3))

            # Click Easy Apply button
            easy_apply_btn = await page.query_selector('[data-control-name="jobdetails_topcard_inapply"]') or \
                             await page.query_selector('.jobs-apply-button')

            if not easy_apply_btn:
                return {"success": False, "message": "No Easy Apply button found"}

            await easy_apply_btn.click()
            await asyncio.sleep(random.uniform(1.5, 2.5))

            # Handle multi-step form
            max_steps = 10
            for step in range(max_steps):
                logger.debug(f"[LinkedIn Apply] Step {step + 1}")

                # Upload resume if prompted
                await self._handle_resume_upload(page, resume_pdf_path)

                # Fill cover letter if field exists
                if cover_letter:
                    await self._fill_cover_letter(page, cover_letter)

                # Auto-fill common fields
                await self._autofill_fields(page)

                # Check if we're done
                submit_btn = await page.query_selector('[data-easy-apply-next-button]') or \
                             await page.query_selector('[aria-label="Submit application"]') or \
                             await page.query_selector('button[aria-label*="Submit"]')

                next_btn = await page.query_selector('[data-easy-apply-next-button]') or \
                           await page.query_selector('button[aria-label="Continue to next step"]')

                if submit_btn:
                    label = await submit_btn.get_attribute("aria-label") or ""
                    if "submit" in label.lower():
                        await submit_btn.click()
                        await asyncio.sleep(2)
                        logger.info(f"[LinkedIn Apply] Submitted application!")
                        return {
                            "success": True,
                            "message": "Application submitted via Easy Apply",
                            "application_id": ""
                        }

                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(random.uniform(1, 2))
                else:
                    # Try clicking any visible "Next" or "Continue"
                    buttons = await page.query_selector_all('button')
                    clicked = False
                    for btn in buttons:
                        text = await btn.inner_text()
                        if text.strip().lower() in ("next", "continue", "review"):
                            await btn.click()
                            clicked = True
                            await asyncio.sleep(random.uniform(1, 2))
                            break
                    if not clicked:
                        break

            return {"success": False, "message": "Reached max steps without submitting"}

        except Exception as e:
            logger.error(f"[LinkedIn Apply] Error: {e}")
            return {"success": False, "message": str(e)}

    async def _handle_resume_upload(self, page: Page, resume_path: str):
        """Upload resume if there's a file input."""
        try:
            file_input = await page.query_selector('input[type="file"]')
            if file_input and Path(resume_path).exists():
                await file_input.set_input_files(resume_path)
                await asyncio.sleep(1)
                logger.debug("[LinkedIn Apply] Resume uploaded")
        except Exception:
            pass

    async def _fill_cover_letter(self, page: Page, cover_letter: str):
        """Fill cover letter textarea if present."""
        try:
            textarea = await page.query_selector('textarea[id*="cover"]') or \
                       await page.query_selector('textarea[placeholder*="cover"]') or \
                       await page.query_selector('.jobs-easy-apply-form-element textarea')
            if textarea:
                await textarea.click()
                await textarea.fill(cover_letter[:2000])  # LinkedIn has character limits
                await asyncio.sleep(0.5)
        except Exception:
            pass

    async def _autofill_fields(self, page: Page):
        """Auto-fill common application form fields."""
        from autoapply.utils.settings import settings
        import yaml
        from pathlib import Path as P

        # Load profile for answers
        profile = {}
        if P("config/profile.yaml").exists():
            with open("config/profile.yaml") as f:
                profile = yaml.safe_load(f) or {}

        prefs = profile.get("job_preferences", {})

        # Common yes/no questions
        yes_no_map = {
            "authorized to work": "Yes",
            "require sponsorship": "No" if not prefs.get("visa_sponsorship_needed") else "Yes",
            "years of experience": "3",
            "remote": "Yes",
        }

        try:
            # Handle radio buttons for common questions
            questions = await page.query_selector_all('.jobs-easy-apply-form-element')
            for question in questions:
                label_el = await question.query_selector('label, legend')
                if not label_el:
                    continue
                label_text = (await label_el.inner_text()).lower()

                # Select appropriate radio/dropdown answer
                for keyword, answer in yes_no_map.items():
                    if keyword in label_text:
                        radio = await question.query_selector(f'input[type="radio"][value="{answer}"]')
                        if radio:
                            await radio.click()
                            await asyncio.sleep(0.3)
                            break

                # Fill numeric experience inputs
                if "years" in label_text and "experience" in label_text:
                    num_input = await question.query_selector('input[type="number"], input[type="text"]')
                    if num_input:
                        await num_input.fill("3")

        except Exception as e:
            logger.debug(f"[LinkedIn Apply] Autofill error: {e}")
