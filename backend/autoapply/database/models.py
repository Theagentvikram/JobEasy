"""Database models for AutoApply."""
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, Enum, ForeignKey, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class JobStatus(str, PyEnum):
    DISCOVERED = "discovered"
    SCORED = "scored"
    SKIPPED = "skipped"          # Below match threshold
    RESUME_TAILORED = "resume_tailored"
    APPLIED = "applied"
    EMAIL_SENT = "email_sent"
    INTERVIEWING = "interviewing"
    REJECTED = "rejected"
    OFFER = "offer"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True)  # Platform job ID
    source = Column(String(50), index=True)     # linkedin | indeed | wellfound | glassdoor | career_page
    url = Column(Text, nullable=False)
    apply_url = Column(Text)

    # Job details
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False, index=True)
    company_domain = Column(String(255))
    location = Column(String(255))
    is_remote = Column(Boolean, default=False)
    employment_type = Column(String(50))
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    description = Column(Text)
    requirements = Column(JSON)              # Parsed list of requirements
    benefits = Column(JSON)

    # AI Analysis
    match_score = Column(Float)             # 0-100 match score
    match_reasons = Column(JSON)            # Why it matched/didn't match
    keywords_matched = Column(JSON)         # Skills that match
    keywords_missing = Column(JSON)         # Skills gap

    # Status tracking
    status = Column(Enum(JobStatus), default=JobStatus.DISCOVERED)
    discovered_at = Column(DateTime, default=datetime.utcnow)
    applied_at = Column(DateTime)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Application artifacts
    tailored_resume_path = Column(String(500))
    cover_letter = Column(Text)
    application_notes = Column(Text)

    # Cold email
    hiring_manager_email = Column(String(255))
    hiring_manager_name = Column(String(255))
    cold_email_sent = Column(Boolean, default=False)
    cold_email_sent_at = Column(DateTime)

    # Company research
    company_research = Column(JSON)         # Perplexity research summary

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    job = relationship("Job", back_populates="applications")

    applied_at = Column(DateTime, default=datetime.utcnow)
    method = Column(String(50))             # easy_apply | direct | email
    confirmation_id = Column(String(255))   # Application confirmation number
    status = Column(String(50), default="pending")
    notes = Column(Text)
    follow_up_at = Column(DateTime)


class RunLog(Base):
    __tablename__ = "run_logs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    jobs_discovered = Column(Integer, default=0)
    jobs_scored = Column(Integer, default=0)
    jobs_applied = Column(Integer, default=0)
    emails_sent = Column(Integer, default=0)
    errors = Column(JSON)
    status = Column(String(50), default="running")  # running | completed | failed
