/**
 * AutoApply API — integrated directly in the JobEasy backend at /autoapply/*
 * Sources: JobSpy (LinkedIn/Indeed/Glassdoor), Wellfound, Naukri, YC WAAS
 */
import api from './api'

export interface AutoApplyStats {
  total_discovered: number
  total_applied: number
  total_emails: number
  avg_match_score: number
  by_source?: Record<string, number>
}

export interface AutoApplyJob {
  id: number
  title: string
  company: string
  location: string
  source: string
  match_score: number
  status: string
  url: string
  applied_at: string | null
  cold_email_sent: boolean
  salary_min: number | null
  salary_max: number | null
}

export interface PipelineRun {
  id: number
  started_at: string
  finished_at: string | null
  status: string
  discovered: number
  applied: number
  emails_sent: number
}

export interface AutoApplySettings {
  job_titles: string
  job_locations: string
  min_salary: number
  match_score_threshold: number
  max_applications_per_day: number
  blacklist_companies: string
  cold_email_enabled: boolean
  ai_provider: string
  pipeline_hour: number
  pipeline_minute: number
  sources: string[]
}

export const autoapply = {
  health: () => api.get('/autoapply/health'),

  triggerPipeline: (dryRun = false) =>
    api.post(`/autoapply/pipeline/run?dry_run=${dryRun}`),

  getPipelineHistory: (limit = 10) =>
    api.get<PipelineRun[]>(`/autoapply/pipeline/history?limit=${limit}`),

  getNextRun: () =>
    api.get('/autoapply/pipeline/next-run'),

  getJobs: (minScore = 0, limit = 50) =>
    api.get<AutoApplyJob[]>(`/autoapply/jobs?min_score=${minScore}&limit=${limit}`),

  getJob: (id: number) =>
    api.get<AutoApplyJob>(`/autoapply/jobs/${id}`),

  getStats: () =>
    api.get<AutoApplyStats>('/autoapply/stats'),

  getSettings: () =>
    api.get<AutoApplySettings>('/autoapply/settings'),
}
