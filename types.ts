export interface AnalysisResult {
  score: number;
  candidateInfo: {
    name: string;
    headline: string;
    email: string;
  };
  summary: string;
  skillsDetected: string[];
  keywordsMissing: string[];
  formattingIssues: string[];
  improvements: string[];
  sectionScores: {
    impact: number;
    brevity: number;
    style: number;
    structure: number;
  };
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