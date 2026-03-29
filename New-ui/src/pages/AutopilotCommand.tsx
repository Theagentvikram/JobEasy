/**
 * Autopilot Command Center
 *
 * Unified view: funnel stats → live job table → run history → AI settings.
 * Replaces the fragmented AutoApply + AutoPilot split for the auto-application workflow.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Activity,
  AlertCircle,
  Bot,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Mail,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings,
  Sigma,
  Target,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import {
  autoapply,
  type AutoApplyJob,
  type AutoApplySettings,
  type PipelineRun,
  type AutoApplyStats,
} from '../services/autoapply'
import { Card, Button, Badge, Spinner, EmptyState, Skeleton, cn } from '../components/ui'
import { toast } from '../lib/toast'
import PipelineProgressModal from '../components/PipelineProgressModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  discovered: { label: 'Discovered', color: 'bg-slate-100 text-slate-600 dark:bg-dark-card dark:text-slate-400' },
  scored:     { label: 'Scored',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  skipped:    { label: 'Skipped',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  tailored:   { label: 'Tailored',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' },
  applied:    { label: 'Applied',     color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
  emailed:    { label: 'Emailed',     color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' },
  failed:     { label: 'Failed',      color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  linkedin:      { label: 'LinkedIn',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  indeed:        { label: 'Indeed',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  glassdoor:     { label: 'Glassdoor',    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
  zip_recruiter: { label: 'ZipRecruiter', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' },
  wellfound:     { label: 'Wellfound',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  naukri:        { label: 'Naukri',       color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  yc_waas:       { label: 'YC Startups',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
}

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-brand-600 dark:text-brand-400'
  : s >= 60 ? 'text-amber-600 dark:text-amber-400'
  : 'text-red-500 dark:text-red-400'

const SCORE_BAR = (s: number) =>
  s >= 80 ? 'bg-brand-500' : s >= 60 ? 'bg-amber-400' : 'bg-red-400'

const AI_PROVIDERS = [
  { value: 'groq',      label: 'Fast AI (free · cloud)',         needsKey: true },
  { value: 'openai',    label: 'Premium AI (cloud)',             needsKey: true },
  { value: 'anthropic', label: 'Advanced AI (cloud)',            needsKey: true },
  { value: 'ollama',    label: 'Local AI (self-hosted)',         needsKey: false },
  { value: 'openclaw',  label: 'Custom endpoint',               needsKey: true },
]

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function fmtSalary(min: number | null, max: number | null) {
  if (!min && !max) return null
  const f = (n: number) =>
    n >= 1_00_00_000 ? `${(n / 1_00_00_000).toFixed(1)}Cr`
    : n >= 1_00_000  ? `${(n / 1_00_000).toFixed(1)}L`
    : n >= 1_000     ? `${(n / 1_000).toFixed(0)}k`
    : String(n)
  if (min && max && min !== max) return `${f(min)}–${f(max)}`
  return f(min ?? max ?? 0)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(start: string, end: string | null | undefined) {
  if (!end) return 'Running…'
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FunnelBar({ stats }: { stats: AutoApplyStats }) {
  const steps = [
    { label: 'Discovered', value: stats.total_discovered, color: 'bg-slate-400 dark:bg-slate-600' },
    { label: 'Scored',     value: Math.round(stats.total_discovered * 0.4), color: 'bg-blue-500' },
    { label: 'Applied',    value: stats.total_applied, color: 'bg-brand-600' },
    { label: 'Emailed',    value: stats.total_emails,  color: 'bg-teal-500' },
  ]
  const max = stats.total_discovered || 1
  return (
    <div className="flex items-end gap-1 h-10">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{s.value}</span>
          <div
            className={`w-full rounded-t-sm ${s.color} transition-all`}
            style={{ height: `${Math.max(4, (s.value / max) * 28)}px` }}
          />
          {i < steps.length - 1 && (
            <ChevronRight
              size={10}
              className="absolute translate-x-full text-slate-300 dark:text-slate-600 hidden"
            />
          )}
        </div>
      ))}
    </div>
  )
}

function StatPill({
  label, value, icon: Icon, accent,
}: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-none mb-0.5">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      </div>
    </div>
  )
}

function RunRow({ run }: { run: PipelineRun }) {
  const [open, setOpen] = useState(false)
  const statusColor =
    run.status === 'completed' ? 'text-brand-600 dark:text-brand-400'
    : run.status === 'running'  ? 'text-blue-600 dark:text-blue-400'
    : 'text-red-500 dark:text-red-400'

  return (
    <div className="border border-slate-100 dark:border-dark-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-dark-hover/60 transition-colors text-left"
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${run.status === 'completed' ? 'bg-brand-500' : run.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-400'}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-shrink-0">
          {fmtDate(run.started_at)}
        </span>
        <span className={`text-xs font-semibold ${statusColor} flex-shrink-0`}>
          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
          {fmtDuration(run.started_at, run.finished_at)}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span><span className="font-semibold text-slate-700 dark:text-slate-300">{run.discovered}</span> found</span>
          <span><span className="font-semibold text-brand-600 dark:text-brand-400">{run.applied}</span> applied</span>
          <span><span className="font-semibold text-teal-600 dark:text-teal-400">{run.emails_sent}</span> emails</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 dark:border-dark-border px-4 py-3 bg-slate-50 dark:bg-dark-card/40 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Discovered', v: run.discovered, c: 'text-slate-700 dark:text-slate-300' },
            { label: 'Applied',    v: run.applied,    c: 'text-brand-600 dark:text-brand-400' },
            { label: 'Emails Sent',v: run.emails_sent,c: 'text-teal-600 dark:text-teal-400' },
          ].map(item => (
            <div key={item.label}>
              <p className={`text-xl font-bold ${item.c}`}>{item.v}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function JobRow({ job }: { job: AutoApplyJob }) {
  const sm = STATUS_META[job.status] ?? { label: job.status, color: 'bg-slate-100 text-slate-600' }
  const src = SOURCE_META[job.source] ?? { label: job.source, color: 'bg-slate-100 text-slate-600' }
  const salary = fmtSalary(job.salary_min, job.salary_max)
  const score = Math.round(job.match_score ?? 0)

  return (
    <tr className="group border-b border-slate-50 dark:border-dark-border/60 hover:bg-slate-50/60 dark:hover:bg-dark-hover/30 transition-colors">
      {/* Score */}
      <td className="py-2.5 pl-4 pr-3 w-16">
        <div className="flex flex-col items-center gap-1">
          <span className={`text-sm font-bold leading-none ${SCORE_COLOR(score)}`}>{score}</span>
          <div className="w-10 h-1 rounded-full bg-slate-100 dark:bg-dark-elevated overflow-hidden">
            <div className={`h-full rounded-full ${SCORE_BAR(score)}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </td>
      {/* Role */}
      <td className="py-2.5 px-2 max-w-[200px]">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{job.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.company}</p>
      </td>
      {/* Location */}
      <td className="py-2.5 px-2 hidden sm:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <MapPin size={11} className="flex-shrink-0" />
          {job.location || '—'}
        </span>
      </td>
      {/* Source */}
      <td className="py-2.5 px-2 hidden md:table-cell">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${src.color}`}>
          {src.label}
        </span>
      </td>
      {/* Salary */}
      <td className="py-2.5 px-2 hidden lg:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">{salary ?? '—'}</span>
      </td>
      {/* Status */}
      <td className="py-2.5 px-2">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${sm.color}`}>
          {sm.label}
        </span>
      </td>
      {/* Applied at */}
      <td className="py-2.5 px-2 hidden xl:table-cell">
        <span className="text-xs text-slate-400 dark:text-slate-500">{job.applied_at ? fmtDate(job.applied_at) : '—'}</span>
      </td>
      {/* Actions */}
      <td className="py-2.5 pl-2 pr-4">
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink size={11} />
            Open
          </a>
        )}
      </td>
    </tr>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  initial,
  onSaved,
}: {
  initial: AutoApplySettings
  onSaved: () => void
}) {
  const [form, setForm] = useState<AutoApplySettings>(initial)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  const set = (k: keyof AutoApplySettings, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }))

  const selectedProvider = AI_PROVIDERS.find(p => p.value === form.ai_provider) ?? AI_PROVIDERS[0]
  const isOllama = form.ai_provider === 'ollama'

  const save = async () => {
    setSaving(true)
    try {
      await autoapply.updateSettings(form)
      toast('Settings saved', 'success')
      onSaved()
    } catch {
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const testConn = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const key = isOllama ? '' : (
        form.ai_provider === 'groq'      ? form.groq_api_key
        : form.ai_provider === 'openai'  ? form.openai_api_key
        : form.anthropic_api_key
      )
      const res = await autoapply.testConnection(
        form.ai_provider,
        key,
        isOllama ? form.ollama_host : undefined,
      )
      setTestResult({ ok: true, msg: (res.data as { message: string }).message })
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Connection failed'
      setTestResult({ ok: false, msg })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── Job search ── */}
      <Card className="p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Target size={14} className="text-brand-600" /> Job Search
        </h4>
        <Field label="Job Titles">
          <TagInput
            tags={form.job_titles.split(',').map(t => t.trim()).filter(Boolean)}
            onChange={tags => set('job_titles', tags.join(', '))}
            placeholder="Software Engineer, ML Engineer…"
          />
        </Field>
        <Field label="Locations">
          <TagInput
            tags={form.job_locations.split(',').map(t => t.trim()).filter(Boolean)}
            onChange={tags => set('job_locations', tags.join(', '))}
            placeholder="Remote, San Francisco…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min Salary ($)">
            <input
              type="number"
              value={form.min_salary}
              onChange={e => set('min_salary', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Max Apps / Day">
            <input
              type="number"
              value={form.max_applications_per_day}
              onChange={e => set('max_applications_per_day', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Score Threshold (0–100)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0} max={100}
              value={form.match_score_threshold}
              onChange={e => set('match_score_threshold', Number(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className={`text-sm font-bold w-8 text-right ${SCORE_COLOR(form.match_score_threshold)}`}>
              {form.match_score_threshold}
            </span>
          </div>
        </Field>
        <Field label="Blacklist Companies">
          <input
            type="text"
            value={form.blacklist_companies}
            onChange={e => set('blacklist_companies', e.target.value)}
            placeholder="Amazon, Meta…"
            className={inputCls}
          />
        </Field>
      </Card>

      {/* ── AI Provider ── */}
      <Card className="p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bot size={14} className="text-brand-600" /> AI Provider
        </h4>
        <Field label="Provider">
          <select
            value={form.ai_provider}
            onChange={e => set('ai_provider', e.target.value)}
            className={inputCls}
          >
            {AI_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>

        {/* Local AI config */}
        {isOllama && (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Server size={14} className="text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">
                Your local server at <span className="font-mono font-semibold">{form.ollama_host}</span> will handle all AI inference — no API keys needed.
                Uses <span className="font-semibold">{form.ollama_model}</span> for scoring and <span className="font-semibold">{form.ollama_fast_model}</span> for parsing.
              </p>
            </div>
            <Field label="Host URL">
              <input
                type="text"
                value={form.ollama_host}
                onChange={e => set('ollama_host', e.target.value)}
                placeholder="http://192.168.31.246:11434"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary Model">
                <input
                  type="text"
                  value={form.ollama_model}
                  onChange={e => set('ollama_model', e.target.value)}
                  placeholder="gemma3:1b"
                  className={inputCls}
                />
              </Field>
              <Field label="Fast Model">
                <input
                  type="text"
                  value={form.ollama_fast_model}
                  onChange={e => set('ollama_fast_model', e.target.value)}
                  placeholder="qwen2.5:1.5b"
                  className={inputCls}
                />
              </Field>
            </div>
          </>
        )}

        {/* API key for cloud providers */}
        {selectedProvider.needsKey && (
          <Field label="API Key">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={
                  form.ai_provider === 'groq'     ? form.groq_api_key
                  : form.ai_provider === 'openai' ? form.openai_api_key
                  : form.anthropic_api_key
                }
                onChange={e => {
                  if (form.ai_provider === 'groq')     set('groq_api_key', e.target.value)
                  else if (form.ai_provider === 'openai') set('openai_api_key', e.target.value)
                  else set('anthropic_api_key', e.target.value)
                }}
                autoComplete="off"
                placeholder="sk-…"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        )}

        {/* Test connection */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={testConn}
            loading={testing}
          >
            {testing ? null : <Wifi size={13} />}
            Test Connection
          </Button>
          {testResult && (
            <span className={`text-xs font-medium flex items-center gap-1 ${testResult.ok ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'}`}>
              {testResult.ok ? <Check size={12} /> : <WifiOff size={12} />}
              {testResult.msg}
            </span>
          )}
        </div>
      </Card>

      {/* ── Schedule ── */}
      <Card className="p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock size={14} className="text-brand-600" /> Schedule
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pipeline runs automatically every day at the configured time (UTC).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hour (0–23 UTC)">
            <input
              type="number"
              min={0} max={23}
              value={form.pipeline_hour}
              onChange={e => set('pipeline_hour', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Minute (0–59)">
            <input
              type="number"
              min={0} max={59}
              value={form.pipeline_minute}
              onChange={e => set('pipeline_minute', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* ── Email outreach ── */}
      <Card className="p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail size={14} className="text-brand-600" /> Cold Email Outreach
        </h4>
        <Toggle
          checked={form.cold_email_enabled}
          onChange={v => set('cold_email_enabled', v)}
          label="Enable cold email to hiring managers"
        />
        {form.cold_email_enabled && (
          <>
            <Field label="Gmail Address">
              <input
                type="email"
                value={form.gmail_sender_email}
                onChange={e => set('gmail_sender_email', e.target.value)}
                className={inputCls}
                placeholder="you@gmail.com"
              />
            </Field>
            <Field
              label="Gmail App Password"
              hint={<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">Generate at myaccount.google.com/apppasswords</a>}
            >
              <SecretInput
                value={form.gmail_app_password}
                onChange={v => set('gmail_app_password', v)}
                placeholder="xxxx xxxx xxxx xxxx"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily email limit">
                <input type="number" value={form.daily_email_limit} onChange={e => set('daily_email_limit', Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Delay between emails (s)">
                <input type="number" value={form.email_delay_seconds} onChange={e => set('email_delay_seconds', Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
          </>
        )}
      </Card>

      {/* Save button */}
      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save size={14} />
          Save Settings
        </Button>
      </div>
    </div>
  )
}

// ─── Reusable form primitives ─────────────────────────────────────────────────

const inputCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-colors'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      {children}
      {hint && <div className="text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  )
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  )
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const add = () => {
    const v = input.trim()
    if (!v || tags.includes(v)) { setInput(''); return }
    onChange([...tags, v]); setInput('')
  }
  const remove = (i: number) => onChange(tags.filter((_, j) => j !== i))

  return (
    <div
      className="min-h-[2.25rem] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-dark-card cursor-text focus-within:ring-2 focus-within:ring-brand-600 focus-within:border-transparent transition-all"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
          {t}
          <button type="button" onClick={e => { e.stopPropagation(); remove(i) }} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } else if (e.key === 'Backspace' && !input && tags.length) remove(tags.length - 1) }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] bg-transparent text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 outline-none"
      />
      {input && <button type="button" onClick={add} className="text-brand-600 cursor-pointer"><Plus size={14} /></button>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'jobs' | 'history' | 'settings'
type StatusFilter = 'all' | string

export default function AutopilotCommand() {
  const [stats, setStats]       = useState<AutoApplyStats | null>(null)
  const [jobs, setJobs]         = useState<AutoApplyJob[]>([])
  const [history, setHistory]   = useState<PipelineRun[]>([])
  const [settings, setSettings] = useState<AutoApplySettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('jobs')
  const [running, setRunning]     = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressDryRun, setProgressDryRun] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [minScore, setMinScore]   = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const load = useCallback(async () => {
    // Load each section independently so one failure doesn't block the whole page
    const results = await Promise.allSettled([
      autoapply.getStats(),
      autoapply.getAllJobs(0, 200),   // aggregated: autopilot sessions + pipeline
      autoapply.getPipelineHistory(20),
      autoapply.getSettings(),
    ])

    const [statsRes, jobsRes, historyRes, settingsRes] = results

    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
    else setStats({ total_discovered: 0, total_applied: 0, total_emails: 0, avg_match_score: 0, by_source: {} })

    if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data)
    else toast('Could not load jobs — run AutoPilot to discover some', 'info')

    if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data)

    if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.data)
    else toast('Could not load settings — check backend connection', 'error')

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const runNow = async (dry = false) => {
    setRunning(true)
    try {
      await autoapply.triggerPipeline(dry)
      setProgressDryRun(dry)
      setShowProgress(true)
    } catch {
      toast('Failed to trigger pipeline', 'error')
    } finally {
      setRunning(false)
    }
  }

  const filtered = jobs.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false
    if (sourceFilter !== 'all' && j.source !== sourceFilter) return false
    if (j.match_score < minScore) return false
    return true
  })

  const sources = [...new Set(jobs.map(j => j.source))]
  const isOllama = settings?.ai_provider === 'ollama'

  if (loading) {
    return (
      <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        {/* Table skeleton */}
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <>
    <PipelineProgressModal
      open={showProgress}
      dryRun={progressDryRun}
      onClose={() => { setShowProgress(false); load() }}
    />
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap size={20} className="text-brand-600" />
            Automation Ops Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Unified monitoring and controls for Copilot + AutoApply runs, jobs, and settings.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Local AI badge */}
          {isOllama && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 text-xs font-medium text-brand-700 dark:text-brand-300">
              <Server size={12} />
              Local AI · {settings?.ollama_model}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => load()}>
            <RefreshCw size={13} />
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={() => runNow(true)} loading={running}>
            <Eye size={13} />
            Dry Run
          </Button>
          <Button size="sm" onClick={() => runNow(false)} loading={running}>
            <Play size={13} />
            Run Now
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill label="Discovered"   value={stats.total_discovered} icon={Globe}     accent="bg-slate-100 text-slate-600 dark:bg-dark-card dark:text-slate-400" />
          <StatPill label="Applied"      value={stats.total_applied}    icon={Briefcase} accent="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" />
          <StatPill label="Emails Sent"  value={stats.total_emails}     icon={Mail}      accent="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" />
          <StatPill label="Avg Score"    value={`${stats.avg_match_score}%`} icon={TrendingUp} accent="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />
        </div>
      )}

      {/* ── Funnel ── */}
      {stats && stats.total_discovered > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pipeline Funnel</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {stats.total_applied > 0
                ? `${((stats.total_applied / stats.total_discovered) * 100).toFixed(1)}% apply rate`
                : 'No applications yet'}
            </span>
          </div>
          <FunnelBar stats={stats} />
          {stats.by_source && Object.keys(stats.by_source).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-dark-border">
              {Object.entries(stats.by_source).map(([src, count]) => {
                const m = SOURCE_META[src] ?? { label: src, color: 'bg-slate-100 text-slate-600' }
                return (
                  <span key={src} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.color}`}>
                    {m.label} · {count}
                  </span>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-slate-100 dark:border-dark-border">
        {([
          { id: 'jobs',     label: `Jobs (${jobs.length})`,       icon: Briefcase },
          { id: 'history',  label: `Runs (${history.length})`,    icon: Activity },
          { id: 'settings', label: 'Settings',                    icon: Settings },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer',
              tab === id
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Jobs tab ── */}
      {tab === 'jobs' && (
        <div className="flex flex-col gap-3">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-dark-border-subtle rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
            >
              <Filter size={12} />
              Filters
              {(statusFilter !== 'all' || sourceFilter !== 'all' || minScore > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 ml-0.5" />
              )}
            </button>
            {/* Quick status filters */}
            {['all', 'applied', 'scored', 'skipped', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 dark:border-dark-border-subtle text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover'
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
              {filtered.length} of {jobs.length}
            </span>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Source">
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={inputCls}>
                  <option value="all">All sources</option>
                  {sources.map(s => (
                    <option key={s} value={s}>{SOURCE_META[s]?.label ?? s}</option>
                  ))}
                </select>
              </Field>
              <Field label={`Min Score: ${minScore}`}>
                <input
                  type="range" min={0} max={100}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="accent-brand-600"
                />
              </Field>
              <div className="flex items-end">
                <button
                  onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setMinScore(0) }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer underline"
                >
                  Reset filters
                </button>
              </div>
            </Card>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No jobs found"
              description={jobs.length === 0 ? 'Run the pipeline to discover jobs.' : 'Try adjusting your filters.'}
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-dark-border bg-slate-50/60 dark:bg-dark-card/40">
                      <th className="py-2.5 pl-4 pr-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-16">Score</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Role</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide hidden sm:table-cell">Location</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide hidden md:table-cell">Source</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide hidden lg:table-cell">Salary</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="py-2.5 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide hidden xl:table-cell">Applied</th>
                      <th className="py-2.5 pl-2 pr-4 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(job => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div className="flex flex-col gap-2">
          {history.length === 0 ? (
            <EmptyState icon={<Activity size={20} />} title="No runs yet" description="Trigger the pipeline to see run history here." />
          ) : (
            history.map(run => <RunRow key={run.id} run={run} />)
          )}
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === 'settings' && settings && (
        <SettingsPanel initial={settings} onSaved={load} />
      )}
    </div>
    </>
  )
}
