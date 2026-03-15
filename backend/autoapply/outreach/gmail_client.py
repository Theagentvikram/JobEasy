"""
Email sender using Gmail SMTP - free, no OAuth setup needed.
Just needs your Gmail + App Password (2FA must be on).

Setup (one-time):
1. Enable 2FA on your Google account
2. Go to myaccount.google.com/apppasswords
3. Create app password → paste as GMAIL_APP_PASSWORD in .env

Sends up to 500 emails/day free.
"""
import asyncio
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from typing import Optional

from autoapply.utils.logger import logger
from autoapply.utils.settings import settings
from autoapply.ai.llm_client import chat_json, chat


async def send_cold_email(
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
    sender_name: str = None,
    attachment_path: Optional[str] = None,
) -> dict:
    """Send email via Gmail SMTP (free, up to 500/day)."""
    if not settings.gmail_sender_email or not settings.gmail_app_password:
        logger.warning("[Email] Gmail not configured - skipping")
        return {"success": False, "message": "Gmail not configured"}

    try:
        msg = MIMEMultipart("mixed")
        display_name = sender_name or settings.gmail_sender_email.split("@")[0].title()
        msg["From"] = f"{display_name} <{settings.gmail_sender_email}>"
        msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        msg["Subject"] = subject

        # Plain + HTML body
        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(body, "plain"))
        alt.attach(MIMEText(_to_html(body), "html"))
        msg.attach(alt)

        # Attach resume if provided
        if attachment_path and Path(attachment_path).exists():
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header("Content-Disposition",
                                f'attachment; filename="{Path(attachment_path).name}"')
                msg.attach(part)

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=settings.gmail_sender_email,
            password=settings.gmail_app_password,
        )

        logger.info(f"[Email] Sent to {to_email}")
        return {"success": True}

    except Exception as e:
        logger.error(f"[Email] Failed to {to_email}: {e}")
        return {"success": False, "message": str(e)}


async def generate_cold_email(
    candidate_name: str,
    hiring_manager_name: str,
    hiring_manager_title: str,
    company: str,
    job_title: str,
    company_research: dict,
    cover_letter_hooks: list,
    profile: dict,
) -> dict:
    """Generate personalized cold email using Groq (free)."""
    cold_prefs = profile.get("cold_email", {})
    personal = profile.get("personal", {})

    company_context = ""
    if company_research and company_research.get("what_they_do"):
        company_context = f"Company: {company_research['what_they_do']}"

    signature = cold_prefs.get("signature",
        f"Best,\n{candidate_name}\n{personal.get('email', '')}")

    prompt = f"""Write a cold outreach email.

FROM: {candidate_name} applying for {job_title} at {company}
TO: {hiring_manager_name or 'Hiring Manager'} ({hiring_manager_title or 'Engineering Lead'})
TONE: {cold_prefs.get('tone', 'professional')}
{company_context}
HOOKS (use 1): {cover_letter_hooks[:2]}

Rules:
- Subject: specific and intriguing, not generic
- Under 180 words, 3 short paragraphs
- First line: specific about the company (shows research)
- Include ONE metric-backed achievement
- Ask for a 20-min call
- NO: "hope this finds you well", "I came across your posting", "passion"

End with this exact signature:
{signature}

Return JSON: {{"subject": "...", "body": "full email text"}}"""

    try:
        result = await chat_json(prompt, fast=True)
        if isinstance(result, dict) and result.get("body"):
            return result
    except Exception as e:
        logger.error(f"[Email] Generation error: {e}")

    return {
        "subject": f"Quick question about {job_title} at {company}",
        "body": ""
    }


def _to_html(text: str) -> str:
    paragraphs = text.strip().split("\n\n")
    parts = [f"<p>{p.replace(chr(10), '<br>')}</p>" for p in paragraphs]
    return f'<html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">{"".join(parts)}</body></html>'
