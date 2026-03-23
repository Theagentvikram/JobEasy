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
  // Job search
  job_titles: string
  job_locations: string
  min_salary: number
  max_applications_per_day: number
  match_score_threshold: number
  blacklist_companies: string

  // AI provider
  ai_provider: string        // 'groq' | 'openai' | 'anthropic' | 'ollama'
  ai_model: string
  groq_api_key: string
  openai_api_key: string
  anthropic_api_key: string

  // Ollama — local model server (Raspberry Pi)
  ollama_host: string        // e.g. http://192.168.31.246:11434
  ollama_model: string       // e.g. gemma3:1b
  ollama_fast_model: string  // e.g. qwen2.5:1.5b

  // Email / outreach
  cold_email_enabled: boolean
  daily_email_limit: number
  email_delay_seconds: number
  gmail_sender_email: string
  gmail_app_password: string

  // LinkedIn
  linkedin_email: string
  linkedin_password: string

  // Schedule
  pipeline_hour: number
  pipeline_minute: number

  // Source toggles
  sources_jobspy: boolean
  sources_wellfound: boolean
  sources_naukri: boolean
  sources_yc: boolean

  // Sources (display only)
  sources: string[]

  // Scrape volume (lower = faster)
  results_per_search: number
}

export const autoapply = {
  health: () => api.get('/autoapply/health'),

  triggerPipeline: (dryRun = false, overrides?: { job_titles?: string; job_locations?: string; results_per_search?: number; disabled_sources?: string }) =>
    api.post(`/autoapply/pipeline/run?dry_run=${dryRun}`, overrides || {}),

  getPipelineStatus: () =>
    api.get('/autoapply/pipeline/status'),

  getPipelineHistory: (limit = 10) =>
    api.get<PipelineRun[]>(`/autoapply/pipeline/history?limit=${limit}`),

  getNextRun: () =>
    api.get('/autoapply/pipeline/next-run'),

  getJobs: (minScore = 0, limit = 50) =>
    api.get<AutoApplyJob[]>(`/autoapply/jobs?min_score=${minScore}&limit=${limit}`),

  // Unified: aggregates from AutoPilot sessions + pipeline runs
  getAllJobs: (minScore = 0, limit = 200) =>
    api.get<AutoApplyJob[]>(`/autoapply/all-jobs?min_score=${minScore}&limit=${limit}`),

  getJob: (id: number) =>
    api.get<AutoApplyJob>(`/autoapply/jobs/${id}`),

  getStats: () =>
    api.get<AutoApplyStats>('/autoapply/stats'),

  getSettings: () =>
    api.get<AutoApplySettings>('/autoapply/settings'),

  updateSettings: (data: Partial<AutoApplySettings>) =>
    api.put('/autoapply/settings', data),

  testConnection: (provider: string, apiKey: string, ollamaHost?: string) =>
    api.post('/autoapply/settings/test-connection', {
      provider,
      api_key: apiKey,
      ollama_host: ollamaHost,
    }),
}
