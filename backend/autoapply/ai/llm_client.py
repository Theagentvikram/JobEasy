"""
Unified LLM client.
Default: Groq (free, 14,400 req/day on free tier).
Swappable via AI_PROVIDER env var if you ever need to change.

To switch providers, just set in .env:
  AI_PROVIDER=groq       # default, free
  AI_PROVIDER=openai     # if you have OpenAI key
  AI_PROVIDER=claude     # if you have Anthropic key
  AI_PROVIDER=openclaw   # OpenAI-compatible custom endpoint
  AI_PROVIDER=ollama     # local Ollama (Pi or local machine), falls back to Groq if offline

For Ollama, also set:
  OLLAMA_HOST=http://raspberrypi.local:11434   # or your Pi's IP
  OLLAMA_MODEL=gemma3:4b                       # or mistral, llama3, etc.
  OLLAMA_FAST_MODEL=gemma3:1b                  # smaller model for quick tasks
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
    "ollama": os.getenv("OLLAMA_MODEL", "gemma3:4b"),
}

# Fast/cheap model for simple tasks (parsing, classification)
FAST_MODELS = {
    "groq": os.getenv("AI_FAST_MODEL", "llama-3.1-8b-instant"),  # replaces decommissioned llama3-8b-8192
    "openai": os.getenv("AI_FAST_MODEL", "gpt-4o-mini"),
    "claude": os.getenv("AI_FAST_MODEL", "claude-haiku-4-5-20251001"),
    "openclaw": os.getenv("AI_FAST_MODEL", "gpt-4o-mini"),
    "ollama": os.getenv("OLLAMA_FAST_MODEL", os.getenv("OLLAMA_MODEL", "gemma3:1b")),
}


def _get_client(provider: str = AI_PROVIDER):
    """Return the appropriate LLM client based on provider."""
    if provider == "groq":
        from groq import AsyncGroq
        return AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))

    elif provider == "openai":
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    elif provider == "claude":
        # Wrap Anthropic to look like OpenAI interface
        return _AnthropicWrapper()

    elif provider == "openclaw":
        from openai import AsyncOpenAI
        return AsyncOpenAI(
            api_key=os.getenv("OPENCLAW_API_KEY", os.getenv("OPENAI_API_KEY", "")),
            base_url=os.getenv("OPENCLAW_BASE_URL", "https://api.openclaw.ai/v1"),
        )

    elif provider == "ollama":
        from openai import AsyncOpenAI
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        return AsyncOpenAI(
            api_key="ollama",  # Ollama doesn't check keys
            base_url=f"{ollama_host.rstrip('/')}/v1",
        )

    raise ValueError(f"Unknown AI_PROVIDER: {provider}")


async def chat(prompt: str, system: str = "You are a helpful assistant. Return valid JSON when asked.",
               fast: bool = False, temperature: float = 0) -> str:
    """
    Single unified chat call. Returns raw string response.
    fast=True uses the cheaper/faster model (for parsing/classification).
    If AI_PROVIDER=ollama and the Pi/Ollama is unreachable, falls back to Groq automatically.
    """
    import asyncio as _asyncio

    providers_to_try = [AI_PROVIDER]
    if AI_PROVIDER == "ollama":
        providers_to_try.append("groq")  # fallback when Pi is offline

    last_error = None
    for provider in providers_to_try:
        model = FAST_MODELS.get(provider) if fast else MODELS.get(provider)
        client = _get_client(provider)

        if provider == "claude":
            try:
                return await client.chat(prompt, system, model)
            except Exception as e:
                logger.error(f"[LLM:claude] Error: {e}")
                last_error = e
                continue

        for attempt in range(3):
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
                if provider != AI_PROVIDER:
                    logger.info(f"[LLM] Used fallback provider '{provider}' (primary '{AI_PROVIDER}' unreachable)")
                return response.choices[0].message.content.strip()
            except Exception as e:
                err_str = str(e)
                logger.error(f"[LLM:{provider}] Error: {e}")
                # Retry on rate limit with backoff (same provider)
                if "rate_limit_exceeded" in err_str and attempt < 2:
                    wait = 5 * (attempt + 1)
                    logger.info(f"[LLM] Rate limited, retrying in {wait}s...")
                    await _asyncio.sleep(wait)
                    continue
                # Connection errors on Ollama → break to try fallback
                is_conn_err = any(k in err_str.lower() for k in [
                    "connection refused", "connect error", "connection error",
                    "timeout", "cannot connect", "network", "httpx"
                ])
                if provider == "ollama" and is_conn_err:
                    logger.warning(f"[LLM] Ollama unreachable at {os.getenv('OLLAMA_HOST', 'localhost:11434')}, falling back to Groq")
                    last_error = e
                    break
                last_error = e
                raise

    raise last_error or RuntimeError("All LLM providers failed")


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
