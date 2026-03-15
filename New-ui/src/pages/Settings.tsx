import { useEffect, useState } from 'react'
import { User, Bell, Link, ShieldAlert, Save, Sun, Moon } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Button, Input, Card, Badge } from '../components/ui'
import { cn } from '../components/ui'

function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-brand-700" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${
          checked ? 'bg-brand-700' : 'bg-slate-200 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const [settings, setSettings] = useState({ jobspy_enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDowngrade, setShowDowngrade] = useState(false)
  const [downgrading, setDowngrading] = useState(false)

  useEffect(() => {
    api.get('/auth/settings').then((res) => {
      if (res.data) setSettings(res.data)
    }).finally(() => setLoading(false))
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put('/auth/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleDowngrade = async () => {
    setDowngrading(true)
    try {
      await api.post('/auth/downgrade')
      alert('Plan downgraded to free.')
      setShowDowngrade(false)
    } finally {
      setDowngrading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="success">Saved</Badge>}
          <Button onClick={saveSettings} loading={saving}>
            <Save size={14} /> Save changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950 rounded-lg flex items-center justify-center flex-shrink-0">
              {isDark ? <Moon size={15} className="text-brand-700" /> : <Sun size={15} className="text-brand-700" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose your preferred color theme</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => isDark && toggle()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer',
                !isDark
                  ? 'border-brand-700 bg-brand-50 dark:bg-brand-950/50 text-brand-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <Sun size={16} /> Light
            </button>
            <button
              onClick={() => !isDark && toggle()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer',
                isDark
                  ? 'border-brand-700 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </Card>

        {/* Profile */}
        <SectionCard icon={User} title="Account" description="Your Firebase account details">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xl font-bold text-brand-700 dark:text-brand-300">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant={user?.plan === 'pro' ? 'brand' : 'default'}>
                  {user?.plan === 'pro' ? `Pro · ${user.plan_type}` : 'Free plan'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Display name" value={user?.displayName || ''} disabled className="opacity-60" />
            <Input label="Email" value={user?.email || ''} disabled className="opacity-60" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Profile details are managed through Firebase Authentication.
          </p>
        </SectionCard>

        {/* Integrations */}
        <SectionCard icon={Link} title="Integrations" description="Connect external tools to enhance your experience">
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Loading…</div>
          ) : (
            <div className="space-y-1 divide-y divide-slate-50 dark:divide-slate-700">
              <Toggle
                label="JobSpy integration"
                description="Enable job scraping from LinkedIn, Indeed, and Glassdoor"
                checked={settings.jobspy_enabled}
                onChange={(v) => setSettings((s) => ({ ...s, jobspy_enabled: v }))}
              />
            </div>
          )}
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications" description="Control when and how JobEasy contacts you">
          <div className="space-y-1 divide-y divide-slate-50 dark:divide-slate-700">
            <Toggle
              label="Job application reminders"
              description="Get reminders when a job in your tracker reaches 'Apply today'"
              checked={true}
              onChange={() => {}}
            />
            <Toggle
              label="Weekly summary email"
              description="Receive a weekly digest of your job search progress"
              checked={false}
              onChange={() => {}}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Full notification settings coming soon.
          </p>
        </SectionCard>

        {/* Account management */}
        <SectionCard icon={ShieldAlert} title="Account management">
          <div className="space-y-3">
            {user?.plan === 'pro' && (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Downgrade to free</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your plan remains active until its expiry date</p>
                </div>
                {showDowngrade ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDowngrade(false)}>Cancel</Button>
                    <Button variant="danger" size="sm" onClick={handleDowngrade} loading={downgrading}>
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowDowngrade(true)}>
                    Downgrade
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-transparent dark:border-red-900/30">
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Sign out</p>
                <p className="text-xs text-red-600 dark:text-red-400">Sign out of all devices</p>
              </div>
              <Button variant="danger" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
