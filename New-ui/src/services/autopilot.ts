/**
 * Auto Pilot API service
 * Handles: search session start, SSE progress streaming, session/job fetching
 */
import api from './api'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AutoPilotJob {
  job_id: string
  session_id: string
  title: string
  company: string
  location: string
  is_remote: boolean
  url: string
  apply_url: string
  source: string
  description: string
  employment_type: string
  salary_min: number | null
  salary_max: number | null
  posted_at: string | null
  // Match
  match_score: number
  match_tier: string
  match_reasons: string[]
  keywords_matched: string[]
  keywords_missing: string[]
  red_flags: string[]
  // Tailored resume
  tailored_resume_md: string
  tailored_summary: string
  key_changes: string[]
  ats_keywords_added: string[]
  pdf_url: string
  status: 'ready' | 'skipped'
  created_at: string
}

export interface AutoPilotSession {
  session_id: string
  keywords: string[]
  location: string
  status: 'starting' | 'scraping' | 'processing' | 'done' | 'error'
  total_jobs: number
  processed: number
  created_at: string
  finished_at: string | null
  min_score: number
  max_jobs: number
}

// Progress events streamed via SSE
export type ProgressEvent =
  | { type: 'stage'; stage: string; message: string }
  | { type: 'found'; total: number; message: string }
  | { type: 'scoring'; current: number; total: number; message: string }
  | { type: 'tailoring'; current: number; total: number; message: string }
  | { type: 'skipped'; current: number; total: number; message: string }
  | { type: 'job_ready'; current: number; total: number; job: AutoPilotJob; message: string }
  | { type: 'done'; total: number; processed: number; message: string }
  | { type: 'error'; message: string }
  | { type: 'already_done'; status: string; total: number; processed: number }

// ─── API calls ─────────────────────────────────────────────────────────────

export const autopilot = {
  /** Start a new search session. Returns session_id immediately. */
  startSearch: (payload: {
    keywords: string[]
    location: string
    resume_text: string
    max_jobs?: number
    min_score?: number
  }) => api.post<{ session_id: string; status: string }>('/autopilot/search', payload),

  /** List user's past sessions (most recent first). */
  listSessions: () => api.get<AutoPilotSession[]>('/autopilot/sessions'),

  /** Get a session + all its processed jobs. */
  getSession: (sessionId: string) =>
    api.get<{ session: AutoPilotSession; jobs: AutoPilotJob[] }>(
      `/autopilot/sessions/${sessionId}`
    ),

  /** Delete a session and all its jobs. */
  deleteSession: (sessionId: string) =>
    api.delete(`/autopilot/sessions/${sessionId}`),
}

// ─── SSE stream ─────────────────────────────────────────────────────────────

/**
 * Open an SSE connection to stream live progress for a session.
 * @param sessionId  The session to listen on
 * @param token      Firebase auth token (passed as query param since EventSource can't set headers)
 * @param onEvent    Called for every parsed event
 * @returns          Close function — call to disconnect
 */
export function streamProgress(
  sessionId: string,
  token: string,
  onEvent: (event: ProgressEvent) => void,
): () => void {
  const baseUrl =
    (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'
  const url = `${baseUrl}/autopilot/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`

  const es = new EventSource(url)

  es.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data) as ProgressEvent
      onEvent(parsed)
    } catch {
      // ignore malformed event
    }
  }

  es.onerror = () => {
    onEvent({ type: 'error', message: 'Connection lost. Please refresh.' })
    es.close()
  }

  return () => es.close()
}
