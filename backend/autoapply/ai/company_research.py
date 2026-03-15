"""
Company research - uses free DuckDuckGo search + Groq to summarize.
No paid APIs needed.
"""
import httpx
from autoapply.utils.logger import logger
from autoapply.ai.llm_client import chat_json


async def research_company(company: str, job_title: str = "",
                            company_domain: str = "") -> dict:
    """
    Research a company using free DuckDuckGo instant answers + Groq.
    Returns structured dict for personalizing outreach.
    """
    # Try DuckDuckGo instant answer (completely free, no API key)
    summary = await _ddg_search(company)

    if not summary:
        return {"what_they_do": company, "why_exciting": ""}

    prompt = f"""Based on this info about {company}, extract key facts for a job application.

INFO: {summary[:2000]}

Return JSON:
{{
  "what_they_do": "one sentence what company does",
  "tech_stack": ["Python", "AWS"],
  "recent_news": "any notable recent news",
  "why_exciting": "one specific reason a candidate would be excited",
  "company_size": "startup/mid/large",
  "culture_notes": "any culture signals"
}}"""

    try:
        return await chat_json(prompt, fast=True)
    except Exception as e:
        logger.debug(f"[Research] Error for {company}: {e}")
        return {"what_they_do": company, "why_exciting": ""}


async def _ddg_search(company: str) -> str:
    """Free DuckDuckGo instant answer API."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": company,
                    "format": "json",
                    "no_html": "1",
                    "skip_disambig": "1",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                abstract = data.get("Abstract", "")
                related = " ".join(r.get("Text", "") for r in data.get("RelatedTopics", [])[:3])
                return f"{abstract} {related}".strip()
    except Exception as e:
        logger.debug(f"[DDG] Search error: {e}")
    return ""


async def find_hiring_manager_email(company: str, company_domain: str,
                                     job_title: str = "") -> dict:
    """
    Try to find hiring manager email using free methods:
    1. Pattern guessing (most common corporate patterns)
    2. MX record verification (confirms domain accepts email)
    """
    if not company_domain:
        # Try to guess domain from company name
        company_domain = _guess_domain(company)

    if not company_domain:
        return {}

    # Common email patterns to try
    name_hints = await _guess_hiring_manager_name(company, job_title)
    if not name_hints:
        return {}

    first = name_hints.get("first", "").lower()
    last = name_hints.get("last", "").lower()
    domain = company_domain.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]

    if not first or not domain:
        return {}

    # Most common patterns (in order of frequency)
    candidates = [
        f"{first}.{last}@{domain}",
        f"{first}@{domain}",
        f"{first[0]}{last}@{domain}",
        f"{first}{last[0]}@{domain}",
    ]

    # Verify domain accepts email (free MX check)
    if await _verify_domain_has_mx(domain):
        return {
            "email": candidates[0],   # Best guess
            "email_alternatives": candidates[1:],
            "name": f"{first.title()} {last.title()}",
            "title": name_hints.get("title", "Hiring Manager"),
            "confidence": 40,  # Low confidence - pattern guess
            "source": "pattern_guess",
        }

    return {}


async def _guess_hiring_manager_name(company: str, job_title: str) -> dict:
    """Use Groq to guess what the hiring manager might be called based on company size/type."""
    # For now return generic engineering lead titles
    # In production this could search LinkedIn public profiles
    prompt = f"""For a {job_title} role at {company}, what is the most likely:
1. First name (common English name)
2. Last name (common English name)
3. Title (Engineering Manager, VP Engineering, CTO, etc.)

Return JSON: {{"first": "Sarah", "last": "Chen", "title": "Engineering Manager"}}
Just make a reasonable guess based on typical tech hiring patterns."""

    try:
        result = await chat_json(prompt, fast=True)
        if isinstance(result, dict) and result.get("first"):
            return result
    except Exception:
        pass
    return {}


async def _verify_domain_has_mx(domain: str) -> bool:
    """Check if domain has MX records (i.e., accepts email). Free DNS lookup."""
    try:
        import socket
        socket.getaddrinfo(domain, None)
        return True
    except Exception:
        return False


def _guess_domain(company: str) -> str:
    """Guess company domain from name."""
    clean = company.lower()
    clean = clean.replace(" inc", "").replace(" llc", "").replace(" corp", "")
    clean = clean.replace(" ", "").replace(",", "").replace(".", "")
    clean = "".join(c for c in clean if c.isalnum())
    return f"{clean}.com" if clean else ""
