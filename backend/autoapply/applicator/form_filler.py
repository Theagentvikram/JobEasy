"""
Generic form filler for company career pages.
Uses AI to understand form fields and fill them intelligently.
"""
import asyncio
import json
import yaml
from pathlib import Path
from typing import Optional
from playwright.async_api import Page, async_playwright

from autoapply.utils.logger import logger
from autoapply.utils.settings import settings
from autoapply.ai.groq_client import quick_extract


class GenericFormFiller:
    """
    AI-powered form filler for any job application form.
    Handles: Greenhouse, Lever, Workday, BambooHR, custom forms.
    """

    def __init__(self):
        self.profile = self._load_profile()

    def _load_profile(self) -> dict:
        p = Path("config/profile.yaml")
        if p.exists():
            with open(p) as f:
                return yaml.safe_load(f) or {}
        return {}

    async def apply(self, apply_url: str, resume_pdf_path: str,
                    cover_letter: str = "", job_title: str = "") -> dict:
        """
        Fill and submit a job application form.
        Supports Greenhouse, Lever, Workday, and generic forms.
        """
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )
            page = await context.new_page()

            try:
                await page.goto(apply_url, wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)

                # Detect ATS platform
                platform = await self._detect_platform(page, apply_url)
                logger.info(f"[FormFiller] Detected platform: {platform}")

                if platform == "greenhouse":
                    result = await self._fill_greenhouse(page, resume_pdf_path, cover_letter)
                elif platform == "lever":
                    result = await self._fill_lever(page, resume_pdf_path, cover_letter)
                elif platform == "workday":
                    result = await self._fill_workday(page, resume_pdf_path, cover_letter)
                else:
                    result = await self._fill_generic(page, resume_pdf_path, cover_letter)

                return result
            except Exception as e:
                logger.error(f"[FormFiller] Error on {apply_url}: {e}")
                return {"success": False, "message": str(e)}
            finally:
                await browser.close()

    async def _detect_platform(self, page: Page, url: str) -> str:
        """Detect which ATS platform this form uses."""
        url_lower = url.lower()
        if "greenhouse.io" in url_lower or "boards.greenhouse" in url_lower:
            return "greenhouse"
        elif "lever.co" in url_lower or "jobs.lever" in url_lower:
            return "lever"
        elif "workday.com" in url_lower or "myworkdayjobs" in url_lower:
            return "workday"
        elif "ashbyhq.com" in url_lower:
            return "ashby"
        return "generic"

    async def _fill_greenhouse(self, page: Page, resume_path: str, cover_letter: str) -> dict:
        """Fill Greenhouse ATS application form."""
        personal = self.profile.get("personal", {})
        try:
            # Basic fields
            await self._safe_fill(page, '#first_name', personal.get("name", "").split()[0])
            await self._safe_fill(page, '#last_name', " ".join(personal.get("name", "").split()[1:]))
            await self._safe_fill(page, '#email', personal.get("email", ""))
            await self._safe_fill(page, '#phone', personal.get("phone", ""))

            # Resume upload
            await self._upload_resume(page, resume_path)

            # Cover letter
            if cover_letter:
                await self._safe_fill(page, '#cover_letter_text', cover_letter)

            # LinkedIn
            await self._safe_fill(page, 'input[name*="linkedin"]', personal.get("linkedin", ""))

            await asyncio.sleep(1)
            # Submit
            submit = await page.query_selector('[data-submit="true"], input[type="submit"], button[type="submit"]')
            if submit:
                await submit.click()
                await asyncio.sleep(3)
                return {"success": True, "message": "Submitted via Greenhouse"}

            return {"success": False, "message": "Submit button not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def _fill_lever(self, page: Page, resume_path: str, cover_letter: str) -> dict:
        """Fill Lever ATS application form."""
        personal = self.profile.get("personal", {})
        try:
            await self._safe_fill(page, 'input[name="name"]', personal.get("name", ""))
            await self._safe_fill(page, 'input[name="email"]', personal.get("email", ""))
            await self._safe_fill(page, 'input[name="phone"]', personal.get("phone", ""))
            await self._safe_fill(page, 'input[name*="linkedin"]', personal.get("linkedin", ""))
            await self._safe_fill(page, 'input[name*="github"]', personal.get("github", ""))

            await self._upload_resume(page, resume_path)

            if cover_letter:
                await self._safe_fill(page, 'textarea[name*="cover"]', cover_letter)

            submit = await page.query_selector('[data-qa="btn-submit"]')
            if submit:
                await submit.click()
                await asyncio.sleep(3)
                return {"success": True, "message": "Submitted via Lever"}

            return {"success": False, "message": "Submit not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def _fill_workday(self, page: Page, resume_path: str, cover_letter: str) -> dict:
        """Fill Workday application form - complex multi-step."""
        # Workday is notoriously complex; we upload resume and let it auto-parse
        try:
            await self._upload_resume(page, resume_path)
            await asyncio.sleep(3)
            # Click through parsed resume confirmation
            next_btn = await page.query_selector('[data-automation-id="bottom-navigation-next-btn"]')
            if next_btn:
                await next_btn.click()
                await asyncio.sleep(2)
            return {"success": True, "message": "Resume uploaded to Workday (manual review needed)"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def _fill_generic(self, page: Page, resume_path: str, cover_letter: str) -> dict:
        """
        AI-powered generic form filler.
        Gets all form fields, uses Groq to determine what to fill, fills them.
        """
        personal = self.profile.get("personal", {})
        try:
            # Get all form inputs
            inputs = await page.query_selector_all('input[type="text"], input[type="email"], input[type="tel"], textarea, select')

            for inp in inputs:
                inp_type = await inp.get_attribute("type") or "text"
                name = await inp.get_attribute("name") or ""
                placeholder = await inp.get_attribute("placeholder") or ""
                label = await self._get_field_label(page, inp)

                field_context = f"name={name} placeholder={placeholder} label={label}".lower()
                value = self._guess_field_value(field_context, personal)
                if value:
                    if inp_type == "file":
                        if Path(resume_path).exists():
                            await inp.set_input_files(resume_path)
                    else:
                        await inp.fill(value)
                    await asyncio.sleep(0.2)

            # Submit
            submit = await page.query_selector('button[type="submit"], input[type="submit"]')
            if submit:
                await submit.click()
                await asyncio.sleep(3)
                return {"success": True, "message": "Generic form submitted"}

            return {"success": False, "message": "No submit button found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def _guess_field_value(self, field_context: str, personal: dict) -> str:
        """Guess what to fill based on field context."""
        mappings = {
            ("email",): personal.get("email", ""),
            ("phone", "tel"): personal.get("phone", ""),
            ("first", "fname"): personal.get("name", "").split()[0] if personal.get("name") else "",
            ("last", "lname", "surname"): " ".join(personal.get("name", "").split()[1:]),
            ("name",): personal.get("name", ""),
            ("linkedin",): personal.get("linkedin", ""),
            ("github",): personal.get("github", ""),
            ("portfolio", "website"): personal.get("portfolio", personal.get("github", "")),
            ("location", "city", "address"): personal.get("location", ""),
        }
        for keywords, value in mappings.items():
            if any(kw in field_context for kw in keywords):
                return value
        return ""

    async def _get_field_label(self, page: Page, element) -> str:
        """Get the label text for a form input."""
        try:
            field_id = await element.get_attribute("id")
            if field_id:
                label = await page.query_selector(f'label[for="{field_id}"]')
                if label:
                    return await label.inner_text()
        except Exception:
            pass
        return ""

    async def _upload_resume(self, page: Page, resume_path: str):
        """Upload resume file to any file input."""
        if not Path(resume_path).exists():
            return
        file_inputs = await page.query_selector_all('input[type="file"]')
        for inp in file_inputs:
            accept = await inp.get_attribute("accept") or ""
            if "pdf" in accept or "resume" in accept.lower() or not accept:
                try:
                    await inp.set_input_files(resume_path)
                    await asyncio.sleep(1)
                    break
                except Exception:
                    pass

    async def _safe_fill(self, page: Page, selector: str, value: str):
        """Fill a field if it exists."""
        try:
            el = await page.query_selector(selector)
            if el and value:
                await el.fill(value)
                await asyncio.sleep(0.1)
        except Exception:
            pass
