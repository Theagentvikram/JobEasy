// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  plan: 'free' | 'pro'
  plan_type?: 'weekly' | 'monthly' | 'quarterly' | 'lifetime'
  plan_expires_at?: string | null
  scan_count: number
  resume_count: number
  resume_count_week: number
}

// ─── Resume ─────────────────────────────────────────────────────────────────

export interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedin?: string
  website?: string
  title?: string
}

export interface Experience {
  id: string
  role: string
  company: string
  startDate: string
  endDate: string
  description: string
}

export interface Education {
  id: string
  degree: string
  school: string
  year: string
}

export interface Project {
  id: string
  name: string
  description: string
  link?: string
}

export interface CustomSection {
  id: string
  name: string
  items: string[]
}

export interface Resume {
  id: string
  userId: string
  templateId: 'modern' | 'professional' | 'minimalist'
  title: string
  lastModified: string
  score?: number
  personalInfo: PersonalInfo
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  projects: Project[]
  certifications: string[]
  awards: string[]
  achievements: string[]
  publications: string[]
  references: string[]
  volunteering: string[]
  custom: CustomSection[]
}

// ─── ATS ────────────────────────────────────────────────────────────────────

export interface SectionScores {
  impact: number
  brevity: number
  style: number
  structure: number
}

export interface ATSScan {
  id: string
  userId: string
  createdAt: string
  score: number
  summary: string
  skillsDetected: string[]
  missingKeywords: string[]
  hardSkills: string[]
  softSkills: string[]
  improvements: string[]
  formattingIssues: string[]
  sectionScores: SectionScores
  candidateInfo: { name: string; headline: string; email: string }
  jobDescription?: string
  fileName: string
}

// ─── Job Tracker ─────────────────────────────────────────────────────────────

export type JobStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  // legacy — kept for existing Firestore docs
  | 'waiting_referral'
  | 'referral_received'
  | 'apply_today'
  | 'closed'

export interface Outreach {
  id: string
  jobId: string
  contactName: string
  contactTitle: string
  platform: string
  responseStatus: 'pending' | 'responded' | 'no_response'
  dateConnected: string
}

export interface Job {
  id: string
  userId: string
  title: string
  company: string
  source: string
  location: string
  jobType: string
  link?: string
  jobDescription?: string
  status: JobStatus
  priority: number
  dateDiscovered: string
  waitingPeriod: number
  autoMoveDate?: string
  outreach: Outreach[]
  notes?: string
  tags: string[]
  dateApplied?: string
  dateClosed?: string
  autopilot_resume_id?: string
}

// ─── Career Desk ─────────────────────────────────────────────────────────────

export interface CareerProfile {
  name: string
  role: string
  email: string
  phone: string
  location: string
}

export interface CareerExperience {
  id: string
  role: string
  company: string
  year: string
  description: string
}

export interface CareerProject {
  id: string
  name: string
  tech: string
  description: string
  link?: string
}

export interface CareerDesk {
  profile: CareerProfile
  skills: string[]
  experiences: CareerExperience[]
  projects: CareerProject[]
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface APIError {
  message: string
  status?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
