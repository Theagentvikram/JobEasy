from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Sub-components ---

class ExperienceItem(BaseModel):
    id: str
    role: str
    company: str
    startDate: str
    endDate: str
    description: str

class EducationItem(BaseModel):
    id: str
    degree: str
    school: str
    year: str

class ProjectItem(BaseModel):
    id: str
    name: str
    description: str
    link: str

class CertificationItem(BaseModel):
    id: str
    name: str
    issuer: str
    date: str

class GenericItem(BaseModel):
    id: str
    title: str
    subtitle: str  # e.g. Issuer, Organization
    date: str
    description: str

class CustomSection(BaseModel):
    id: str
    name: str
    items: List[GenericItem] = []

class PersonalInfo(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str = ""
    title: str = ""

# --- Main Resume Model ---

class Resume(BaseModel):
    id: str
    templateId: str = "modern"
    title: str = "Untitled Resume"
    lastModified: str
    score: int = 0
    personalInfo: PersonalInfo
    summary: str = ""
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    skills: List[str] = []
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    awards: List[GenericItem] = []
    achievements: List[GenericItem] = []
    publications: List[GenericItem] = []
    references: List[GenericItem] = []
    volunteering: List[GenericItem] = []
    custom: List[CustomSection] = []
    userId: Optional[str] = None # Added for ownership

class ATSScan(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = None
    createdAt: Optional[str] = None
    score: int
    summary: str
    missingKeywords: List[str] = []
    hardSkills: List[str] = []
    softSkills: List[str] = []
    improvements: List[str] = []
    resumeId: Optional[str] = None
    jobDescription: Optional[str] = ""

# --- AI Analysis Models ---

class AnalysisRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class SectionScore(BaseModel):
    impact: int
    brevity: int
    style: int
    structure: int

class CandidateInfo(BaseModel):
    name: str = "Unknown"
    headline: str = "Unknown"
    email: str = "Unknown"

class AnalysisResult(BaseModel):
    score: int
    candidateInfo: CandidateInfo
    summary: str
    skillsDetected: List[str]
    keywordsMissing: List[str]
    formattingIssues: List[str]
    improvements: List[str]
    sectionScores: SectionScore

# --- Generation Models ---

class BulletPointRequest(BaseModel):
    role: str
    company: str
    description: Optional[str] = None

class SummaryRequest(BaseModel):
    role: str
    skills: List[str]

# --- Referral Flow Models ---

class JobStatus(str):
    WAITING_REFERRAL = "waiting_referral"
    REFERRAL_RECEIVED = "referral_received"
    APPLY_TODAY = "apply_today"
    APPLIED = "applied"
    CLOSED = "closed"

class OutreachStatus(str):
    PENDING = "pending"
    ACCEPTED = "accepted"
    NO_RESPONSE = "no_response"
    REJECTED = "rejected"

class Outreach(BaseModel):
    id: str
    jobId: str
    contactName: str
    platform: str = "LinkedIn" # LinkedIn, Email, Twitter, etc.
    status: str = OutreachStatus.PENDING
    notes: Optional[str] = ""
    dateConnnected: str # ISO date string

class Job(BaseModel):
    id: str
    userId: str
    title: str
    company: str
    source: str = "LinkedIn"
    link: Optional[str] = ""
    dateDiscovered: str # ISO date string
    waitingPeriod: int = 2 # Days to wait before applying
    outreachCount: int = 0
    status: str = JobStatus.WAITING_REFERRAL
    notes: Optional[str] = ""
    outreach: List[Outreach] = []
    autoMoveDate: Optional[str] = None # Calculated date when it moves to Apply Today
