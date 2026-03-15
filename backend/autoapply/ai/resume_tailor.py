"""
Resume tailoring and cover letter generation - Groq (free).
"""
import yaml
from pathlib import Path
from autoapply.utils.logger import logger
from autoapply.ai.llm_client import chat, chat_json


def load_profile() -> dict:
    p = Path("config/profile.yaml")
    if p.exists():
        with open(p) as f:
            return yaml.safe_load(f) or {}
    return {}


def _profile_to_text(profile: dict) -> str:
    """Convert YAML profile to resume text."""
    personal = profile.get("personal", {})
    skills = profile.get("skills", {})
    experience = profile.get("experience", [])
    education = profile.get("education", [])

    lines = [
        f"# {personal.get('name', '')}",
        f"{personal.get('email', '')} | {personal.get('phone', '')} | {personal.get('location', '')}",
        f"{personal.get('linkedin', '')} | {personal.get('github', '')}",
        "", "## Skills",
    ]
    for cat, skill_list in skills.items():
        lines.append(f"**{cat.replace('_', ' ').title()}**: {', '.join(skill_list)}")

    lines += ["", "## Experience"]
    for exp in experience:
        lines.append(f"### {exp.get('title')} — {exp.get('company')} ({exp.get('duration')})")
        for h in exp.get("highlights", []):
            lines.append(f"- {h}")
        lines.append("")

    lines += ["## Education"]
    for edu in education:
        lines.append(f"**{edu.get('degree')}** — {edu.get('school')} ({edu.get('year')})")

    return "\n".join(lines)


async def tailor_resume(job_title: str, company: str,
                         job_description: str,
                         base_resume_text: str = None,
                         match_data: dict = None) -> dict:
    """Tailor resume for a specific job using Groq."""
    profile = load_profile()
    if not base_resume_text:
        base_resume_text = _profile_to_text(profile)

    keywords = ""
    if match_data:
        keywords = f"Emphasize: {', '.join(match_data.get('keywords_matched', []))}"

    prompt = f"""Rewrite this resume to maximize ATS match for the job below.

JOB: {job_title} at {company}
{keywords}

JOB DESCRIPTION (key parts):
{job_description[:2500]}

CURRENT RESUME:
{base_resume_text[:2500]}

Rules:
- Reorder bullet points to lead with most relevant experience
- Use exact keywords from the job description naturally
- Keep all facts TRUE - only reframe, never fabricate
- Quantify achievements where possible

Return JSON:
{{
  "resume_markdown": "# Full Name\\n...(complete tailored resume)...",
  "summary_statement": "2-sentence tailored professional summary",
  "key_changes": ["Moved AWS experience to top", "Added microservices keyword"],
  "ats_keywords_added": ["distributed systems", "CI/CD"],
  "cover_letter_hooks": ["your focus on ML infra matches my experience at X"]
}}"""

    try:
        result = await chat_json(prompt)
        if not isinstance(result, dict) or "resume_markdown" not in result:
            raise ValueError("Invalid response")
        return result
    except Exception as e:
        logger.error(f"[ResumeTailor] Error: {e}")
        return {
            "resume_markdown": base_resume_text,
            "summary_statement": "",
            "key_changes": [],
            "ats_keywords_added": [],
            "cover_letter_hooks": [],
        }


async def generate_cover_letter(job_title: str, company: str,
                                 job_description: str,
                                 resume_data: dict,
                                 company_research: dict = None) -> str:
    """Generate tailored cover letter using Groq."""
    profile = load_profile()
    personal = profile.get("personal", {})
    cold_prefs = profile.get("cold_email", {})

    company_context = ""
    if company_research and company_research.get("what_they_do"):
        company_context = f"Company context: {company_research.get('what_they_do', '')}"

    hooks = resume_data.get("cover_letter_hooks", [])

    prompt = f"""Write a concise cover letter (under 220 words, 3 paragraphs).

CANDIDATE: {personal.get('name', 'Candidate')}
JOB: {job_title} at {company}
TONE: {cold_prefs.get('tone', 'professional')}
{company_context}

JD HIGHLIGHTS: {job_description[:1000]}
TALKING POINTS: {hooks[:2]}

Rules:
- Para 1: Specific hook about THIS company (not generic interest)
- Para 2: One concrete achievement with a metric that maps to their need
- Para 3: Clear ask for a 20-min call
- NO clichés: "I am writing to express", "hope this finds you", "passion for"
- Sound human and specific

Return ONLY the cover letter text."""

    try:
        return await chat(prompt)
    except Exception as e:
        logger.error(f"[CoverLetter] Error: {e}")
        return ""
