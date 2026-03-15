"""
Kept for backwards compatibility.
All calls now go through llm_client.py
"""
from autoapply.ai.llm_client import chat, chat_json

async def quick_extract(content: str, prompt: str, **kwargs) -> str:
    return await chat(f"{prompt}\n\nContent:\n{content}", fast=True)

async def parse_job_requirements(description: str) -> dict:
    result = await chat_json(
        f"""Extract from this job description:
        {{"required_skills": [], "preferred_skills": [], "years_experience": 0,
          "is_remote": false, "visa_sponsorship": false, "key_responsibilities": []}}

        Description: {description[:2000]}""",
        fast=True
    )
    return result if isinstance(result, dict) else {}
