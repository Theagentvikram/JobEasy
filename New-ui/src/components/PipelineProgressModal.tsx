/**
 * PipelineProgressModal
 * Shows live progress while the AutoApply pipeline runs (dry run or real).
 * Polls /autoapply/pipeline/status every 2 seconds until done/error.
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, X, Eye } from 'lucide-react'
import { autoapply } from '../services/autoapply'

interface PipelineStatus {
  status: 'idle' | 'running' | 'done' | 'error'
  phase: string
  dry_run: boolean
  started_at: string
  steps: string[]
  discovered: number
  scored: number
  applied: number
  emails_sent: number
  total_scraped?: number
  error: string | null
}

const PHASES = [
  { key: 'starting',  label: 'Starting up',              pct: 2  },
  { key: 'scraping',  label: 'Scraping job boards',       pct: 35 },
  { key: 'scoring',   label: 'Scoring matches',           pct: 70 },
  { key: 'applying',  label: 'Applying / tailoring resumes', pct: 90 },
  { key: 'done',      label: 'Complete',                  pct: 100 },
]

function phaseIndex(phase: string) {
  const i = PHASES.findIndex(p => p.key === phase)
  return i === -1 ? 0 : i
}

function phaseProgress(status: PipelineStatus | null): number {
  if (!status) return 0
  if (status.status === 'done') return 100
  if (status.status === 'error') return phaseIndex(status.phase) > 0 ? PHASES[phaseIndex(status.phase)].pct : 5

  const idx = phaseIndex(status.phase)
  const base = PHASES[idx]?.pct ?? 0
  const next = PHASES[idx + 1]?.pct ?? base

  // Within scoring phase: use scored/discovered ratio to interpolate
  if (status.phase === 'scoring' && status.discovered > 0) {
    const ratio = Math.min(status.scored / status.discovered, 1)
    return Math.round(base + ratio * (next - base))
  }
  return base
}

interface Props {
  open: boolean
  dryRun: boolean
  onClose: () => void
}

export default function PipelineProgressModal({ open, dryRun, onClose }: Props) {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const logRef     = useRef<HTMLDivElement>(null)

  const isDone = status?.status === 'done' || status?.status === 'error'
  const pct = phaseProgress(status)

  // Poll backend
  useEffect(() => {
    if (!open) return
    setStatus(null)
    setElapsed(0)

    const poll = async () => {
      try {
        const res = await autoapply.getPipelineStatus()
        setStatus(res.data)
      } catch { /* backend unreachable */ }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current)   clearInterval(timerRef.current)
    }
  }, [open])

  // Stop polling when done
  useEffect(() => {
    if (isDone && intervalRef.current) {
      clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isDone])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [status?.steps])

  if (!open) return null

  const currentPhaseIdx = phaseIndex(status?.phase ?? 'starting')
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isDone ? onClose : undefined} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Progress bar — full width at top */}
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              status?.status === 'error' ? 'bg-red-500' : 'bg-brand-600'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 ${dryRun ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-brand-50 dark:bg-brand-950/30'}`}>
          <div className="flex items-center gap-2.5">
            {dryRun && <Eye size={16} className="text-violet-600 dark:text-violet-400" />}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {dryRun ? 'Dry Run in Progress' : 'Pipeline Running'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dryRun ? 'Scraping & scoring — no applications sent' : 'Scraping, scoring, and applying to matched jobs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">{pct}%</span>
            <span className="text-xs font-mono text-slate-400">{fmt(elapsed)}</span>
            {isDone && (
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Phase stepper */}
          <div className="space-y-1.5">
            {PHASES.filter(p => p.key !== 'error').map((phase, idx) => {
              const done = idx < currentPhaseIdx || status?.status === 'done'
              const active = idx === currentPhaseIdx && !isDone
              const errored = status?.status === 'error' && idx === currentPhaseIdx
              return (
                <div key={phase.key} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    errored ? 'bg-red-100 dark:bg-red-950 text-red-600'
                    : done   ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700'
                    : active ? 'bg-brand-600 text-white shadow-sm shadow-brand-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {errored ? <XCircle size={13} />
                     : done  ? <CheckCircle2 size={13} />
                     : active ? <Loader2 size={12} className="animate-spin" />
                     : <span className="text-[10px] font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-sm transition-colors flex-1 ${
                    errored ? 'text-red-600 dark:text-red-400 font-medium'
                    : done   ? 'text-slate-400 dark:text-slate-500 line-through'
                    : active ? 'text-slate-900 dark:text-slate-50 font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                  }`}>{phase.label}</span>

                  {/* Live counts per phase */}
                  {active && phase.key === 'scraping' && (
                    <span className="text-[11px] text-brand-600 dark:text-brand-400 animate-pulse font-medium">running…</span>
                  )}
                  {active && phase.key === 'scoring' && status && status.discovered > 0 && (
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {status.scored}/{status.discovered}
                    </span>
                  )}
                  {done && phase.key === 'scraping' && status && status.discovered > 0 && (
                    <span className="text-[11px] text-slate-400">{status.discovered} found</span>
                  )}
                  {done && phase.key === 'scoring' && status && status.scored > 0 && (
                    <span className="text-[11px] text-slate-400">{status.scored} matched</span>
                  )}
                  {!active && !done && !errored && (
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">waiting</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scoring progress bar — shown during scoring */}
          {status?.phase === 'scoring' && status.discovered > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Scoring jobs</span>
                <span>{status.scored} / {status.discovered}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((status.scored / status.discovered) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats pills — shown when done */}
          {status?.status === 'done' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Discovered', value: status.discovered },
                { label: 'Matched', value: status.scored },
                { label: dryRun ? 'Would apply' : 'Applied', value: status.applied },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{s.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {status?.status === 'error' && status.error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-red-700 dark:text-red-400 font-mono break-all">{status.error}</p>
            </div>
          )}

          {/* Live log */}
          {status && status.steps.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Live log</p>
              <div
                ref={logRef}
                className="h-28 overflow-y-auto bg-slate-950 rounded-lg p-3 space-y-0.5 font-mono text-[11px] leading-relaxed"
              >
                {status.steps.map((line, i) => (
                  <p key={i} className={`${
                    line.includes('✅') || line.includes('COMPLETE') || line.includes('DONE') ? 'text-green-400'
                    : line.includes('❌') || line.includes('ERROR') || line.includes('failed') ? 'text-red-400'
                    : line.includes('⚠') ? 'text-amber-400'
                    : line.includes('✓') ? 'text-brand-400'
                    : line.includes('📡') || line.includes('🎯') ? 'text-cyan-400'
                    : 'text-slate-400'
                  }`}>{line}</p>
                ))}
                {!isDone && <p className="text-slate-600 animate-pulse">▌</p>}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2">
            {isDone ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            ) : (
              <p className="text-xs text-slate-400 italic self-center">
                Runs in background — you can close this and it will continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
