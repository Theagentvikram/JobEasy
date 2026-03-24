import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Table2,
  Wrench,
  XCircle,
} from 'lucide-react'
import { autoapply, type AutoApplySettings } from '../services/autoapply'
import { Button, Card, Badge, Input, cn } from '../components/ui'
import { toast } from '../lib/toast'

function Toggle({ checked, onChange, label, description }: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

function StatusPill({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={cn(
      'rounded-2xl border px-4 py-3',
      ok
        ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20'
        : 'border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20'
    )}>
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
        )}
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{detail}</p>
    </div>
  )
}

export default function GoogleSheetsPage() {
  const qc = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['autoapply-settings'],
    queryFn: () => autoapply.getSettings().then((res) => res.data as AutoApplySettings),
  })
  const statusQuery = useQuery({
    queryKey: ['google-sheets-status'],
    queryFn: () => autoapply.getGoogleSheetsStatus().then((res) => res.data),
  })

  const [form, setForm] = useState({
    google_sheets_enabled: false,
    google_sheets_spreadsheet_id: '',
    google_sheets_job_tracker_tab: 'Job Tracker',
    google_sheets_autoapply_tab: 'AutoApply Jobs',
  })

  useEffect(() => {
    const settings = settingsQuery.data
    if (!settings) return
    setForm({
      google_sheets_enabled: Boolean(settings.google_sheets_enabled),
      google_sheets_spreadsheet_id: settings.google_sheets_spreadsheet_id || '',
      google_sheets_job_tracker_tab: settings.google_sheets_job_tracker_tab || 'Job Tracker',
      google_sheets_autoapply_tab: settings.google_sheets_autoapply_tab || 'AutoApply Jobs',
    })
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await autoapply.updateSettings(form)
    },
    onSuccess: async () => {
      toast('Google Sheets settings saved', 'success')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['autoapply-settings'] }),
        qc.invalidateQueries({ queryKey: ['google-sheets-status'] }),
      ])
    },
    onError: (error: any) => {
      toast(error?.response?.data?.detail || 'Could not save Google Sheets settings', 'error')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => autoapply.testGoogleSheets().then((res) => res.data),
    onSuccess: async (data) => {
      toast(`Connected to "${data.spreadsheet_title || data.spreadsheet_id}"`, 'success')
      await qc.invalidateQueries({ queryKey: ['google-sheets-status'] })
    },
    onError: (error: any) => {
      toast(error?.response?.data?.detail || 'Google Sheets test failed', 'error')
    },
  })

  const syncMutation = useMutation({
    mutationFn: (scope: 'tracker' | 'autoapply' | 'all') =>
      autoapply.syncGoogleSheets(scope).then((res) => res.data),
    onSuccess: (data) => {
      const trackerMsg = data.tracker ? `${data.tracker.rows_written} tracker rows` : null
      const autoapplyMsg = data.autoapply ? `${data.autoapply.rows_written} pipeline rows` : null
      toast([trackerMsg, autoapplyMsg].filter(Boolean).join(' · ') || 'Google Sheets synced', 'success')
    },
    onError: (error: any) => {
      toast(error?.response?.data?.detail || 'Google Sheets sync failed', 'error')
    },
  })

  const status = statusQuery.data
  const sheetUrl = form.google_sheets_spreadsheet_id
    ? `https://docs.google.com/spreadsheets/d/${form.google_sheets_spreadsheet_id}/edit`
    : ''

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))] p-6 shadow-sm dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.96))]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <FileSpreadsheet size={14} />
              Google Sheets Console
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              Turn your tracker into a live spreadsheet mirror.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Connect a spreadsheet once, then keep Job Tracker and AutoApply output synced from the backend.
              This page lets you save the sheet ID, verify access, and manually push a fresh export whenever you want.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {status?.enabled ? <Badge variant="success">Sync enabled</Badge> : <Badge variant="warning">Sync paused</Badge>}
            {status?.spreadsheet_accessible ? <Badge variant="brand">Sheet reachable</Badge> : <Badge variant="default">Awaiting validation</Badge>}
            {sheetUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={14} />
                Open sheet
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  <Database size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Connection Setup</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">These settings are saved per user in AutoApply settings.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <Toggle
                checked={form.google_sheets_enabled}
                onChange={(next) => setForm((prev) => ({ ...prev, google_sheets_enabled: next }))}
                label="Enable Google Sheets sync"
                description="When enabled, the backend can mirror Job Tracker and AutoApply data into your spreadsheet."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Spreadsheet ID"
                    value={form.google_sheets_spreadsheet_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, google_sheets_spreadsheet_id: e.target.value }))}
                    placeholder="1AbC...xyz from docs.google.com/spreadsheets/d/<ID>/edit"
                  />
                </div>
                <Input
                  label="Job Tracker tab base"
                  value={form.google_sheets_job_tracker_tab}
                  onChange={(e) => setForm((prev) => ({ ...prev, google_sheets_job_tracker_tab: e.target.value }))}
                  placeholder="Job Tracker"
                />
                <Input
                  label="AutoApply tab base"
                  value={form.google_sheets_autoapply_tab}
                  onChange={(e) => setForm((prev) => ({ ...prev, google_sheets_autoapply_tab: e.target.value }))}
                  placeholder="AutoApply Jobs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                  <ShieldCheck size={14} />
                  Save settings
                </Button>
                <Button variant="outline" onClick={() => testMutation.mutate()} loading={testMutation.isPending}>
                  <Wrench size={14} />
                  Test access
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Manual Sync</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use this when you want an immediate refresh before checking the sheet.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-3">
              <button
                onClick={() => syncMutation.mutate('tracker')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/70 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
              >
                <Table2 size={18} className="text-teal-600 dark:text-teal-400" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Sync tracker</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Push the current Job Tracker board into its dedicated sheet tab.</p>
              </button>
              <button
                onClick={() => syncMutation.mutate('autoapply')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/70 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
              >
                <Database size={18} className="text-blue-600 dark:text-blue-400" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Sync AutoApply</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Refresh the unified jobs export from AutoPilot and AutoApply results.</p>
              </button>
              <button
                onClick={() => syncMutation.mutate('all')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/70 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-violet-800 dark:hover:bg-violet-950/20"
              >
                <FileSpreadsheet size={18} className="text-violet-600 dark:text-violet-400" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Sync everything</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Run both exports in one shot and rewrite the latest sheet state.</p>
              </button>
            </div>

            {syncMutation.isPending && (
              <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Writing fresh rows to Google Sheets…
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Backend Readiness</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">This reflects the server-side integration, not just saved form values.</p>
              </div>
            </div>

            <div className="grid gap-3">
              <StatusPill
                ok={Boolean(status?.service_account_ready)}
                label="Service account"
                detail={status?.service_account_ready
                  ? `${status.service_account_email || 'Configured'} via ${status.credentials_source}`
                  : 'Backend credentials are not available yet.'}
              />
              <StatusPill
                ok={Boolean(status?.enabled)}
                label="Sync switch"
                detail={status?.enabled
                  ? 'Automatic sync hooks are allowed to run for this user.'
                  : 'Saved data will stay in-app only until you enable the sync switch.'}
              />
              <StatusPill
                ok={Boolean(status?.spreadsheet_accessible)}
                label="Spreadsheet access"
                detail={status?.spreadsheet_accessible
                  ? `${status?.spreadsheet_title || 'Spreadsheet'} is reachable by the backend.`
                  : 'The spreadsheet is not reachable yet. Double-check the ID and sharing permissions.'}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-xs leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">Tracker tab:</span> {status?.job_tracker_sheet_title || 'Not resolved yet'}</p>
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">AutoApply tab:</span> {status?.autoapply_sheet_title || 'Not resolved yet'}</p>
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">Available tabs:</span> {status?.available_sheets?.length ? status.available_sheets.join(', ') : 'No tab metadata yet'}</p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Setup Checklist</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">A quick sanity pass before you expect live writes.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                1. Paste the spreadsheet ID from the Google Sheets URL.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                2. Share the spreadsheet with the backend service account email shown above.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                3. Click <span className="font-semibold">Test access</span> to confirm the backend can see the sheet.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                4. Click <span className="font-semibold">Sync everything</span> once to populate both tabs immediately.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
