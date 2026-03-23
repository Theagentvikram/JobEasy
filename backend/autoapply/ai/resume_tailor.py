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

    keywords_present = match_data.get('keywords_matched', []) if match_data else []
    keywords_missing = match_data.get('keywords_missing', []) if match_data else []

    prompt = f"""You are an expert resume writer. Rewrite the candidate's resume to maximise ATS score for the specific job below.

JOB: {job_title} at {company}

JOB DESCRIPTION:
{job_description[:2500]}

CURRENT RESUME:
{base_resume_text[:2500]}

KEYWORDS ALREADY PRESENT: {', '.join(keywords_present[:15]) if keywords_present else 'see resume'}
KEYWORDS TO ADD (missing from resume but required by JD): {', '.join(keywords_missing[:15]) if keywords_missing else 'extract from JD'}

Rules:
- Rewrite EVERY bullet point to be more relevant to this specific job
- Naturally weave in ALL missing keywords where truthfully applicable
- Lead each bullet with a strong action verb + metric where possible
- Keep all facts TRUE — only reframe, never fabricate
- Reorder experience bullets to put most relevant ones first
- Update the summary to directly address this role

Return ONLY valid JSON (no markdown fences):
{{
  "resume_markdown": "# Full Name\\n...(complete rewritten resume in markdown)...",
  "summary_statement": "2-3 sentence tailored professional summary targeting this specific role",
  "key_changes": ["Added Kubernetes keyword to DevOps bullet", "Reordered AWS experience to top"],
  "ats_keywords_added": ["keyword1", "keyword2"]
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
