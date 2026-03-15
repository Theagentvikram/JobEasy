"""
Unified LLM client.
Default: Groq (free, 14,400 req/day on free tier).
Swappable via AI_PROVIDER env var if you ever need to change.

To switch providers, just set in .env:
  AI_PROVIDER=groq       # default, free
  AI_PROVIDER=openai     # if you have OpenAI key
  AI_PROVIDER=claude     # if you have Anthropic key
  AI_PROVIDER=openclaw   # OpenAI-compatible custom endpoint
"""
import json
import os
from typing import Optional
from autoapply.utils.logger import logger


# ── Provider config ───────────────────────────────────────────
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq").lower()

# Model selection per provider (override via env)
MODELS = {
    "groq": os.getenv("AI_MODEL", "llama-3.3-70b-versatile"),   # Free, very capable
    "openai": os.getenv("AI_MODEL", "gpt-4o-mini"),
    "claude": os.getenv("AI_MODEL", "claude-haiku-4-5-20251001"),
    "openclaw": os.getenv("AI_MODEL", "gpt-4o-mini"),
}

# Fast/cheap model for simple tasks (parsing, classification)
FAST_MODELS = {
    "groq": os.getenv("AI_FAST_MODEL", "llama3-8b-8192"),       # 30k tokens/min free
    "openai": os.getenv("AI_FAST_MODEL", "gpt-4o-mini"),
    "claude": os.getenv("AI_FAST_MODEL", "claude-haiku-4-5-20251001"),
    "openclaw": os.getenv("AI_FAST_MODEL", "gpt-4o-mini"),
}


def _get_client():
    """Return the appropriate LLM client based on AI_PROVIDER."""
    if AI_PROVIDER == "groq":
        from groq import AsyncGroq
        return AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))

    elif AI_PROVIDER == "openai":
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    elif AI_PROVIDER == "claude":
        # Wrap Anthropic to look like OpenAI interface
        return _AnthropicWrapper()

    elif AI_PROVIDER == "openclaw":
        from openai import AsyncOpenAI
        return AsyncOpenAI(
            api_key=os.getenv("OPENCLAW_API_KEY", os.getenv("OPENAI_API_KEY", "")),
            base_url=os.getenv("OPENCLAW_BASE_URL", "https://api.openclaw.ai/v1"),
        )

    raise ValueError(f"Unknown AI_PROVIDER: {AI_PROVIDER}")


async def chat(prompt: str, system: str = "You are a helpful assistant. Return valid JSON when asked.",
               fast: bool = False, temperature: float = 0) -> str:
    """
    Single unified chat call. Returns raw string response.
    fast=True uses the cheaper/faster model (for parsing/classification).
    """
    model = FAST_MODELS.get(AI_PROVIDER) if fast else MODELS.get(AI_PROVIDER)
    client = _get_client()

    if AI_PROVIDER == "claude":
        return await client.chat(prompt, system, model)

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=4000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"[LLM:{AI_PROVIDER}] Error: {e}")
        raise


async def chat_json(prompt: str, system: str = "Return valid JSON only.",
                    fast: bool = False) -> dict | list:
    """Chat and parse JSON response. Strips markdown code blocks."""
    raw = await chat(prompt, system=system, fast=fast)
    return _parse_json(raw)


def _parse_json(raw: str) -> dict | list:
    """Parse JSON, stripping markdown code blocks if present."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON in the text
        import re
        match = re.search(r'[\[{].*[\]}]', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        logger.warning(f"[LLM] Could not parse JSON: {text[:200]}")
        return {}


class _AnthropicWrapper:
    """Wraps Anthropic to match the groq/openai interface."""
    async def chat(self, prompt: str, system: str, model: str) -> str:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        resp = await client.messages.create(
            model=model,
            max_tokens=4000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
