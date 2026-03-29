import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Rocket,
  Play,
  Clock,
  Briefcase,
  Mail,
  Target,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Settings,
  MapPin,
  Building2,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  ChevronDown,
  Wifi,
  WifiOff,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { autoapply, type AutoApplyStats, type AutoApplyJob, type PipelineRun, type AutoApplySettings } from '../services/autoapply'
import { Card, Button, Badge, Spinner, EmptyState, Skeleton } from '../components/ui'
import { toast } from '../lib/toast'
import PipelineProgressModal from '../components/PipelineProgressModal'

// ─── Source config ──────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  indeed: { label: 'Indeed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  glassdoor: { label: 'Glassdoor', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
  wellfound: { label: 'Wellfound', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  naukri: { label: 'Naukri', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  yc_waas: { label: 'YC Startups', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  remoteok: { label: 'RemoteOK', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  remotive: { label: 'Remotive', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  arbeitnow: { label: 'Arbeitnow', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400' },
  themuse: { label: 'TheMuse', color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400' },
  jobspy: { label: 'Multi-source', color: 'bg-slate-100 text-slate-700 dark:bg-dark-card dark:text-slate-400' },
  zip_recruiter: { label: 'ZipRecruiter', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' },
}

const COUNTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Auto-detect from location' },
  { value: 'USA', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'India', label: 'India' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Australia', label: 'Australia' },
  { value: 'UAE', label: 'UAE' },
  { value: 'Singapore', label: 'Singapore' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return ''
  const fmt = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return n.toString()
  }
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`
  return fmt(min || max || 0)
}

function tagsFromString(s: string): string[] {
  return s ? s.split(',').map(t => t.trim()).filter(Boolean) : []
}

function tagsToString(tags: string[]): string {
  return tags.join(', ')
}

function padTwo(n: number) {
  return String(n).padStart(2, '0')
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}

// ─── Tag Input ───────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder = 'Add…',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const trimmed = input.trim()
    if (!trimmed || tags.includes(trimmed)) { setInput(''); return }
    onChange([...tags, trimmed])
    setInput('')
  }

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div
      className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-dark-card cursor-text focus-within:ring-2 focus-within:ring-brand-700 focus-within:border-transparent transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i) }}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer leading-none"
            aria-label={`Remove ${tag}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
      />
      {input && (
        <button
          type="button"
          onClick={addTag}
          className="text-brand-700 hover:text-brand-800 cursor-pointer"
          aria-label="Add tag"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Password Field ───────────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helper?: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  const masked = value === '••••••••'
  const renderedValue = masked ? '' : value
  const renderedPlaceholder = masked ? 'Saved key hidden. Type to replace.' : placeholder
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={renderedValue}
          onChange={e => onChange(e.target.value)}
          placeholder={renderedPlaceholder}
          autoComplete="off"
          className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {helper && <div className="text-xs text-slate-400 dark:text-slate-500">{helper}</div>}
    </div>
  )
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
        <Icon size={15} className="text-brand-700" />
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

// ─── Field Row ───────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-brand-700' : 'bg-slate-200 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  )
}

// ─── Model selector component ─────────────────────────────────────────────────

function ModelSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const isCustom = value !== '' && !options.some(o => o.value === value)
  const [showCustom, setShowCustom] = useState(isCustom)

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          value={isCustom || showCustom ? '__custom__' : value}
          onChange={e => {
            if (e.target.value === '__custom__') {
              setShowCustom(true)
            } else {
              setShowCustom(false)
              onChange(e.target.value)
            }
          }}
          className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-9 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          <option value="__custom__">Custom model ID…</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {(showCustom || isCustom) && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. llama3-8b-8192"
          className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors font-mono"
        />
      )}
    </div>
  )
}

// ─── Settings form state ──────────────────────────────────────────────────────

function emptySettings(): AutoApplySettings {
  return {
    job_titles: '',
    job_locations: '',
    country_indeed: '',
    min_salary: 0,
    max_applications_per_day: 20,
    match_score_threshold: 60,
    blacklist_companies: '',
    startup_only_enabled: false,
    ai_provider: 'groq',
    ai_model: '',
    groq_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
    ollama_host: 'http://192.168.31.246:11434',
    ollama_model: 'gemma3:1b',
    ollama_fast_model: 'qwen2.5:1.5b',
    cold_email_enabled: false,
    daily_email_limit: 10,
    email_delay_seconds: 30,
    gmail_sender_email: '',
    gmail_app_password: '',
    linkedin_email: '',
    linkedin_password: '',
    pipeline_hour: 9,
    pipeline_minute: 0,
    sources_jobspy: true,
    sources_wellfound: true,
    sources_naukri: true,
    sources_yc: true,
    sources_free_apis: true,
    sources_apify: true,
    apify_enabled: false,
    apify_api_key: '',
    apify_actor_google: 'apify/google-search-scraper',
    sources: [],
    results_per_search: 15,
    google_sheets_enabled: false,
    google_sheets_spreadsheet_id: '',
    google_sheets_job_tracker_tab: 'Job Tracker',
    google_sheets_autoapply_tab: 'AutoApply Jobs',
  }
}

// ─── Quick Run Modal ──────────────────────────────────────────────────────────

const QUICK_SOURCES = [
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'indeed',    label: 'Indeed' },
  { key: 'glassdoor', label: 'Glassdoor' },
  { key: 'wellfound', label: 'Wellfound' },
  { key: 'naukri',    label: 'Naukri' },
  { key: 'yc_waas',   label: 'YC Startups' },
  { key: 'remoteok',  label: 'RemoteOK' },
  { key: 'remotive',  label: 'Remotive' },
  { key: 'arbeitnow', label: 'Arbeitnow' },
  { key: 'themuse',   label: 'TheMuse' },
]

function QuickRunModal({
  open,
  settings,
  onClose,
  onRun,
}: {
  open: boolean
  settings: AutoApplySettings
  onClose: () => void
  onRun: (dryRun: boolean, overrides: {
    job_titles?: string
    job_locations?: string
    results_per_search?: number
    disabled_sources?: string
    sources_jobspy?: boolean
    sources_wellfound?: boolean
    sources_naukri?: boolean
    sources_yc?: boolean
    sources_free_apis?: boolean
  }) => void
}) {
  const defaultTitles = tagsFromString(settings.job_titles)
  const defaultLocations = tagsFromString(settings.job_locations)
  const defaultEnabled = settings.sources && settings.sources.length > 0
    ? settings.sources
    : QUICK_SOURCES.map(s => s.key)

  const [titles, setTitles] = useState<string[]>(defaultTitles)
  const [locations, setLocations] = useState<string[]>(defaultLocations)
  const [enabled, setEnabled] = useState<string[]>(defaultEnabled)
  const [results, setResults] = useState(settings.results_per_search || 15)

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setTitles(tagsFromString(settings.job_titles))
      setLocations(tagsFromString(settings.job_locations))
      setEnabled(settings.sources && settings.sources.length > 0 ? settings.sources : QUICK_SOURCES.map(s => s.key))
      setResults(settings.results_per_search || 15)
    }
  }, [open, settings])

  if (!open) return null

  const toggleSource = (key: string) => {
    setEnabled(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }

  const buildOverrides = () => {
    const allKeys = QUICK_SOURCES.map(s => s.key)
    const disabled = allKeys.filter(k => !enabled.includes(k))
    const sourcesJobspy = ['linkedin', 'indeed', 'glassdoor'].some(k => enabled.includes(k))
    const sourcesWellfound = enabled.includes('wellfound')
    const sourcesNaukri = enabled.includes('naukri')
    const sourcesYc = enabled.includes('yc_waas')
    const sourcesFreeApis = ['remoteok', 'remotive', 'arbeitnow', 'themuse'].some(k => enabled.includes(k))
    return {
      job_titles: titles.join(', '),
      job_locations: locations.join(', '),
      results_per_search: results,
      disabled_sources: disabled.join(','),
      sources_jobspy: sourcesJobspy,
      sources_wellfound: sourcesWellfound,
      sources_naukri: sourcesNaukri,
      sources_yc: sourcesYc,
      sources_free_apis: sourcesFreeApis,
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Configure this run</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-400 cursor-pointer"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Roles */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Titles</label>
            <TagInput tags={titles} onChange={setTitles} placeholder="e.g. Software Engineer" />
          </div>

          {/* Locations */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Locations</label>
            <TagInput tags={locations} onChange={setLocations} placeholder="e.g. Remote, New York" />
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sources</label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_SOURCES.map(src => {
                const on = enabled.includes(src.key)
                return (
                  <label key={src.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${on ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-700' : 'border-slate-200 dark:border-dark-border-subtle hover:border-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleSource(src.key)} />
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${on ? 'bg-brand-700 border-brand-700' : 'border-slate-300 dark:border-slate-500'}`}>
                      {on && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className={`text-xs font-medium ${on ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>{src.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Results per search */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jobs per search — {results} <span className="normal-case font-normal text-slate-400">(lower = faster)</span>
            </label>
            <input
              type="range" min={5} max={50} step={5}
              value={results}
              onChange={e => setResults(Number(e.target.value))}
              className="w-full accent-brand-700 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 (fast ~30s)</span>
              <span>25 (balanced)</span>
              <span>50 (thorough)</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => { onClose(); onRun(true, buildOverrides()) }}>
            <Eye size={13} /> Dry Run
          </Button>
          <Button size="sm" onClick={() => { onClose(); onRun(false, buildOverrides()) }}>
            <Rocket size={13} /> Run Pipeline
          </Button>
        </div>
      </div>
    </div>
  )
}

const ALL_SOURCES = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    desc: 'Works reliably for most searches across regions.',
    warning: null,
  },
  {
    key: 'indeed',
    label: 'Indeed',
    desc: 'Generally stable across countries.',
    warning: null,
  },
  {
    key: 'glassdoor',
    label: 'Glassdoor',
    desc: 'May experience intermittent availability. Expect occasional failures.',
    warning: 'This source has intermittent availability. Disable if you see repeated errors.',
  },
  {
    key: 'zip_recruiter',
    label: 'ZipRecruiter',
    desc: 'US/Canada/UK only. Disabled automatically for other countries.',
    warning: 'Only works for US, Canada, and UK locations. Ignored for other countries.',
  },
  {
    key: 'wellfound',
    label: 'Wellfound',
    desc: 'YC-backed startup jobs from Wellfound (formerly AngelList)',
    warning: null,
  },
  {
    key: 'naukri',
    label: 'Naukri.com',
    desc: 'India\'s largest job portal — best for Bangalore, Delhi, Hyderabad roles.',
    warning: null,
  },
  {
    key: 'yc_waas',
    label: 'YC Work at a Startup',
    desc: 'Direct listings from Y Combinator portfolio companies.',
    warning: null,
  },
  {
    key: 'remoteok',
    label: 'RemoteOK (Free API)',
    desc: 'Global remote-first jobs from RemoteOK public API.',
    warning: null,
  },
  {
    key: 'remotive',
    label: 'Remotive (Free API)',
    desc: 'Remote engineering and product jobs from Remotive API.',
    warning: null,
  },
  {
    key: 'arbeitnow',
    label: 'Arbeitnow (Free API)',
    desc: 'Global jobs from Arbeitnow public API, strong in EU/remote roles.',
    warning: null,
  },
  {
    key: 'themuse',
    label: 'TheMuse (Free API)',
    desc: 'US and global tech roles from The Muse public jobs API.',
    warning: null,
  },
  {
    key: 'apify_fallback',
    label: 'Apify Priority (All Portals)',
    desc: 'Uses your Apify account first across portals, then falls back to built-in scrapers if needed.',
    warning: 'Requires your Apify API key. Leave disabled if you do not use Apify.',
  },
  // ── Country-specific boards (auto-activated based on location) ──────────────
  {
    key: 'pnet',
    label: 'PNet (South Africa)',
    desc: 'South Africa\'s largest job portal. Auto-used when location is in South Africa.',
    warning: null,
  },
  {
    key: 'careerjunction',
    label: 'CareerJunction (South Africa)',
    desc: 'Popular SA job board covering Johannesburg, Cape Town, Durban & more.',
    warning: null,
  },
  {
    key: 'timesjobs',
    label: 'TimesJobs (India)',
    desc: 'Indian job board from the Times Group. Auto-used for Indian locations.',
    warning: null,
  },
  {
    key: 'reed',
    label: 'Reed.co.uk (UK)',
    desc: 'UK\'s largest job board. Auto-used for UK locations.',
    warning: null,
  },
  {
    key: 'jora_au',
    label: 'Jora (Australia)',
    desc: 'Australian job aggregator. Auto-used for AU locations.',
    warning: null,
  },
  {
    key: 'bayt',
    label: 'Bayt (UAE / Middle East)',
    desc: 'Middle East\'s largest job board. Auto-used for UAE/Dubai locations.',
    warning: null,
  },
  {
    key: 'mycareersfuture',
    label: 'MyCareersFuture (Singapore)',
    desc: 'Singapore government official job portal with public API.',
    warning: null,
  },
  {
    key: 'jobbank_ca',
    label: 'Job Bank (Canada)',
    desc: 'Canada\'s official government job board. Auto-used for Canadian locations.',
    warning: null,
  },
]

const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  groq: [
    { value: '', label: 'Default (llama3-8b-8192)' },
    { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B Versatile (best quality)' },
    { value: 'llama3-8b-8192', label: 'LLaMA 3 8B (fast)' },
    { value: 'llama3-70b-8192', label: 'LLaMA 3 70B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (long context)' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  openai: [
    { value: '', label: 'Default (gpt-4o-mini)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast & cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (best quality)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (cheapest)' },
  ],
  anthropic: [
    { value: '', label: 'Default (claude-3-haiku-20240307)' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (fast & cheap)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (best quality)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  ollama: [
    { value: '', label: 'Default (gemma3:1b)' },
    { value: 'gemma3:1b', label: 'Gemma 3 1B (fast, Pi-friendly)' },
    { value: 'gemma3:4b', label: 'Gemma 3 4B' },
    { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 1.5B (very fast)' },
    { value: 'qwen2.5:3b', label: 'Qwen 2.5 3B' },
    { value: 'llama3.2:1b', label: 'LLaMA 3.2 1B' },
    { value: 'llama3.2:3b', label: 'LLaMA 3.2 3B' },
    { value: 'phi3.5', label: 'Phi-3.5 (3.8B)' },
  ],
}

// ─── Source row component ─────────────────────────────────────────────────────

function SourceRow({
  src,
  enabled,
  onToggle,
}: {
  src: { key: string; label: string; desc: string; warning: string | null }
  enabled: boolean
  onToggle: (key: string) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group rounded-lg border border-slate-100 dark:border-dark-border-subtle px-3 py-2.5 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => onToggle(src.key)} />
        <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-500 peer-checked:bg-brand-700 peer-checked:border-brand-700 transition-colors flex items-center justify-center">
          {enabled && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium transition-colors ${enabled ? 'text-slate-800 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-400' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
            {src.label}
          </p>
          {!enabled && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-elevated text-slate-400 dark:text-slate-500">OFF</span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{src.desc}</p>
        {src.warning && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <AlertTriangle size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-600 dark:text-amber-400">{src.warning}</p>
          </div>
        )}
      </div>
    </label>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  initial,
  engineUp,
  onSaved,
}: {
  initial: AutoApplySettings
  engineUp: boolean
  onSaved: () => void
}) {
  const [form, setForm] = useState<AutoApplySettings>(initial)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')

  // Keep form synced when initial changes (fresh load)
  useEffect(() => { setForm(initial); setDirty(false) }, [initial])

  const set = <K extends keyof AutoApplySettings>(key: K, value: AutoApplySettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const jobTitleTags = tagsFromString(form.job_titles)
  const jobLocationTags = tagsFromString(form.job_locations)
  const blacklistTags = tagsFromString(form.blacklist_companies)

  const isOllama = form.ai_provider === 'ollama'

  const activeApiKey = () => {
    if (form.ai_provider === 'groq') return form.groq_api_key
    if (form.ai_provider === 'openai') return form.openai_api_key
    if (form.ai_provider === 'anthropic') return form.anthropic_api_key
    return ''
  }

  const setActiveApiKey = (v: string) => {
    if (form.ai_provider === 'groq') set('groq_api_key', v)
    else if (form.ai_provider === 'openai') set('openai_api_key', v)
    else if (form.ai_provider === 'anthropic') set('anthropic_api_key', v)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      // Derive disabled_sources string from enabled sources array
      const payload: Partial<AutoApplySettings> & { disabled_sources?: string } = { ...form }
      if (form.sources && form.sources.length > 0) {
        const allKnown = Object.keys(SOURCE_BOOL_KEYS)
        const disabled = allKnown.filter(k => !form.sources!.includes(k))
        payload.disabled_sources = disabled.join(',')
      } else {
        payload.disabled_sources = ''
      }
      await autoapply.updateSettings(payload)
      setDirty(false)
      toast('Settings saved', 'success')
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save settings'
      setSaveError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (isOllama) {
      if (!form.ollama_host) { setTestMsg('Enter the Ollama host URL first'); setTestState('fail'); return }
      setTestState('testing')
      setTestMsg('')
      try {
        await autoapply.testConnection('ollama', '', form.ollama_host)
        setTestState('ok')
        setTestMsg('Connected to Ollama — models loaded from Pi')
      } catch (err: unknown) {
        setTestState('fail')
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot reach Ollama host'
        setTestMsg(msg)
      }
      return
    }
    const key = activeApiKey()
    if (!key) { setTestMsg('Enter an API key first'); setTestState('fail'); return }
    setTestState('testing')
    setTestMsg('')
    try {
      await autoapply.testConnection(form.ai_provider, key)
      setTestState('ok')
      setTestMsg('Connection successful')
    } catch (err: unknown) {
      setTestState('fail')
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Connection failed'
      setTestMsg(msg)
    }
  }

  const SOURCE_BOOL_KEYS: Record<string, keyof AutoApplySettings | undefined> = {
    linkedin: 'sources_jobspy',
    indeed: 'sources_jobspy',
    glassdoor: 'sources_jobspy',
    zip_recruiter: 'sources_jobspy',
    wellfound: 'sources_wellfound',
    naukri: 'sources_naukri',
    yc_waas: 'sources_yc',
    remoteok: 'sources_free_apis',
    remotive: 'sources_free_apis',
    arbeitnow: 'sources_free_apis',
    themuse: 'sources_free_apis',
    apify_fallback: 'sources_apify',
    // Country-specific boards: tracked only in sources[] array
    pnet: undefined,
    careerjunction: undefined,
    timesjobs: undefined,
    reed: undefined,
    jora_au: undefined,
    bayt: undefined,
    mycareersfuture: undefined,
    jobbank_ca: undefined,
  }

  // For granular per-platform control we track enabled platforms in the `sources` array
  // and also mirror to the coarse boolean fields for the backend
  const isSourceEnabled = (key: string): boolean => {
    const current = form.sources || []
    if (current.length === 0) return true // all on by default when nothing is set
    return current.includes(key)
  }

  const toggleSource = (key: string) => {
    // Start from "all enabled" if sources is empty
    const current = form.sources && form.sources.length > 0
      ? form.sources
      : ALL_SOURCES.map(s => s.key)
    const updated = current.includes(key)
      ? current.filter(s => s !== key)
      : [...current, key]
    set('sources', updated)
    // Mirror to coarse boolean fields for JobSpy-grouped sources
    const boolKey = SOURCE_BOOL_KEYS[key]
    if (boolKey && boolKey !== 'sources_jobspy' && boolKey !== 'sources_free_apis') {
      set(boolKey, updated.includes(key) as AutoApplySettings[typeof boolKey])
    }
    // sources_jobspy = true if any of the JobSpy-powered platforms is on
    const jobspyOn = ['linkedin', 'indeed', 'glassdoor', 'zip_recruiter'].some(k => updated.includes(k))
    set('sources_jobspy', jobspyOn)
    // sources_free_apis = true if any free API source is on
    const freeApisOn = ['remoteok', 'remotive', 'arbeitnow', 'themuse'].some(k => updated.includes(k))
    set('sources_free_apis', freeApisOn)
  }

  const providerOptions = [
    { value: 'groq', label: 'Fast AI (Free)' },
    { value: 'openai', label: 'Premium AI' },
    { value: 'anthropic', label: 'Advanced AI' },
    { value: 'ollama', label: 'Local AI (Self-hosted)' },
  ]

  return (
    <div className="space-y-5">
      {/* Unsaved changes banner */}
      {dirty && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3">
          <span className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle size={14} />
            Unsaved changes
          </span>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!engineUp || saving}>
            <Save size={14} /> Save all
          </Button>
        </div>
      )}

      {saveError && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-4 py-3">
          {saveError}
        </div>
      )}

      {/* Section 1: Job Search */}
      <SectionCard title="Job Search Preferences" icon={Briefcase}>
        <Field label="Job Titles" hint="Press Enter or comma to add">
          <TagInput
            tags={jobTitleTags}
            onChange={tags => set('job_titles', tagsToString(tags))}
            placeholder="e.g. Software Engineer, Backend Developer"
          />
        </Field>

        <Field label="Locations" hint="Press Enter or comma to add">
          <TagInput
            tags={jobLocationTags}
            onChange={tags => set('job_locations', tagsToString(tags))}
            placeholder="e.g. Bangalore, Remote"
          />
        </Field>

        <Field label="Country" hint="Used for location-aware source behavior">
          <div className="relative">
            <select
              value={form.country_indeed || ''}
              onChange={e => set('country_indeed', e.target.value)}
              className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-9 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
            >
              {COUNTRY_OPTIONS.map(opt => (
                <option key={opt.value || 'auto'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Minimum Salary" hint="Enter value in rupees (e.g. 1200000 for 12 LPA)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₹</span>
              <input
                type="number"
                min={0}
                step={100000}
                value={form.min_salary || ''}
                onChange={e => set('min_salary', Number(e.target.value))}
                placeholder="e.g. 1200000"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pl-7 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
              />
            </div>
            {form.min_salary > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">
                = {(form.min_salary / 100000).toFixed(1)} LPA
              </p>
            )}
          </Field>

          <Field label="Max Applications / Day">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set('max_applications_per_day', Math.max(1, form.max_applications_per_day - 1))}
                className="w-8 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
              >
                –
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={form.max_applications_per_day}
                onChange={e => set('max_applications_per_day', Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-center bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => set('max_applications_per_day', Math.min(100, form.max_applications_per_day + 1))}
                className="w-8 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          </Field>
        </div>

        <Field label={`Match Score Threshold — ${form.match_score_threshold}%`} hint="Only apply to jobs scoring at or above this threshold">
          <input
            type="range"
            min={0}
            max={100}
            value={form.match_score_threshold}
            onChange={e => set('match_score_threshold', Number(e.target.value))}
            className="w-full accent-brand-700 cursor-pointer h-2"
          />
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </Field>

        <Field label="Blacklisted Companies" hint="Jobs from these companies will be skipped">
          <TagInput
            tags={blacklistTags}
            onChange={tags => set('blacklist_companies', tagsToString(tags))}
            placeholder="e.g. TCS, Wipro, Infosys"
          />
        </Field>

        <div className="pt-1">
          <Toggle
            checked={!!form.startup_only_enabled}
            onChange={v => set('startup_only_enabled', v)}
            label="Startup-only mode (apply AI startup filter)"
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            When enabled, searches are narrowed to AI startup-style roles. When disabled, all matching roles are kept.
          </p>
        </div>
      </SectionCard>

      {/* Section 2: Sources */}
      <SectionCard title="Sources to Scrape" icon={Globe}>
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 mb-3">
          Toggle platforms on/off. Country-specific boards activate automatically based on your job locations.
        </p>

        {/* Global platforms */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Global Platforms</p>
        <div className="space-y-2 mb-4">
          {ALL_SOURCES.filter(s => ['linkedin','indeed','glassdoor','zip_recruiter','wellfound','naukri','yc_waas','remoteok','remotive','arbeitnow','themuse','apify_fallback'].includes(s.key)).map(src => (
            <SourceRow key={src.key} src={src} enabled={isSourceEnabled(src.key)} onToggle={toggleSource} />
          ))}
        </div>

        {/* Country-specific platforms */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Country-Specific Boards</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
          These activate automatically when your job locations include cities from that country.
        </p>
        <div className="space-y-2">
          {ALL_SOURCES.filter(s => !['linkedin','indeed','glassdoor','zip_recruiter','wellfound','naukri','yc_waas','remoteok','remotive','arbeitnow','themuse'].includes(s.key)).map(src => (
            <SourceRow key={src.key} src={src} enabled={isSourceEnabled(src.key)} onToggle={toggleSource} />
          ))}
        </div>
      </SectionCard>

      {/* Section 2b: Apify Priority */}
      <SectionCard title="Apify Priority" icon={Globe}>
        <Toggle
          checked={!!form.apify_enabled}
          onChange={v => set('apify_enabled', v)}
          label="Enable Apify as primary scraper (fallback to built-in scrapers)"
        />

        <div className="pt-2 grid grid-cols-1 gap-4">
          <PasswordField
            label="Apify API Key"
            value={form.apify_api_key}
            onChange={v => set('apify_api_key', v)}
            placeholder="apify_api_..."
            helper={
              <a
                href="https://console.apify.com/account/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-brand-700"
              >
                Get Apify API token {'->'}
              </a>
            }
          />

          <Field label="Apify Actor" hint="Default is recommended for broad portal fallback">
            <input
              type="text"
              value={form.apify_actor_google || 'apify/google-search-scraper'}
              onChange={e => set('apify_actor_google', e.target.value)}
              placeholder="apify/google-search-scraper"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors font-mono"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Section 3: AI Provider */}
      <SectionCard title="AI Provider" icon={Rocket}>
        <Field label="Provider">
          <div className="relative">
            <select
              value={form.ai_provider}
              onChange={e => { set('ai_provider', e.target.value); setTestState('idle'); setTestMsg('') }}
              className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-9 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
            >
              {providerOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </Field>

        {/* Ollama: host + model fields */}
        {isOllama ? (
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 rounded-lg px-3 py-2.5">
              <span className="text-base flex-shrink-0">🥧</span>
              <p className="text-xs text-violet-700 dark:text-violet-300">
                Running AI locally on your Raspberry Pi — no API key needed, zero cost. Make sure Ollama is running on the Pi.
              </p>
            </div>
            <Field label="Ollama Host" hint="URL of the machine running Ollama (e.g. your Raspberry Pi's IP)">
              <input
                type="text"
                value={form.ollama_host}
                onChange={e => set('ollama_host', e.target.value)}
                placeholder="http://192.168.1.x:11434"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors font-mono"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Main Model" hint="Used for resume scoring & cover letters">
                <ModelSelect
                  value={form.ollama_model}
                  options={PROVIDER_MODELS.ollama}
                  onChange={v => set('ollama_model', v)}
                />
              </Field>
              <Field label="Fast Model" hint="Used for quick classification tasks">
                <ModelSelect
                  value={form.ollama_fast_model}
                  options={PROVIDER_MODELS.ollama}
                  onChange={v => set('ollama_fast_model', v)}
                />
              </Field>
            </div>
          </div>
        ) : (
          /* Cloud provider: API key field */
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <PasswordField
                label={`${providerOptions.find(o => o.value === form.ai_provider)?.label ?? 'API'} Key`}
                value={activeApiKey()}
                onChange={setActiveApiKey}
                placeholder="sk-…"
                helper={
                  form.ai_provider === 'groq'
                    ? <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">Get free Groq key →</a>
                    : form.ai_provider === 'openai'
                    ? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">Get OpenAI key →</a>
                    : <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">Get Anthropic key →</a>
                }
              />
            </div>
            <div className="flex-shrink-0 pb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testState === 'testing' || !engineUp}
                loading={testState === 'testing'}
              >
                Test
              </Button>
            </div>
          </div>
        )}

        {/* Test connection for Ollama */}
        {isOllama && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testState === 'testing' || !engineUp}
              loading={testState === 'testing'}
            >
              Test connection
            </Button>
          </div>
        )}

        {testState !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            testState === 'ok'
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              : testState === 'fail'
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
              : 'bg-slate-50 dark:bg-dark-elevated text-slate-500'
          }`}>
            {testState === 'ok' && <CheckCircle2 size={14} />}
            {testState === 'fail' && <XCircle size={14} />}
            {testMsg || 'Testing…'}
          </div>
        )}

        {/* Per-provider model selector */}
        {!isOllama && (
          <Field label="Model" hint="Choose a preset or leave on default">
            <ModelSelect
              value={form.ai_model}
              options={PROVIDER_MODELS[form.ai_provider] ?? [{ value: '', label: 'Default' }]}
              onChange={v => set('ai_model', v)}
            />
          </Field>
        )}
      </SectionCard>

      {/* Section 4: Cold Email */}
      <SectionCard title="Cold Email Outreach" icon={Mail}>
        <Toggle
          checked={form.cold_email_enabled}
          onChange={v => set('cold_email_enabled', v)}
          label="Enable cold email outreach"
        />

        {form.cold_email_enabled && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border-subtle">
            <Field label="Gmail Sender Email">
              <input
                type="email"
                value={form.gmail_sender_email}
                onChange={e => set('gmail_sender_email', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
              />
            </Field>

            <PasswordField
              label="Gmail App Password"
              value={form.gmail_app_password}
              onChange={v => set('gmail_app_password', v)}
              placeholder="xxxx xxxx xxxx xxxx"
              helper={
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-brand-700"
                >
                  Get app password →
                </a>
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Daily Email Limit">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={form.daily_email_limit}
                  onChange={e => set('daily_email_limit', Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
                />
              </Field>

              <Field label="Delay Between Emails (seconds)">
                <input
                  type="number"
                  min={5}
                  max={3600}
                  value={form.email_delay_seconds}
                  onChange={e => set('email_delay_seconds', Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
                />
              </Field>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 5: LinkedIn */}
      <SectionCard title="LinkedIn Auto-Apply" icon={Briefcase}>
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 mb-2">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            LinkedIn may restrict or ban accounts for automated activity. Use a secondary account.
          </p>
        </div>

        <Field label="LinkedIn Email">
          <input
            type="email"
            value={form.linkedin_email}
            onChange={e => set('linkedin_email', e.target.value)}
            placeholder="your@email.com"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
          />
        </Field>

        <PasswordField
          label="LinkedIn Password"
          value={form.linkedin_password}
          onChange={v => set('linkedin_password', v)}
          placeholder="Your LinkedIn password"
        />
      </SectionCard>

      {/* Section 6: Schedule */}
      <SectionCard title="Pipeline Schedule" icon={Clock}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Daily automatic run time (UTC)
        </p>

        <div className="flex items-center gap-3">
          <Field label="Hour (0–23)">
            <div className="relative">
              <select
                value={form.pipeline_hour}
                onChange={e => set('pipeline_hour', Number(e.target.value))}
                className="appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{padTwo(i)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          <span className="text-xl text-slate-400 font-mono mt-5">:</span>

          <Field label="Minute (0–59)">
            <div className="relative">
              <select
                value={form.pipeline_minute}
                onChange={e => set('pipeline_minute', Number(e.target.value))}
                className="appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{padTwo(i)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          <div className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            → Runs daily at <span className="font-mono text-slate-900 dark:text-white">{padTwo(form.pipeline_hour)}:{padTwo(form.pipeline_minute)} UTC</span>
          </div>
        </div>
      </SectionCard>

      {/* Save footer */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {engineUp ? 'Changes are saved to the backend database.' : 'Start the backend to save settings.'}
        </p>
        <Button onClick={handleSave} loading={saving} disabled={!engineUp || saving || !dirty}>
          <Save size={14} /> Save Settings
        </Button>
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  history,
  running,
  onOpenQuickRun,
  onRefresh,
  sourceFilter,
  setSourceFilter,
}: {
  stats: AutoApplyStats | null
  history: PipelineRun[]
  running: boolean
  onOpenQuickRun: () => void
  onRefresh: () => void
  sourceFilter: string
  setSourceFilter: (s: string) => void
}) {
  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          AI-powered job discovery · runs automatically each day
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onOpenQuickRun} disabled={running} loading={running}>
            <Rocket size={14} /> Run Pipeline
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Jobs Discovered" value={stats.total_discovered} icon={Briefcase} color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
          <StatCard label="Applied" value={stats.total_applied} icon={Target} color="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" />
          <StatCard label="Emails Sent" value={stats.total_emails} icon={Mail} color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" />
          <StatCard label="Avg Match" value={`${stats.avg_match_score}%`} icon={TrendingUp} color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
        </div>
      )}

      {/* Source filter bar */}
      {stats?.by_source && Object.keys(stats.by_source).length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sources:</span>
            {Object.entries(stats.by_source).map(([source, count]) => {
              const cfg = SOURCE_CONFIG[source] || { label: source, color: 'bg-slate-100 text-slate-600' }
              return (
                <button
                  key={source}
                  onClick={() => setSourceFilter(sourceFilter === source ? 'all' : source)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    sourceFilter === source ? 'ring-2 ring-brand-700 ring-offset-1 dark:ring-offset-slate-900' : ''
                  } ${cfg.color}`}
                >
                  {cfg.label}
                  <span className="font-bold">{count}</span>
                </button>
              )
            })}
            {sourceFilter !== 'all' && (
              <button
                onClick={() => setSourceFilter('all')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Recent runs */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          Recent Pipeline Runs
          <button onClick={onRefresh} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            <RefreshCw size={13} />
          </button>
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
            No runs yet — hit "Run Pipeline" to start.
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-dark-border-subtle">
            {history.map((run) => (
              <div key={run.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={run.status === 'completed' ? 'success' : run.status === 'running' ? 'brand' : 'warning'}
                      size="sm"
                    >
                      {run.status}
                    </Badge>
                    {run.finished_at && (
                      <span className="text-xs text-slate-400">
                        {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{new Date(run.started_at).toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">{run.discovered}</span> found</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">{run.applied}</span> applied</p>
                  {run.emails_sent > 0 && <p><span className="font-medium text-violet-600 dark:text-violet-400">{run.emails_sent}</span> emails</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab({
  jobs,
  sourceFilter,
  setSourceFilter,
  onRefresh,
}: {
  jobs: AutoApplyJob[]
  sourceFilter: string
  setSourceFilter: (s: string) => void
  onRefresh: () => void
}) {
  const filtered = sourceFilter === 'all' ? jobs : jobs.filter(j => j.source === sourceFilter)

  // Unique sources present in the job list
  const presentSources = [...new Set(jobs.map(j => j.source))]

  return (
    <div className="space-y-4">
      {/* Source chips */}
      {presentSources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-brand-700 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-dark-card dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-hover'
            }`}
          >
            All ({jobs.length})
          </button>
          {presentSources.map(src => {
            const cfg = SOURCE_CONFIG[src] || { label: src, color: 'bg-slate-100 text-slate-600' }
            const count = jobs.filter(j => j.source === src).length
            return (
              <button
                key={src}
                onClick={() => setSourceFilter(sourceFilter === src ? 'all' : src)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  sourceFilter === src ? 'ring-2 ring-brand-700 ring-offset-1 dark:ring-offset-slate-900' : ''
                } ${cfg.color}`}
              >
                {cfg.label} {count}
              </button>
            )
          })}
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Target size={14} className="text-slate-400" />
            {sourceFilter !== 'all'
              ? `Jobs from ${SOURCE_CONFIG[sourceFilter]?.label || sourceFilter}`
              : 'All Matched Jobs'
            }
            <span className="text-xs font-normal text-slate-400">({filtered.length})</span>
          </h2>
          <button onClick={onRefresh} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            <RefreshCw size={14} />
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={20} />}
            title="No jobs discovered yet"
            description="Run the pipeline to start scraping AI startup jobs from Wellfound, Naukri, YC & LinkedIn"
          />
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto -mx-1 px-1">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors"
              >
                {/* Score badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  job.match_score >= 80
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                    : job.match_score >= 60
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                }`}>
                  {job.match_score || '—'}
                </div>

                {/* Job details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{job.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <Building2 size={10} /> {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} /> {job.location}
                      </span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Source + status + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {SOURCE_CONFIG[job.source] && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_CONFIG[job.source].color}`}>
                      {SOURCE_CONFIG[job.source].label}
                    </span>
                  )}
                  <Badge
                    variant={job.status === 'applied' ? 'success' : job.status === 'scored' ? 'brand' : 'default'}
                    size="sm"
                  >
                    {job.status}
                  </Badge>
                  {job.cold_email_sent && (
                    <span title="Cold email sent">
                      <Mail size={12} className="text-violet-500" />
                    </span>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-brand-700 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'jobs' | 'settings'

export default function AutoApply() {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressDryRun, setProgressDryRun] = useState(false)
  const [showQuickRun, setShowQuickRun] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [settingsDirty, setSettingsDirty] = useState(false)

  const healthQuery = useQuery({
    queryKey: ['autoapply-health'],
    queryFn: () => autoapply.health().then(() => true),
    staleTime: 30 * 1000,
    retry: false,
  })
  const engineUp = healthQuery.isSuccess

  const statsQuery = useQuery({
    queryKey: ['autoapply-stats'],
    queryFn: () => autoapply.getStats().then(r => r.data as AutoApplyStats),
    staleTime: 60 * 1000,
    enabled: engineUp,
  })
  const jobsQuery = useQuery({
    queryKey: ['autoapply-jobs'],
    queryFn: () => autoapply.getAllJobs(0, 200).then(r => r.data as AutoApplyJob[]),
    staleTime: 2 * 60 * 1000,
    enabled: engineUp,
  })
  const historyQuery = useQuery({
    queryKey: ['autoapply-history'],
    queryFn: () => autoapply.getPipelineHistory(10).then(r => r.data as PipelineRun[]),
    staleTime: 60 * 1000,
    enabled: engineUp,
  })
  const settingsQuery = useQuery({
    queryKey: ['autoapply-settings'],
    queryFn: () => autoapply.getSettings().then(r => r.data as AutoApplySettings).catch(() => emptySettings()),
    staleTime: 5 * 60 * 1000,
    enabled: engineUp,
  })

  const stats = statsQuery.data ?? null
  const jobs = jobsQuery.data ?? []
  const history = historyQuery.data ?? []
  const settings = settingsQuery.data ?? emptySettings()
  const loading = healthQuery.isLoading || (engineUp && (statsQuery.isLoading || jobsQuery.isLoading))

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['autoapply-health'] })
    qc.invalidateQueries({ queryKey: ['autoapply-stats'] })
    qc.invalidateQueries({ queryKey: ['autoapply-jobs'] })
    qc.invalidateQueries({ queryKey: ['autoapply-history'] })
    qc.invalidateQueries({ queryKey: ['autoapply-settings'] })
  }

  const handleRun = async (dryRun: boolean, overrides?: Parameters<typeof autoapply.triggerPipeline>[1]) => {
    setRunning(true)
    setError('')
    try {
      await autoapply.triggerPipeline(dryRun, overrides)
      setProgressDryRun(dryRun)
      setShowProgress(true)
    } catch {
      setError('Failed to trigger pipeline')
      toast('Failed to trigger pipeline', 'error')
    } finally {
      setRunning(false)
    }
  }

  const handleOpenQuickRun = () => setShowQuickRun(true)

  if (loading) {
    return (
      <div className="w-full space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex gap-1 border-b border-slate-200 dark:border-dark-border-subtle pb-px">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-t-lg" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // Tab definitions — grayed out when engine is offline
  const tabs: { id: TabId; label: string; disabled?: boolean }[] = engineUp
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'jobs', label: `Jobs${jobs.length ? ` (${jobs.length})` : ''}` },
        { id: 'settings', label: settingsDirty ? 'Settings ·' : 'Settings' },
      ]
    : [
        { id: 'overview', label: 'Overview', disabled: true },
        { id: 'jobs', label: 'Jobs', disabled: true },
        { id: 'settings', label: 'Settings' },
      ]

  // Force settings tab when offline
  const currentTab = engineUp === false ? 'settings' : activeTab

  return (
    <>
    <PipelineProgressModal
      open={showProgress}
      dryRun={progressDryRun}
      onClose={() => { setShowProgress(false); refetchAll() }}
    />
    <QuickRunModal
      open={showQuickRun}
      settings={settings || emptySettings()}
      onClose={() => setShowQuickRun(false)}
      onRun={(dry, overrides) => handleRun(dry, overrides)}
    />
    <div className="w-full space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket size={20} className="text-brand-700" />
            AutoApply
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full pipeline automation: discover, score, tailor, and submit applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {engineUp !== null && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              engineUp
                ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
            }`}>
              {engineUp ? <Wifi size={11} /> : <WifiOff size={11} />}
              {engineUp ? 'Engine online' : 'Engine offline'}
            </span>
          )}
          <button
            onClick={() => refetchAll()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {engineUp === false && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Backend offline</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Configure settings below, then start the engine with{' '}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">./dev.sh</code>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAll()}>
            <RefreshCw size={12} /> Retry
          </Button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-dark-border-subtle -mb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative cursor-pointer ${
              tab.disabled
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : currentTab === tab.id
                ? 'text-brand-700 dark:text-brand-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
            {tab.disabled && (
              <span className="ml-1.5 text-[10px] text-slate-300 dark:text-slate-600 font-normal">(start backend)</span>
            )}
            {currentTab === tab.id && !tab.disabled && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 dark:bg-brand-400 rounded-full" />
            )}
            {/* Unsaved dot */}
            {tab.id === 'settings' && settingsDirty && (
              <span className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {currentTab === 'overview' && engineUp && (
          <OverviewTab
            stats={stats}
            history={history}
            running={running}
            onOpenQuickRun={handleOpenQuickRun}
            onRefresh={() => refetchAll()}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
          />
        )}

        {currentTab === 'jobs' && engineUp && (
          <JobsTab
            jobs={jobs}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            onRefresh={() => refetchAll()}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            initial={settings}
            engineUp={!!engineUp}
            onSaved={() => {
              setSettingsDirty(false)
              refetchAll()
            }}
          />
        )}
      </div>
    </div>
    </>
  )
}
