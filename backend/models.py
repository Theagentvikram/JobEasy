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
    sourceHash: Optional[str] = None
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
    skillsDetected: List[str] = []
    formattingIssues: List[str] = []
    sectionScores: Optional[Dict[str, Any]] = None
    candidateInfo: Optional[Dict[str, Any]] = None
    resumeId: Optional[str] = None
    jobDescription: Optional[str] = ""
    fileName: Optional[str] = ""

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
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    CLOSED = "closed"

class OutreachStatus(str):
    PENDING = "pending"
    VIEWED = "viewed"
    REPLIED = "replied"
    REFERRAL_GIVEN = "referral_given"
    DECLINED = "declined"
    # Legacy aliases (kept for compatibility)
    ACCEPTED = "accepted"
    NO_RESPONSE = "no_response"
    REJECTED = "rejected"

class Outreach(BaseModel):
    id: str = ""
    jobId: str = ""
    contactName: str = ""
    contactTitle: str = ""
    platform: str = "linkedin"  # linkedin, email, twitter, etc.
    contactLink: Optional[str] = ""
    # New primary status field
    responseStatus: str = OutreachStatus.PENDING
    # Legacy field preserved for backward compatibility in frontend
    status: str = OutreachStatus.PENDING
    messageSent: Optional[str] = ""
    responseNotes: Optional[str] = ""
    notes: Optional[str] = ""
    # Legacy typo kept intentionally for old docs/frontends
    dateConnnected: Optional[str] = ""
    dateConnected: Optional[str] = ""
    dateResponded: Optional[str] = ""
    followUpDate: Optional[str] = ""
    createdAt: Optional[str] = ""

class Job(BaseModel):
    id: str
    userId: str
    title: str
    company: str
    source: str = "linkedin"
    sourceOther: Optional[str] = ""
    link: Optional[str] = ""
    jobDescription: Optional[str] = ""
    location: Optional[str] = ""
    jobType: Optional[str] = "unknown"  # remote, hybrid, onsite, unknown
    salaryRange: Optional[str] = ""
    sponsorshipRequired: bool = False
    dateDiscovered: str # ISO date string
    waitingPeriod: int = 2 # Days to wait before applying
    outreachCount: int = 0
    status: str = JobStatus.WAITING_REFERRAL
    priority: int = 0 # 0-3
    notes: Optional[str] = ""
    tags: List[str] = []
    outreach: List[Outreach] = []
    autoMoveDate: Optional[str] = None # Calculated date when it moves to Apply Today
    dateApplied: Optional[str] = None
    dateClosed: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    # Computed on read (Option C style virtual status)
    effectiveStatus: Optional[str] = None
    daysUntilApply: Optional[int] = None
