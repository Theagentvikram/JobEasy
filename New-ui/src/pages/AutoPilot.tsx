import { useEffect, useRef, useState } from 'react'
import {
  Search,
  MapPin,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Globe,
  X,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  Filter,
} from 'lucide-react'
import api from '../services/api'
import { autopilot, streamProgress, type AutoPilotJob, type AutoPilotSession, type ProgressEvent } from '../services/autopilot'
import { Card, Button, Badge, Spinner, ScoreRing, cn } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { auth } from '../firebase/config'
import { toast } from '../lib/toast'

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'search' | 'loading' | 'results'

interface LogEntry {
  id: number
  type: 'info' | 'success' | 'skip' | 'tailor' | 'error'
  message: string
  ts: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  indeed: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  glassdoor: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  zip_recruiter: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  wellfound: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  naukri: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

function sourceLabel(s: string) {
  const map: Record<string, string> = {
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    glassdoor: 'Glassdoor',
    zip_recruiter: 'ZipRecruiter',
    wellfound: 'Wellfound',
    naukri: 'Naukri',
    jobspy: 'JobSpy',
  }
  return map[s] ?? s
}

function scoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 75) return 'success'
  if (score >= 55) return 'warning'
  return 'danger'
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return ''
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max!)}`
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KeywordChips({
  keywords,
  onChange,
}: {
  keywords: string[]
  onChange: (kw: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed])
    }
    setInput('')
  }

  const remove = (kw: string) => onChange(keywords.filter((k) => k !== kw))

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Job Keywords
      </label>
      <div className="flex flex-wrap gap-2 p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[48px]">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="flex items-center gap-1 text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-2.5 py-1 rounded-full"
          >
            {kw}
            <button onClick={() => remove(kw)} className="cursor-pointer hover:text-red-500 transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          }}
          placeholder={keywords.length === 0 ? 'Type a keyword and press Enter…' : 'Add more…'}
          className="flex-1 min-w-[140px] text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
        />
        {input.trim() && (
          <button
            onClick={add}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 cursor-pointer transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">Press Enter or comma to add. Examples: React Developer, Data Analyst, Product Manager</p>
    </div>
  )
}

function LiveFeed({ log }: { log: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  const icons: Record<LogEntry['type'], React.ReactNode> = {
    info: <Clock size={12} className="text-blue-400 flex-shrink-0" />,
    success: <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />,
    skip: <XCircle size={12} className="text-slate-400 flex-shrink-0" />,
    tailor: <Sparkles size={12} className="text-violet-400 flex-shrink-0" />,
    error: <AlertCircle size={12} className="text-red-400 flex-shrink-0" />,
  }

  return (
    <div className="h-64 overflow-y-auto bg-slate-950 rounded-xl p-4 font-mono text-xs space-y-1.5 border border-slate-800">
      {log.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 animate-fade-in">
          {icons[entry.type]}
          <span className="text-slate-500 flex-shrink-0">{entry.ts}</span>
          <span
            className={cn(
              'flex-1 leading-relaxed',
              entry.type === 'success' && 'text-green-300',
              entry.type === 'tailor' && 'text-violet-300',
              entry.type === 'skip' && 'text-slate-500',
              entry.type === 'error' && 'text-red-300',
              entry.type === 'info' && 'text-slate-300',
            )}
          >
            {entry.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function JobCard({ job }: { job: AutoPilotJob }) {
  const [expanded, setExpanded] = useState(false)
  const salaryText = formatSalary(job.salary_min, job.salary_max)
  const srcColor = SOURCE_COLORS[job.source] ?? SOURCE_COLORS.default

  return (
    <Card className="p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Score ring */}
        <div className="flex-shrink-0">
          <ScoreRing score={job.match_score} size={72} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm leading-tight">
                {job.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 size={12} className="text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">{job.company}</span>
              </div>
            </div>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', srcColor)}>
              {sourceLabel(job.source)}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {job.location}
              </span>
            )}
            {job.is_remote && (
              <span className="flex items-center gap-1">
                <Globe size={11} /> Remote
              </span>
            )}
            {salaryText && (
              <span className="flex items-center gap-1">
                <TrendingUp size={11} /> {salaryText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Keywords matched */}
      {job.keywords_matched.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.keywords_matched.slice(0, 6).map((kw) => (
            <span key={kw} className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
              ✓ {kw}
            </span>
          ))}
          {job.keywords_missing.slice(0, 3).map((kw) => (
            <span key={kw} className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              + {kw}
            </span>
          ))}
        </div>
      )}

      {/* Tailored summary */}
      {job.tailored_summary && (
        <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg px-3 py-2 border border-violet-100 dark:border-violet-900/50">
          <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
            <Sparkles size={11} className="inline mr-1" />
            <strong>Tailored:</strong> {job.tailored_summary}
          </p>
        </div>
      )}

      {/* Expanded: JD + key changes */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          {job.key_changes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Resume changes for this job:</p>
              <ul className="space-y-1">
                {job.key_changes.map((c, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <ArrowRight size={10} className="text-brand-500 mt-0.5 flex-shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.description && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Job Description:</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line line-clamp-10">
                {job.description.slice(0, 800)}{job.description.length > 800 ? '…' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Less' : 'Details'}
        </button>

        <div className="flex-1" />

        {job.pdf_url && (
          <a
            href={job.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200 transition-colors"
          >
            <Download size={13} /> Tailored Resume
          </a>
        )}

        <a
          href={job.apply_url || job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Apply <ExternalLink size={11} />
        </a>
      </div>
    </Card>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AutoPilotPage() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('search')

  // Search form
  const [keywords, setKeywords] = useState<string[]>([])
  const [location, setLocation] = useState('Remote')
  const [resumeText, setResumeText] = useState('')
  const [deskLoaded, setDeskLoaded] = useState(false)
  const [deskName, setDeskName] = useState('')
  const [maxJobs] = useState(10)
  const [minScore, setMinScore] = useState(60)

  // Loading state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [stats, setStats] = useState({ found: 0, highMatch: 0, tailored: 0, done: 0 })
  const [log, setLog] = useState<LogEntry[]>([])
  const [liveJobs, setLiveJobs] = useState<AutoPilotJob[]>([])
  const logIdRef = useRef(0)

  // Results state
  const [jobs, setJobs] = useState<AutoPilotJob[]>([])
  const [filterScore, setFilterScore] = useState(0)
  const [filterSource, setFilterSource] = useState('all')
  const [filterRemote, setFilterRemote] = useState(false)

  // Past sessions
  const [sessions, setSessions] = useState<AutoPilotSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const closeStreamRef = useRef<(() => void) | null>(null)

  // Load past sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    setLoadingSessions(true)
    try {
      const res = await autopilot.listSessions()
      setSessions(res.data)
    } catch {
      // silent fail
    } finally {
      setLoadingSessions(false)
    }
  }

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    const id = ++logIdRef.current
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLog((prev) => [...prev.slice(-200), { id, type, message, ts }])
  }

  async function handleSearch() {
    if (keywords.length === 0) {
      toast.warning('Add at least one keyword to search')
      return
    }
    if (resumeText.trim().length < 50) {
      toast.warning('Your Career Desk is empty — add your details in Career Desk first')
      return
    }

    setPhase('loading')
    setLog([])
    setLiveJobs([])
    setProgress({ current: 0, total: 0 })
    setStats({ found: 0, highMatch: 0, tailored: 0, done: 0 })
    addLog(`Launching Auto Pilot for: ${keywords.join(', ')}`, 'info')

    try {
      const res = await autopilot.startSearch({
        keywords,
        location,
        resume_text: resumeText,
        max_jobs: maxJobs,
        min_score: minScore,
      })

      const sid = res.data.session_id
      setSessionId(sid)

      // Get auth token for SSE query param (EventSource can't set headers)
      let token = localStorage.getItem('dev_token') || ''
      if (!token && auth.currentUser) {
        try { token = await auth.currentUser.getIdToken() } catch { /* use empty */ }
      }

      // Open SSE stream
      const close = streamProgress(sid, token, handleProgressEvent)
      closeStreamRef.current = close
    } catch (err: any) {
      toast.error('Failed to start search: ' + (err?.response?.data?.detail ?? 'Unknown error'))
      setPhase('search')
    }
  }

  function handleProgressEvent(event: ProgressEvent) {
    switch (event.type) {
      case 'stage':
        addLog(event.message, 'info')
        break

      case 'found':
        setProgress((p) => ({ ...p, total: event.total }))
        setStats((s) => ({ ...s, found: event.total }))
        addLog(event.message, 'success')
        break

      case 'scoring':
        setProgress({ current: event.current, total: event.total })
        addLog(event.message, 'info')
        break

      case 'tailoring':
        setProgress({ current: event.current, total: event.total })
        addLog(event.message, 'tailor')
        setStats((s) => ({ ...s, tailored: s.tailored + 1 }))
        break

      case 'skipped':
        setProgress({ current: event.current, total: event.total })
        addLog(event.message, 'skip')
        break

      case 'job_ready': {
        const job = event.job
        setProgress({ current: event.current, total: event.total })
        setStats((s) => ({
          ...s,
          done: s.done + 1,
          highMatch: job.match_score >= 75 ? s.highMatch + 1 : s.highMatch,
        }))
        setLiveJobs((prev) => {
          const next = [...prev, job]
          next.sort((a, b) => b.match_score - a.match_score)
          return next
        })
        addLog(event.message, 'success')
        break
      }

      case 'done':
      case 'already_done':
        addLog(`All done! Showing results…`, 'success')
        closeStreamRef.current?.()
        // Fetch full results from API
        fetchResults()
        break

      case 'error':
        addLog(`Error: ${event.message}`, 'error')
        toast.error(event.message)
        if (event.message.includes('No jobs found')) {
          setPhase('search')
        }
        break
    }
  }

  async function fetchResults() {
    if (!sessionId) return
    try {
      const res = await autopilot.getSession(sessionId)
      const allJobs = res.data.jobs
      allJobs.sort((a, b) => b.match_score - a.match_score)
      setJobs(allJobs)
      setPhase('results')
      loadSessions()
    } catch {
      // Fall back to live jobs collected during streaming
      setJobs(liveJobs)
      setPhase('results')
    }
  }

  async function loadPastSession(sid: string) {
    try {
      const res = await autopilot.getSession(sid)
      const allJobs = res.data.jobs
      allJobs.sort((a, b) => b.match_score - a.match_score)
      setJobs(allJobs)
      setSessionId(sid)
      setPhase('results')
    } catch {
      toast.error('Failed to load session')
    }
  }

  async function deleteSession(sid: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await autopilot.deleteSession(sid)
      setSessions((prev) => prev.filter((s) => s.session_id !== sid))
      if (sessionId === sid) setPhase('search')
      toast.success('Session deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => closeStreamRef.current?.()
  }, [])

  // Filtered jobs for results
  const filteredJobs = jobs.filter((j) => {
    if (j.match_score < filterScore) return false
    if (filterSource !== 'all' && j.source !== filterSource) return false
    if (filterRemote && !j.is_remote) return false
    return true
  })

  const uniqueSources = [...new Set(jobs.map((j) => j.source))]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Zap size={22} className="text-brand-600" />
          Auto Pilot
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter keywords → get 10 jobs with curated, tailored resumes and match scores. Ready to apply in one click.
        </p>
      </div>

      {/* ── SEARCH PHASE ──────────────────────────────────────────────────── */}
      {phase === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search form */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Card className="p-6 flex flex-col gap-5">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">New Search</h2>

              <KeywordChips keywords={keywords} onChange={setKeywords} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Remote, New York, etc."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Min. Match Score
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="flex-1 accent-brand-700"
                    />
                    <span className="text-sm font-semibold text-brand-700 dark:text-brand-400 w-10 text-right">
                      {minScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Jobs below this score are skipped</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <FileText size={13} className="inline mr-1" />
                  Resume Source
                </label>
                {deskLoaded ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">Career Desk loaded{deskName ? ` · ${deskName}` : ''}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">{resumeText.length} characters — AI will tailor per job</p>
                    </div>
                    <a href="/desk" className="text-xs text-green-700 dark:text-green-400 underline underline-offset-2 flex-shrink-0">Edit Desk</a>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Career Desk is empty</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Upload a resume or fill in your Career Desk to continue</p>
                    </div>
                    <a href="/desk" className="text-xs font-medium text-amber-700 dark:text-amber-400 underline underline-offset-2 flex-shrink-0">Go to Desk →</a>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSearch}
                size="lg"
                className="w-full"
                disabled={keywords.length === 0 || !deskLoaded}
              >
                <Zap size={16} />
                Launch Auto Pilot — Search {maxJobs} Jobs
              </Button>
            </Card>
          </div>

          {/* Past sessions sidebar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Past Searches</h3>
              <button onClick={loadSessions} className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-8"><Spinner size={20} /></div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No past searches yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <Card
                    key={s.session_id}
                    hover
                    onClick={() => loadPastSession(s.session_id)}
                    className="p-3 flex flex-col gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                        {s.keywords.join(', ')}
                      </p>
                      <button
                        onClick={(e) => deleteSession(s.session_id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={s.status === 'done' ? 'success' : s.status === 'error' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {s.status}
                      </Badge>
                      <span className="text-xs text-slate-400">{s.processed}/{s.total_jobs} jobs</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOADING PHASE ─────────────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex flex-col gap-5">
          {/* Big progress card */}
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              {/* Animated orb */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Zap size={32} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-30" />
                <div className="absolute inset-[-6px] rounded-full border border-brand-200 dark:border-brand-800 animate-spin opacity-20" style={{ animationDuration: '3s' }} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {progress.total === 0
                    ? 'Searching across platforms…'
                    : `Analyzing ${progress.current} of ${progress.total} jobs`}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Scoring matches and tailoring your resume for each role
                </p>
              </div>

              {/* Progress bar */}
              {progress.total > 0 && (
                <div className="w-full max-w-lg">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>{progress.current} processed</span>
                    <span>{progress.total} total</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
                {[
                  { label: 'Jobs Found', value: stats.found, icon: <Search size={14} />, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'High Match', value: stats.highMatch, icon: <Target size={14} />, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Tailored', value: stats.tailored, icon: <Sparkles size={14} />, color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Ready', value: stats.done, icon: <CheckCircle2 size={14} />, color: 'text-brand-600 dark:text-brand-400' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className={cn('flex items-center gap-1 text-xs font-medium', color)}>
                      {icon} {label}
                    </span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Live activity feed */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Live Activity</p>
            <LiveFeed log={log} />
          </div>

          {/* Partial results preview while loading */}
          {liveJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Jobs Ready So Far ({liveJobs.length})
                </p>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveJobs.slice(0, 6).map((job) => (
                  <JobCard key={job.job_id} job={job} />
                ))}
              </div>
              {liveJobs.length > 6 && (
                <p className="text-xs text-slate-400 text-center mt-3">
                  + {liveJobs.length - 6} more loading…
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS PHASE ─────────────────────────────────────────────────── */}
      {phase === 'results' && (
        <div className="flex flex-col gap-5">
          {/* Results header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {filteredJobs.length} Jobs Ready
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({jobs.filter((j) => j.match_score >= 75).length} high match)
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sorted by match score · Each job has a tailored resume ready to download
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setPhase('search'); setJobs([]) }}
            >
              <Search size={14} /> New Search
            </Button>
          </div>

          {/* Filters */}
          <Card className="px-4 py-3 flex flex-wrap items-center gap-4">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Min score:</span>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={filterScore}
                onChange={(e) => setFilterScore(Number(e.target.value))}
                className="w-28 accent-brand-700"
              />
              <span className="text-xs font-semibold text-brand-700 dark:text-brand-400 w-8">{filterScore}%</span>
            </div>

            {uniqueSources.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Platform:</span>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="text-xs border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All</option>
                  {uniqueSources.map((s) => (
                    <option key={s} value={s}>{sourceLabel(s)}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filterRemote}
                onChange={(e) => setFilterRemote(e.target.checked)}
                className="accent-brand-700"
              />
              Remote only
            </label>

            <span className="ml-auto text-xs text-slate-400">{filteredJobs.length} showing</span>
          </Card>

          {/* Score summary bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Excellent (75+)', count: jobs.filter((j) => j.match_score >= 75).length, color: 'bg-green-500' },
              { label: 'Good (55–74)', count: jobs.filter((j) => j.match_score >= 55 && j.match_score < 75).length, color: 'bg-amber-500' },
              { label: 'Low (<55)', count: jobs.filter((j) => j.match_score < 55).length, color: 'bg-red-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={cn('w-2 h-8 rounded-full', color)} />
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">{count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Jobs grid */}
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <Target size={32} />
              <p className="text-sm">No jobs match your current filters</p>
              <Button variant="ghost" size="sm" onClick={() => { setFilterScore(0); setFilterSource('all'); setFilterRemote(false) }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
