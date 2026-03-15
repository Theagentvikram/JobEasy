"""
Job matching engine - uses Groq (free) by default.
Scores how well a job matches the user's profile (0-100).
"""
import yaml
from pathlib import Path
from autoapply.utils.logger import logger
from autoapply.ai.llm_client import chat_json


def load_profile() -> dict:
    p = Path("config/profile.yaml")
    if p.exists():
        with open(p) as f:
            return yaml.safe_load(f) or {}
    return {}


async def score_job_match(job_title: str, company: str,
                           description: str, requirements: list = None,
                           profile: dict = None) -> dict:
    """
    Score job-profile compatibility using Groq.
    Returns: {score, tier, reasons, keywords_matched, keywords_missing, red_flags}
    """
    if profile is None:
        profile = load_profile()

    prefs = profile.get("job_preferences", {})
    blacklist = [c.lower() for c in prefs.get("blacklist", [])]

    if company.lower() in blacklist:
        return {"score": 0, "tier": "F", "reasons": ["Blacklisted company"],
                "keywords_matched": [], "keywords_missing": [], "red_flags": ["blacklisted"]}

    skills = profile.get("skills", {})
    all_skills = [s for group in skills.values() for s in group]
    experience = profile.get("experience", [])
    exp_summary = " | ".join(f"{e['title']} at {e['company']}" for e in experience[:3])

    prompt = f"""Score this job match from 0-100.

CANDIDATE:
- Skills: {', '.join(all_skills[:25])}
- Experience: {exp_summary}
- Target roles: {', '.join(prefs.get('titles', []))}
- Min salary: ${prefs.get('min_salary', 0):,}
- Needs visa: {prefs.get('visa_sponsorship_needed', False)}

JOB:
- Title: {job_title}
- Company: {company}
- Requirements: {', '.join((requirements or [])[:15])}
- Description (first 1500 chars): {description[:1500]}

Return JSON:
{{
  "score": 85,
  "tier": "A",
  "reasons": ["Strong Python match", "Remote OK"],
  "keywords_matched": ["Python", "FastAPI"],
  "keywords_missing": ["Kubernetes"],
  "red_flags": [],
  "salary_likely_ok": true
}}

Scoring: 90-100=perfect, 70-89=good, 50-69=ok, <50=skip"""

    try:
        result = await chat_json(prompt, fast=True)  # Use fast model for scoring
        if not isinstance(result, dict):
            raise ValueError("Expected dict")
        return result
    except Exception as e:
        logger.error(f"[Matcher] Error scoring {job_title} at {company}: {e}")
        return {"score": 50, "tier": "C", "reasons": ["Scoring failed"],
                "keywords_matched": [], "keywords_missing": [], "red_flags": []}
