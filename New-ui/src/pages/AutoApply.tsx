import { useEffect, useRef, useState } from 'react'
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
import { Card, Button, Badge, Spinner, EmptyState } from '../components/ui'
import { toast } from '../lib/toast'

// ─── Source config ──────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  indeed: { label: 'Indeed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  glassdoor: { label: 'Glassdoor', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
  wellfound: { label: 'Wellfound', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  naukri: { label: 'Naukri', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  yc_waas: { label: 'YC Startups', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  jobspy: { label: 'JobSpy', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  zip_recruiter: { label: 'ZipRecruiter', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' },
}

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
      className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 cursor-text focus-within:ring-2 focus-within:ring-brand-700 focus-within:border-transparent transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium"
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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
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

// ─── Settings form state ──────────────────────────────────────────────────────

function emptySettings(): AutoApplySettings {
  return {
    job_titles: '',
    job_locations: '',
    min_salary: 0,
    max_applications_per_day: 20,
    match_score_threshold: 60,
    blacklist_companies: '',
    ai_provider: 'groq',
    ai_model: '',
    groq_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
    cold_email_enabled: false,
    daily_email_limit: 10,
    email_delay_seconds: 30,
    gmail_sender_email: '',
    gmail_app_password: '',
    linkedin_email: '',
    linkedin_password: '',
    pipeline_hour: 9,
    pipeline_minute: 0,
    sources: [],
  }
}

const ALL_SOURCES = [
  {
    key: 'jobspy',
    label: 'LinkedIn / Indeed / Glassdoor (via JobSpy)',
    desc: 'Scrapes the three biggest job boards using the JobSpy library',
  },
  {
    key: 'wellfound',
    label: 'Wellfound',
    desc: 'YC-backed startup jobs from Wellfound (formerly AngelList)',
  },
  {
    key: 'naukri',
    label: 'Naukri.com',
    desc: 'India\'s largest job portal, best for Bangalore/Delhi/Hyderabad roles',
  },
  {
    key: 'yc_waas',
    label: 'YC Work at a Startup',
    desc: 'Direct listings from Y Combinator portfolio companies',
  },
]

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
      await autoapply.updateSettings(form)
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

  const toggleSource = (key: string) => {
    const current = form.sources || []
    const updated = current.includes(key)
      ? current.filter(s => s !== key)
      : [...current, key]
    set('sources', updated)
  }

  const providerOptions = [
    { value: 'groq', label: 'Groq (Free)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic / Claude' },
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
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pl-7 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
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
                className="w-8 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                –
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={form.max_applications_per_day}
                onChange={e => set('max_applications_per_day', Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => set('max_applications_per_day', Math.min(100, form.max_applications_per_day + 1))}
                className="w-8 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
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
      </SectionCard>

      {/* Section 2: Sources */}
      <SectionCard title="Sources to Scrape" icon={Globe}>
        <div className="space-y-3">
          {ALL_SOURCES.map(src => (
            <label key={src.key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={(form.sources || []).includes(src.key)}
                  onChange={() => toggleSource(src.key)}
                />
                <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-500 peer-checked:bg-brand-700 peer-checked:border-brand-700 transition-colors flex items-center justify-center">
                  {(form.sources || []).includes(src.key) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                  {src.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{src.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* Section 3: AI Provider */}
      <SectionCard title="AI Provider" icon={Rocket}>
        <Field label="Provider">
          <div className="relative">
            <select
              value={form.ai_provider}
              onChange={e => { set('ai_provider', e.target.value); setTestState('idle'); setTestMsg('') }}
              className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-9 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
            >
              {providerOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </Field>

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

        {testState !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            testState === 'ok'
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              : testState === 'fail'
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
              : 'bg-slate-50 dark:bg-slate-700 text-slate-500'
          }`}>
            {testState === 'ok' && <CheckCircle2 size={14} />}
            {testState === 'fail' && <XCircle size={14} />}
            {testMsg || 'Testing…'}
          </div>
        )}

        <Field label="Model Override" hint="Leave blank to use the default model for the selected provider">
          <input
            type="text"
            value={form.ai_model}
            onChange={e => set('ai_model', e.target.value)}
            placeholder={
              form.ai_provider === 'groq' ? 'Default: llama3-8b-8192'
              : form.ai_provider === 'openai' ? 'Default: gpt-4o-mini'
              : 'Default: claude-3-haiku-20240307'
            }
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
          />
        </Field>
      </SectionCard>

      {/* Section 4: Cold Email */}
      <SectionCard title="Cold Email Outreach" icon={Mail}>
        <Toggle
          checked={form.cold_email_enabled}
          onChange={v => set('cold_email_enabled', v)}
          label="Enable cold email outreach"
        />

        {form.cold_email_enabled && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Field label="Gmail Sender Email">
              <input
                type="email"
                value={form.gmail_sender_email}
                onChange={e => set('gmail_sender_email', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
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
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
                />
              </Field>

              <Field label="Delay Between Emails (seconds)">
                <input
                  type="number"
                  min={5}
                  max={3600}
                  value={form.email_delay_seconds}
                  onChange={e => set('email_delay_seconds', Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
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
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors"
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
                className="appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
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
                className="appearance-none border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors cursor-pointer"
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
  onRun,
  onRefresh,
  sourceFilter,
  setSourceFilter,
}: {
  stats: AutoApplyStats | null
  history: PipelineRun[]
  running: boolean
  onRun: (dry: boolean) => void
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
          <Button variant="outline" size="sm" onClick={() => onRun(true)} disabled={running}>
            <Play size={14} /> Dry Run
          </Button>
          <Button size="sm" onClick={() => onRun(false)} disabled={running} loading={running}>
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
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
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
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
                    <Mail size={12} className="text-violet-500" title="Cold email sent" />
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
  const [stats, setStats] = useState<AutoApplyStats | null>(null)
  const [jobs, setJobs] = useState<AutoApplyJob[]>([])
  const [history, setHistory] = useState<PipelineRun[]>([])
  const [settings, setSettings] = useState<AutoApplySettings>(emptySettings())
  const [loading, setLoading] = useState(true)
  const [engineUp, setEngineUp] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [settingsDirty, setSettingsDirty] = useState(false)

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')

    try {
      await autoapply.health()
      setEngineUp(true)
    } catch {
      setEngineUp(false)
      // Still try to load settings from a cached/offline state if possible
      setLoading(false)
      return
    }

    try {
      const [statsRes, jobsRes, historyRes, settingsRes] = await Promise.all([
        autoapply.getStats(),
        autoapply.getJobs(0, 100),
        autoapply.getPipelineHistory(10),
        autoapply.getSettings().catch(() => ({ data: null })),
      ])
      setStats(statsRes.data)
      setJobs(jobsRes.data)
      setHistory(historyRes.data)
      if (settingsRes.data) setSettings(settingsRes.data)
    } catch {
      setError('Failed to load AutoApply data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleRun = async (dryRun: boolean) => {
    setRunning(true)
    setError('')
    try {
      await autoapply.triggerPipeline(dryRun)
      toast(dryRun ? 'Dry run triggered — check logs' : 'Pipeline started!', 'success')
      setTimeout(() => fetchAll(true), 3000)
    } catch {
      setError('Failed to trigger pipeline')
      toast('Failed to trigger pipeline', 'error')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={28} />
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket size={20} className="text-brand-700" />
            AutoApply
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            AI startup job discovery · Wellfound · Naukri · YC · LinkedIn
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
            onClick={() => fetchAll()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
          <Button variant="outline" size="sm" onClick={() => fetchAll()}>
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
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 -mb-1">
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
            onRun={handleRun}
            onRefresh={() => fetchAll(true)}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
          />
        )}

        {currentTab === 'jobs' && engineUp && (
          <JobsTab
            jobs={jobs}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            onRefresh={() => fetchAll(true)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            initial={settings}
            engineUp={!!engineUp}
            onSaved={() => {
              setSettingsDirty(false)
              fetchAll(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
