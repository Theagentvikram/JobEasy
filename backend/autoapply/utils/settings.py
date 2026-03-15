"""Application settings - loaded from .env"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── AI (Groq is default - free) ───────────────────────────
    ai_provider: str = "groq"          # groq | openai | claude | openclaw
    ai_model: str = ""                  # leave blank to use provider default
    ai_fast_model: str = ""             # leave blank to use provider default
    groq_api_key: str = ""              # console.groq.com - free tier

    # Optional alternative providers (only used if ai_provider is changed)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    openclaw_api_key: str = ""
    openclaw_base_url: str = ""

    # ── Email (Gmail SMTP - free) ─────────────────────────────
    gmail_sender_email: str = ""
    gmail_app_password: str = ""        # myaccount.google.com/apppasswords

    # ── LinkedIn (for Easy Apply bot) ────────────────────────
    linkedin_email: str = ""
    linkedin_password: str = ""

    # ── Database (SQLite - no server needed) ─────────────────
    database_url: str = "sqlite+aiosqlite:///./autoapply.db"

    # ── App ───────────────────────────────────────────────────
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    secret_key: str = "change-me-in-production"

    # ── Job search preferences ────────────────────────────────
    job_titles: str = "Software Engineer,Backend Engineer,Full Stack Developer"
    job_locations: str = "Remote,San Francisco,New York"
    min_salary: int = 80000
    max_applications_per_day: int = 20
    match_score_threshold: float = 70.0
    blacklist_companies: str = ""

    # ── Cold email ────────────────────────────────────────────
    cold_email_enabled: bool = True
    daily_email_limit: int = 15
    email_delay_seconds: int = 45

    # ── Schedule ──────────────────────────────────────────────
    pipeline_hour: int = 9             # Run daily at this hour (24h, UTC)
    pipeline_minute: int = 0

    @property
    def job_titles_list(self) -> List[str]:
        return [t.strip() for t in self.job_titles.split(",") if t.strip()]

    @property
    def job_locations_list(self) -> List[str]:
        return [l.strip() for l in self.job_locations.split(",") if l.strip()]

    @property
    def blacklist_list(self) -> List[str]:
        return [c.strip().lower() for c in self.blacklist_companies.split(",") if c.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
