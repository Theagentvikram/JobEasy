import { useEffect, useState } from 'react'
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
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { autoapply, type AutoApplyStats, type AutoApplyJob, type PipelineRun, type AutoApplySettings } from '../services/autoapply'
import { Card, Button, Badge, Spinner, EmptyState } from '../components/ui'

// Source display config
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
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return ''
  const fmt = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return n.toString()
  }
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`
  return fmt(min || max || 0)
}

export default function AutoApply() {
  const [stats, setStats] = useState<AutoApplyStats | null>(null)
  const [jobs, setJobs] = useState<AutoApplyJob[]>([])
  const [history, setHistory] = useState<PipelineRun[]>([])
  const [settings, setSettings] = useState<AutoApplySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [engineUp, setEngineUp] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const fetchAll = async () => {
    setLoading(true)
    setError('')

    // Check if AutoApply engine is running
    try {
      await autoapply.health()
      setEngineUp(true)
    } catch {
      setEngineUp(false)
      setLoading(false)
      return
    }

    try {
      const [statsRes, jobsRes, historyRes, settingsRes] = await Promise.all([
        autoapply.getStats(),
        autoapply.getJobs(0, 50),
        autoapply.getPipelineHistory(5),
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
      // Refresh after a short delay to show updated history
      setTimeout(fetchAll, 3000)
    } catch {
      setError('Failed to trigger pipeline')
    } finally {
      setRunning(false)
    }
  }

  const filteredJobs = sourceFilter === 'all'
    ? jobs
    : jobs.filter(j => j.source === sourceFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={28} />
      </div>
    )
  }

  if (engineUp === false) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AutoApply</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AI-powered job discovery from Wellfound, Naukri, YC & more
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={<AlertCircle size={24} />}
            title="AutoApply engine is offline"
            description="Start the backend with ./dev.sh — AutoApply is built into the backend"
            action={
              <Button variant="secondary" onClick={fetchAll}>
                <RefreshCw size={14} /> Retry
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket size={20} className="text-brand-700" />
            AutoApply
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AI startup job discovery &middot; Wellfound &middot; Naukri &middot; YC &middot; LinkedIn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={14} />
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleRun(true)} disabled={running}>
            <Play size={14} /> Dry Run
          </Button>
          <Button size="sm" onClick={() => handleRun(false)} disabled={running} loading={running}>
            <Rocket size={14} /> Run Pipeline
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Settings Panel (collapsible) */}
      {showSettings && settings && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings size={14} className="text-slate-400" />
            Pipeline Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Job Titles</p>
              <div className="flex flex-wrap gap-1">
                {settings.job_titles.split(',').map((t, i) => (
                  <Badge key={i} variant="default" size="sm">{t.trim()}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Locations</p>
              <div className="flex flex-wrap gap-1">
                {settings.job_locations.split(',').map((l, i) => (
                  <Badge key={i} variant="brand" size="sm"><MapPin size={10} /> {l.trim()}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sources</p>
              <div className="flex flex-wrap gap-1">
                {settings.sources.map((s, i) => (
                  <Badge key={i} variant="accent" size="sm"><Globe size={10} /> {s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Min Salary</p>
              <p className="text-slate-900 dark:text-white font-medium">
                {formatSalary(settings.min_salary, null)} /yr
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Match Threshold</p>
              <p className="text-slate-900 dark:text-white font-medium">{settings.match_score_threshold}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Daily Apply Limit</p>
              <p className="text-slate-900 dark:text-white font-medium">{settings.max_applications_per_day} jobs/day</p>
            </div>
          </div>
          {settings.blacklist_companies && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Blocked Companies</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {settings.blacklist_companies.split(',').map(c => c.trim()).join(' · ')}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Edit <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">backend/.env</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">backend/config/profile.yaml</code> to change settings
          </p>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Jobs Discovered"
            value={stats.total_discovered}
            icon={Briefcase}
            color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          />
          <StatCard
            label="Applied"
            value={stats.total_applied}
            icon={Target}
            color="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
          />
          <StatCard
            label="Emails Sent"
            value={stats.total_emails}
            icon={Mail}
            color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          />
          <StatCard
            label="Avg Match"
            value={`${stats.avg_match_score}%`}
            icon={TrendingUp}
            color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
        </div>
      )}

      {/* Source Breakdown */}
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
                    sourceFilter === source
                      ? 'ring-2 ring-brand-700 ring-offset-1 dark:ring-offset-slate-900'
                      : ''
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Pipeline Runs */}
        <Card className="lg:col-span-1 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            Recent Runs
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No runs yet. Hit "Run Pipeline" to start.</p>
          ) : (
            <div className="space-y-3">
              {history.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === 'completed' ? 'success' : run.status === 'running' ? 'brand' : 'warning'} size="sm">
                        {run.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(run.started_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    <p>{run.discovered} found</p>
                    <p>{run.applied} applied</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Matched Jobs */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={14} className="text-slate-400" />
              {sourceFilter !== 'all'
                ? `Jobs from ${SOURCE_CONFIG[sourceFilter]?.label || sourceFilter}`
                : 'Top Matched Jobs'
              }
              <span className="text-xs font-normal text-slate-400">({filteredJobs.length})</span>
            </h2>
            <button onClick={fetchAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
              <RefreshCw size={14} />
            </button>
          </div>
          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No jobs discovered yet"
              description="Run the pipeline to start scraping AI startup jobs from Wellfound, Naukri, YC & LinkedIn"
            />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Score */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    job.match_score >= 80
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : job.match_score >= 60
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                  }`}>
                    {job.match_score || '—'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{job.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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

                  {/* Source + Status */}
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
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-700">
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
    </div>
  )
}
