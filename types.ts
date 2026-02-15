export interface AnalysisResult {
  score: number;
  candidateInfo: {
    name: string;
    headline: string;
    email: string;
  };
  summary: string;
  skillsDetected: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  improvements: string[];
  hardSkills: string[];
  softSkills: string[];
  sectionScores: {
    impact: number;
    brevity: number;
    style: number;
    structure: number;
    hardSkills?: number; // New split
    softSkills?: number; // New split
    recruiterImpact?: number; // New split
  };
  // New detailed fields for Premium Views
  hardSkillsAnalysis?: { skill: string; mastery: number }[];
  softSkillsAnalysis?: { skill: string; context: string }[];
  impactAnalysis?: { point: string; score: number; feedback: string }[];
}

export enum AppState {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SCANNER = 'SCANNER',
}

// Resume Builder Types
export interface Resume {
  id: string;
  userId?: string;
  sourceHash?: string;
  templateId: string; // 'modern' | 'professional' | 'minimalist' | 'creative'
  title: string;
  lastModified: string;
  score: number;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    title: string;
  };
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  awards: GenericItem[];
  achievements: GenericItem[];
  publications: GenericItem[];
  references: GenericItem[];
  volunteering: GenericItem[];
  custom: CustomSection[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  link: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface GenericItem {
  id: string;
  title: string;
  subtitle: string; // e.g. Issuer, Organization
  date: string;
  description: string;
}

export interface CustomSection {
  id: string;
  name: string;
  items: GenericItem[];
}

export enum JobStatus {
  WAITING_REFERRAL = "waiting_referral",
  REFERRAL_RECEIVED = "referral_received",
  APPLY_TODAY = "apply_today",
  APPLIED = "applied",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
  CLOSED = "closed",
}

export enum OutreachStatus {
  PENDING = "pending",
  VIEWED = "viewed",
  REPLIED = "replied",
  REFERRAL_GIVEN = "referral_given",
  DECLINED = "declined",
  // legacy aliases
  ACCEPTED = "accepted",
  NO_RESPONSE = "no_response",
  REJECTED = "rejected",
}

export interface Outreach {
  id: string;
  jobId: string;
  contactName: string;
  contactTitle?: string;
  platform: string;
  responseStatus?: OutreachStatus | string;
  status?: OutreachStatus | string;
  contactLink?: string;
  messageSent?: string;
  responseNotes?: string;
  notes?: string;
  dateConnected?: string;
  dateConnnected?: string;
  dateResponded?: string;
  followUpDate?: string;
  createdAt?: string;
}

export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  source: string;
  sourceOther?: string;
  link?: string;
  jobDescription?: string;
  location?: string;
  jobType?: 'remote' | 'hybrid' | 'onsite' | 'unknown' | string;
  salaryRange?: string;
  sponsorshipRequired?: boolean;
  dateDiscovered: string;
  waitingPeriod: number;
  outreachCount: number;
  status: JobStatus;
  priority?: number;
  notes?: string;
  tags?: string[];
  outreach: Outreach[];
  autoMoveDate?: string;
  dateApplied?: string;
  dateClosed?: string;
  createdAt?: string;
  updatedAt?: string;
  effectiveStatus?: JobStatus | string;
  daysUntilApply?: number;
}
