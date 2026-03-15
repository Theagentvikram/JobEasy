"""
Resume PDF parser.
Extracts structured data from uploaded resume PDF.
Uses PyMuPDF (fitz) for text extraction + LLM for structuring.
"""
import json
from pathlib import Path
import fitz  # PyMuPDF
from autoapply.ai.llm_client import chat_json
from autoapply.utils.settings import settings
from autoapply.utils.logger import logger


async def parse_resume_pdf(pdf_path: str) -> dict:
    """
    Parse a resume PDF and return structured data.
    Also updates config/profile.yaml with extracted data.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {pdf_path}")

    # Extract text from PDF
    text = _extract_pdf_text(path)
    logger.info(f"[Parser] Extracted {len(text)} chars from {path.name}")

    # Use Claude to structure the data
    structured = await _structure_with_claude(text)

    # Save as profile YAML
    _save_profile(structured, pdf_path)

    return structured


def _extract_pdf_text(path: Path) -> str:
    """Extract plain text from PDF using PyMuPDF."""
    doc = fitz.open(str(path))
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    doc.close()
    return text.strip()


async def _structure_with_claude(resume_text: str) -> dict:
    """Use AI to convert resume text to structured YAML-ready format."""

    prompt = f"""Parse this resume and extract structured information.

RESUME TEXT:
{resume_text[:6000]}

Return valid JSON with this exact structure:
{{
  "personal": {{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1-555-0000",
    "location": "City, State",
    "linkedin": "https://linkedin.com/in/...",
    "github": "https://github.com/...",
    "portfolio": ""
  }},
  "skills": {{
    "programming_languages": ["Python", "JavaScript"],
    "frameworks": ["React", "FastAPI"],
    "databases": ["PostgreSQL"],
    "cloud": ["AWS"],
    "other": ["Docker", "CI/CD"]
  }},
  "experience": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "duration": "2022 - 2024",
      "highlights": [
        "Achievement with metric",
        "Another achievement"
      ]
    }}
  ],
  "education": [
    {{
      "degree": "B.S. Computer Science",
      "school": "University Name",
      "year": 2020,
      "gpa": null
    }}
  ],
  "raw_text": "original resume text preserved here"
}}

Extract EVERYTHING accurately. Preserve all quantified achievements."""

    try:
        # Use our centralized LLM client (Groq fast model by default)
        result = await chat_json(prompt, fast=True)
        if isinstance(result, dict) and "personal" in result:
            return result
        return {"raw_text": resume_text}
    except Exception as e:
        logger.error(f"[Parser] AI structuring failed: {e}")
        return {"raw_text": resume_text}


def _save_profile(data: dict, source_pdf: str):
    """Save parsed resume data to config/profile.yaml."""
    import yaml
    profile_path = Path("config/profile.yaml")

    # Load existing profile to preserve preferences
    existing = {}
    if profile_path.exists():
        with open(profile_path) as f:
            existing = yaml.safe_load(f) or {}

    # Merge: parsed data fills in the technical sections
    existing["personal"] = data.get("personal", existing.get("personal", {}))
    existing["skills"] = data.get("skills", existing.get("skills", {}))
    existing["experience"] = data.get("experience", existing.get("experience", []))
    existing["education"] = data.get("education", existing.get("education", []))
    existing["_resume_source"] = source_pdf

    # Keep job preferences if they exist
    if "job_preferences" not in existing:
        existing["job_preferences"] = {
            "titles": ["Software Engineer", "Senior Software Engineer"],
            "locations": ["Remote"],
            "min_salary": 80000,
            "visa_sponsorship_needed": False,
        }

    with open(profile_path, "w") as f:
        yaml.dump(existing, f, default_flow_style=False, allow_unicode=True)

    logger.info(f"[Parser] Profile saved to {profile_path}")
