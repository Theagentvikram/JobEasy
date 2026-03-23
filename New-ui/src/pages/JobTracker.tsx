import { useEffect, useState, useRef } from 'react'
import {
  Plus,
  LayoutGrid,
  List,
  ExternalLink,
  Trash2,
  ChevronDown,
  Building2,
  MapPin,
  Clock,
  Filter,
  FileText,
} from 'lucide-react'
import api from '../services/api'
import type { Job, JobStatus, Resume } from '../types'
import { exportToPdf } from '../lib/exportToPdf'
import { Button, Card, Badge, Modal, Input, Textarea, Spinner, EmptyState } from '../components/ui'
import { cn } from '../components/ui'

// ─── Status config ────────────────────────────────────────────────────────────

// Normalise legacy Firestore status values to the new simplified set
function normaliseStatus(s: string): JobStatus {
  if (s === 'waiting_referral' || s === 'referral_received' || s === 'apply_today' || s === 'closed') return 'saved'
  if (s === 'withdrawn') return 'rejected'
  return (s as JobStatus) || 'saved'
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; badge: 'default' | 'brand' | 'warning' | 'success' | 'danger' | 'accent' }> = {
  saved:      { label: 'Not applied', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800', badge: 'default' },
  applied:    { label: 'Applied',     color: 'text-brand-700 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-950/40', badge: 'brand' },
  interview:  { label: 'Interview',   color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', badge: 'accent' },
  offer:      { label: 'Offer 🎉',    color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', badge: 'success' },
  rejected:   { label: 'Rejected',    color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', badge: 'danger' },
}

const KANBAN_COLUMNS: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

// ─── Job card (kanban) ────────────────────────────────────────────────────────

async function openResumePdf(resumeId: string) {
  try {
    const res = await api.get(`/resumes/${resumeId}`)
    exportToPdf(res.data as Resume)
  } catch {
    alert('Could not load resume. Please try again.')
  }
}

function KanbanCard({ job, onStatusChange, onDelete, onDragStart }: {
  job: Job
  onStatusChange: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const cfg = STATUS_CONFIG[normaliseStatus(job.status)] ?? STATUS_CONFIG['saved']

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(job.id)
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{job.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Building2 size={10} className="flex-shrink-0" />
            {job.company}
          </p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            aria-label="Job options"
          >
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden w-40">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold px-3 pt-2 pb-1">Move to</p>
                {(['saved', 'applied', 'interview', 'offer', 'rejected'] as JobStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(job.id, s); setMenuOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer',
                      job.status === s ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
                <div className="border-t border-slate-100 dark:border-slate-700 mt-1">
                  <button
                    onClick={() => { onDelete(job.id); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {job.location && (
          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
            <MapPin size={9} /> {job.location}
          </span>
        )}
        {job.jobType && <Badge variant="default" size="sm">{job.jobType}</Badge>}
        {job.priority > 0 && (
          <span className="text-xs">{'★'.repeat(job.priority)}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {job.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-700 dark:text-brand-400 flex items-center gap-1 hover:underline"
          >
            <ExternalLink size={10} /> Apply
          </a>
        )}
        {job.autopilot_resume_id && (
          <button
            onClick={async () => { setPdfLoading(true); await openResumePdf(job.autopilot_resume_id!); setPdfLoading(false) }}
            disabled={pdfLoading}
            className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
          >
            <FileText size={10} /> {pdfLoading ? 'Generating…' : 'Resume PDF'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Kanban board ─────────────────────────────────────────────────────────────

function KanbanBoard({ jobs, onStatusChange, onDelete }: {
  jobs: Job[]
  onStatusChange: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
}) {
  const draggingId = useRef<string | null>(null)
  const [overCol, setOverCol] = useState<JobStatus | null>(null)

  const handleDrop = (col: JobStatus) => {
    if (draggingId.current) {
      const job = jobs.find((j) => j.id === draggingId.current)
      if (job && job.status !== col) {
        onStatusChange(draggingId.current, col)
      }
    }
    draggingId.current = null
    setOverCol(null)
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 min-h-0"
      onDragEnd={() => { draggingId.current = null; setOverCol(null) }}
    >
      {KANBAN_COLUMNS.map((col) => {
        const colJobs = jobs.filter((j) => normaliseStatus(j.status) === col)
        const cfg = STATUS_CONFIG[col]
        const isOver = overCol === col
        return (
          <div
            key={col}
            className="flex-shrink-0 w-64"
            onDragOver={(e) => { e.preventDefault(); setOverCol(col) }}
            onDragLeave={(e) => {
              // only clear if leaving the column entirely
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null)
            }}
            onDrop={() => handleDrop(col)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full font-medium">
                  {colJobs.length}
                </span>
              </div>
            </div>
            <div
              className={cn(
                'space-y-2 min-h-20 rounded-xl transition-colors duration-150 p-1 -m-1',
                isOver ? 'bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-300 ring-offset-1' : ''
              )}
            >
              {colJobs.map((job) => (
                <KanbanCard
                  key={job.id}
                  job={job}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onDragStart={(id) => { draggingId.current = id }}
                />
              ))}
              {colJobs.length === 0 && (
                <div className={cn(
                  'border-2 border-dashed rounded-xl h-20 flex items-center justify-center transition-colors',
                  isOver ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-100 dark:border-slate-700'
                )}>
                  <p className={cn('text-xs', isOver ? 'text-brand-500' : 'text-slate-300 dark:text-slate-600')}>
                    {isOver ? 'Drop here' : 'Empty'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Resume PDF button ────────────────────────────────────────────────────────

function ResumePdfButton({ resumeId }: { resumeId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      onClick={async () => {
        setLoading(true)
        await openResumePdf(resumeId)
        setLoading(false)
      }}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer whitespace-nowrap"
      title="Open tailored resume as PDF"
    >
      <FileText size={11} /> {loading ? 'Generating…' : 'Resume PDF'}
    </button>
  )
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ jobs, onStatusChange, onDelete }: {
  jobs: Job[]
  onStatusChange: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Role', 'Company', 'Status', 'Source', 'Date', 'Priority', 'Apply', 'Resume', ''].map((h) => (
              <th key={h} className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-left px-3 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {jobs.map((job) => {
            const cfg = STATUS_CONFIG[normaliseStatus(job.status)] ?? STATUS_CONFIG['saved']
            return (
              <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                <td className="px-3 py-2.5">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                    {job.location && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={9} /> {job.location}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{job.company}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={cfg.badge}>{cfg.label}</Badge>
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.source || '—'}</td>
                <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(job.dateDiscovered).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {job.priority > 0 ? (
                    <span className="text-amber-500 text-xs">{'★'.repeat(job.priority)}</span>
                  ) : (
                    <span className="text-slate-200 dark:text-slate-700">★</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {job.link ? (
                    <a href={job.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-700 dark:text-brand-400 hover:underline whitespace-nowrap">
                      <ExternalLink size={11} /> Apply
                    </a>
                  ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {job.autopilot_resume_id
                    ? <ResumePdfButton resumeId={job.autopilot_resume_id} />
                    : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                  }
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDelete(job.id)}
                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 cursor-pointer"
                      aria-label="Delete job"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Add job modal ────────────────────────────────────────────────────────────

function AddJobModal({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (job: Job) => void
}) {
  const [form, setForm] = useState({
    title: '', company: '', location: '', source: '', jobType: 'Full-time',
    link: '', jobDescription: '', status: 'saved' as JobStatus,
    priority: 0, waitingPeriod: 7, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const patch = (updates: Partial<typeof form>) => setForm((f) => ({ ...f, ...updates }))

  const submit = async () => {
    if (!form.title || !form.company) { setError('Role and company are required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/referral/jobs', {
        ...form,
        dateDiscovered: new Date().toISOString(),
        tags: [],
        outreach: [],
      })
      onAdd(res.data)
      onClose()
      setForm({
        title: '', company: '', location: '', source: '', jobType: 'Full-time',
        link: '', jobDescription: '', status: 'saved',
        priority: 0, waitingPeriod: 7, notes: '',
      })
    } catch {
      setError('Failed to add job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a job" size="lg">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Job title *" placeholder="e.g. Senior Frontend Engineer"
          value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        <Input label="Company *" placeholder="e.g. Google"
          value={form.company} onChange={(e) => patch({ company: e.target.value })} />
        <Input label="Location" placeholder="Bengaluru / Remote"
          value={form.location} onChange={(e) => patch({ location: e.target.value })} />
        <Input label="Source" placeholder="LinkedIn, Referral, Company website…"
          value={form.source} onChange={(e) => patch({ source: e.target.value })} />
        <Input label="Job posting URL" placeholder="https://…"
          value={form.link} onChange={(e) => patch({ link: e.target.value })} className="col-span-2" />

        <div className="col-span-2 flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job type</label>
            <select
              value={form.jobType}
              onChange={(e) => patch({ jobType: e.target.value })}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer"
            >
              {['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Initial status</label>
            <select
              value={form.status}
              onChange={(e) => patch({ status: e.target.value as JobStatus })}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer"
            >
              {(['saved', 'applied', 'interview', 'offer', 'rejected'] as JobStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-28">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => patch({ priority: Number(e.target.value) })}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer"
            >
              {[0, 1, 2, 3].map((p) => (
                <option key={p} value={p}>{p === 0 ? 'None' : '★'.repeat(p)}</option>
              ))}
            </select>
          </div>
        </div>

        <Textarea label="Job description" placeholder="Paste the JD here for future reference…"
          value={form.jobDescription} rows={3}
          onChange={(e) => patch({ jobDescription: e.target.value })} className="col-span-2" />
        <Textarea label="Notes" placeholder="Referral contact, interview tips, anything relevant…"
          value={form.notes} rows={2}
          onChange={(e) => patch({ notes: e.target.value })} className="col-span-2" />
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{error}</p>}

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>
          <Plus size={14} /> Add job
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobTracker() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')

  useEffect(() => {
    Promise.all([
      api.get('/referral/jobs'),
      api.get('/resumes'),
    ]).then(([jobsRes, resumesRes]) => {
      const rawJobs: Job[] = jobsRes.data?.jobs || jobsRes.data || []
      const resumes: { id: string; title: string; autopilot_company?: string }[] =
        resumesRes.data || []

      // Build company → resume_id map from AutoPilot resumes
      const autopilotMap: Record<string, string> = {}
      for (const r of resumes) {
        const company = (r.autopilot_company || '').toLowerCase().trim()
        if (company && r.title?.startsWith('[AutoPilot]')) {
          // Keep the highest-scored one if multiple (titles end in "(score%)")
          if (!autopilotMap[company]) autopilotMap[company] = r.id
        }
      }

      // Inject autopilot_resume_id for jobs that don't have one yet
      const enriched = rawJobs.map((j) => {
        if (j.autopilot_resume_id) return j
        const key = (j.company || '').toLowerCase().trim()
        return autopilotMap[key] ? { ...j, autopilot_resume_id: autopilotMap[key] } : j
      })

      setJobs(enriched)
    }).finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (id: string, status: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)))
    try {
      await api.patch(`/referral/jobs/${id}`, { status })
    } catch {
      // revert optimistic update on failure
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: j.status } : j)))
    }
  }

  const handleDelete = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
    try {
      await api.delete(`/referral/jobs/${id}`)
    } catch { /* ignore */ }
  }

  const filteredJobs = filterStatus === 'all'
    ? jobs
    : jobs.filter((j) => normaliseStatus(j.status) === filterStatus)

  const stats = {
    total: jobs.length,
    applied: jobs.filter((j) => ['applied', 'interview', 'offer'].includes(j.status)).length,
    interviews: jobs.filter((j) => j.status === 'interview').length,
    offers: jobs.filter((j) => j.status === 'offer').length,
  }

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Job Tracker</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.total} job{stats.total !== 1 ? 's' : ''} tracked · {stats.applied} applied · {stats.interviews} interviews · {stats.offers} offers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                view === 'kanban' ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                view === 'table' ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <List size={14} /> List
            </button>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add job
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <Filter size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer',
            filterStatus === 'all'
              ? 'bg-brand-700 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          All ({jobs.length})
        </button>
        {(['saved', 'applied', 'interview', 'offer', 'rejected'] as JobStatus[]).map((s) => {
          const c = STATUS_CONFIG[s]
          const count = jobs.filter((j) => normaliseStatus(j.status) === s).length
          if (count === 0) return null
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s as JobStatus)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer',
                filterStatus === s
                  ? 'bg-brand-700 text-white'
                  : `${c.bg} ${c.color} hover:opacity-80`
              )}
            >
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title={filterStatus === 'all' ? 'No jobs tracked yet' : `No jobs with status "${STATUS_CONFIG[filterStatus]?.label}"`}
          description={filterStatus === 'all' ? 'Add your first job to start tracking your application pipeline.' : 'Try a different filter.'}
          action={
            filterStatus === 'all' ? (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add your first job
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFilterStatus('all')}>Clear filter</Button>
            )
          }
        />
      ) : view === 'kanban' ? (
        <KanbanBoard jobs={filteredJobs} onStatusChange={handleStatusChange} onDelete={handleDelete} />
      ) : (
        <Card className="overflow-hidden">
          <TableView jobs={filteredJobs} onStatusChange={handleStatusChange} onDelete={handleDelete} />
        </Card>
      )}

      <AddJobModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(job) => setJobs((prev) => [job, ...prev])}
      />
    </div>
  )
}
