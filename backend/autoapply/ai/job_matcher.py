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

    # Build raw resume text if available
    raw_resume = profile.get("_raw_resume", "")
    resume_section = f"\nFull resume text:\n{raw_resume[:2000]}" if raw_resume else ""

    prompt = f"""You are an ATS scoring engine. Analyze how well this candidate matches the job and return a JSON score.

CANDIDATE PROFILE:
- Skills: {', '.join(all_skills[:25]) if all_skills else '(see resume below)'}
- Experience: {exp_summary if exp_summary else '(see resume below)'}
{resume_section}

JOB POSTING:
- Title: {job_title}
- Company: {company}
- Description: {description[:2000]}

Carefully read both the candidate profile and job description. Score based on actual skill overlap, experience level match, and role requirements.

Return ONLY this JSON (no markdown, no explanation):
{{
  "score": <integer 0-100 reflecting true match quality>,
  "tier": "<A if 80+, B if 65-79, C if 50-64, D if below 50>",
  "reasons": ["<specific reason 1>", "<specific reason 2>"],
  "keywords_matched": ["<skill found in both>"],
  "keywords_missing": ["<important skill in JD but not in resume>"],
  "red_flags": ["<any dealbreakers>"],
  "salary_likely_ok": true
}}

IMPORTANT: Do NOT use placeholder values. Score must reflect the actual match quality. A perfect DevOps engineer applying for a React role should score 20-30, not 85."""

    try:
        result = await chat_json(prompt, fast=True)  # Use fast model for scoring
        if not isinstance(result, dict):
            raise ValueError("Expected dict")
        return result
    except Exception as e:
        logger.error(f"[Matcher] Error scoring {job_title} at {company}: {e}")
        return {"score": 50, "tier": "C", "reasons": ["Scoring failed"],
                "keywords_matched": [], "keywords_missing": [], "red_flags": []}
