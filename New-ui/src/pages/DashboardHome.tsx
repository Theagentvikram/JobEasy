import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ScanText,
  FileText,
  BriefcaseBusiness,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import type { Resume, ATSScan } from '../types'
import { Card, ScoreRing, Badge, Skeleton, SkeletonCard } from '../components/ui'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}

const quickActions = [
  {
    to: '/dashboard/ats',
    icon: ScanText,
    title: 'New ATS Scan',
    description: 'Score your resume against a job description',
    lightColor: 'bg-brand-50',
    darkColor: 'dark:bg-brand-950',
    iconColor: 'text-brand-700',
    badge: 'Most used',
  },
  {
    to: '/dashboard/resumes/new',
    icon: FileText,
    title: 'Build a Resume',
    description: 'Create or import a new resume with AI help',
    lightColor: 'bg-accent-50',
    darkColor: 'dark:bg-violet-950',
    iconColor: 'text-accent-600',
    badge: null,
  },
  {
    to: '/dashboard/tracker',
    icon: BriefcaseBusiness,
    title: 'Track a Job',
    description: 'Add a new job to your application pipeline',
    lightColor: 'bg-green-50',
    darkColor: 'dark:bg-green-950',
    iconColor: 'text-green-700',
    badge: null,
  },
  {
    to: '/dashboard/assistant',
    icon: Bot,
    title: 'Ask AI Coach',
    description: 'Get personalized career advice right now',
    lightColor: 'bg-amber-50',
    darkColor: 'dark:bg-amber-950',
    iconColor: 'text-amber-700',
    badge: null,
  },
]

export default function DashboardHome() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [scans, setScans] = useState<ATSScan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [resumeRes, scanRes] = await Promise.all([
          api.get('/resumes'),
          api.get('/ats/history'),
        ])
        setResumes(Array.isArray(resumeRes.data) ? resumeRes.data : resumeRes.data?.resumes || [])
        setScans(Array.isArray(scanRes.data) ? scanRes.data : scanRes.data?.scans || [])
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const avgScore =
    scans.length > 0
      ? Math.round(scans.slice(0, 5).reduce((a, s) => a + s.score, 0) / Math.min(scans.length, 5))
      : null

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          {greeting()}, {user?.displayName?.split(' ')[0] || 'there'}.
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Here's your career dashboard overview.
        </p>
      </div>

      {/* Plan banner for free users */}
      {user?.plan === 'free' && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 dark:bg-brand-950 dark:border-brand-800">
          <div>
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-200">Upgrade to Pro</p>
            <p className="text-xs text-brand-700 dark:text-brand-400 mt-0.5">
              Get 20 ATS scans/day, detailed analytics, and full AI coaching context.
            </p>
          </div>
          <Link
            to="/dashboard/plans"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Upgrade <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="mb-8">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Resumes"
              value={resumes.length}
              sub={`of ${user?.plan === 'pro' ? '∞' : '2'} allowed`}
              icon={FileText}
              color="bg-brand-50 dark:bg-brand-950 text-brand-700"
            />
            <StatCard
              label="ATS Scans"
              value={user?.scan_count || 0}
              sub="total scans done"
              icon={ScanText}
              color="bg-accent-50 dark:bg-violet-950 text-accent-600"
            />
            <StatCard
              label="Avg ATS Score"
              value={avgScore !== null ? `${avgScore}` : '—'}
              sub={avgScore !== null ? 'last 5 scans' : 'no scans yet'}
              icon={TrendingUp}
              color="bg-green-50 dark:bg-green-950 text-green-700"
            />
            <StatCard
              label="Plan"
              value={user?.plan === 'pro' ? 'Pro' : 'Free'}
              sub={user?.plan_type || 'upgrade for more'}
              icon={CheckCircle2}
              color={user?.plan === 'pro' ? 'bg-brand-50 dark:bg-brand-950 text-brand-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}
            />
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3">Quick actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map(({ to, icon: Icon, title, description, lightColor, darkColor, iconColor, badge }) => (
                <Link key={to} to={to}>
                  <Card hover className="p-4 h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${lightColor} ${darkColor} flex items-center justify-center`}>
                        <Icon size={18} className={iconColor} />
                      </div>
                      {badge && (
                        <Badge variant="brand" size="sm">{badge}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent resumes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Recent resumes</h2>
                <Link to="/dashboard/resumes" className="text-xs text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">
                  View all
                </Link>
              </div>
              <Card>
                {resumes.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No resumes yet</p>
                    <Link to="/dashboard/resumes/new">
                      <button className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">
                        Create your first resume
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {resumes.slice(0, 4).map((r) => (
                      <Link key={r.id} to={`/dashboard/resumes/${r.id}/edit`}>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={15} className="text-brand-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {new Date(r.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                          {r.score !== undefined && (
                            <span className={`text-xs font-bold ${r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                              {r.score}
                            </span>
                          )}
                          <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Recent scans */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Recent ATS scans</h2>
                <Link to="/dashboard/ats" className="text-xs text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">
                  New scan
                </Link>
              </div>
              <Card>
                {scans.length === 0 ? (
                  <div className="p-8 text-center">
                    <ScanText size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No scans yet</p>
                    <Link to="/dashboard/ats">
                      <button className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">
                        Scan your resume
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {scans.slice(0, 4).map((scan) => (
                      <div key={scan.id} className="flex items-center gap-3 px-4 py-3">
                        <ScoreRing score={scan.score} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {scan.fileName || 'Resume scan'}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          {scan.missingKeywords.length > 0 && (
                            <p className="text-xs text-red-500">
                              {scan.missingKeywords.length} missing
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
