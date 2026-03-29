import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  ScanText,
  BriefcaseBusiness,
  Bot,
  User,
  Rocket,
  Navigation,
  Zap,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../ui'

const nav: Array<{ to: string; icon: React.ElementType; label: string; exact?: boolean; beta?: boolean }> = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/dashboard/ats', icon: ScanText, label: 'ATS Scanner' },
  { to: '/dashboard/resumes', icon: FileText, label: 'My Resumes' },
  { to: '/dashboard/desk', icon: User, label: 'Career Desk' },
  { to: '/dashboard/tracker', icon: BriefcaseBusiness, label: 'Job Tracker' },
  { to: '/dashboard/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/dashboard/autopilot', icon: Navigation, label: 'Copilot' },
  { to: '/dashboard/autoapply', icon: Rocket, label: 'AutoApply', beta: true },
  { to: '/dashboard/command',   icon: Zap,        label: 'Ops Center', beta: true },
]

const bottomNav = [
  { to: '/dashboard/sheets', icon: FileSpreadsheet, label: 'Google Sheets' },
  { to: '/dashboard/plans', icon: CreditCard, label: 'Plans' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar_collapsed') === 'true'
  )

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-slate-100 flex-shrink-0 dark:bg-dark-surface dark:border-dark-border transition-all duration-200',
        collapsed ? 'w-14' : 'w-52 lg:w-56 xl:w-60 2xl:w-64'
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        'flex items-center border-b border-slate-100 dark:border-dark-border flex-shrink-0',
        collapsed ? 'justify-center py-4 px-2' : 'justify-between px-5 py-4'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight dark:text-slate-50">JobEasy</span>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-dark-hover cursor-pointer transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Plan badge */}
      {user && !collapsed && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-dark-border">
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              user.plan === 'pro'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                : 'bg-slate-100 text-slate-500 dark:bg-dark-card dark:text-slate-400'
            )}
          >
            {user.plan === 'pro' ? `Pro · ${user.plan_type}` : 'Free plan'}
          </span>
        </div>
      )}

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, exact, beta }) => {
          return (
          <NavLink
            key={to}
            to={to}
            end={exact}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-[13px] xl:text-sm font-medium transition-colors duration-150 cursor-pointer group',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2 xl:py-2.5',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-dark-hover dark:hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 flex items-center gap-2">
                      {label}
                      {beta && (
                        <span className="text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          BETA
                        </span>
                      )}
                    </span>
                    {isActive && <ChevronRight size={12} className="text-brand-400 dark:text-brand-500" />}
                  </>
                )}
              </>
            )}
          </NavLink>
        )})}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-slate-100 dark:border-dark-border px-2 py-3 space-y-0.5">
        {bottomNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-dark-hover dark:hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={cn(
                    isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Classic UI switcher */}
        {!collapsed && (
          <button
            onClick={() => {
              // Navigate to the root origin (classic UI is the root Vite app at /)
              // Use window.location.origin to avoid navigating inside the /new basename
              window.location.href = window.location.origin + '/'
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer transition-colors dark:text-slate-500 dark:hover:bg-dark-hover dark:hover:text-slate-300"
            title="Switch back to the classic UI"
          >
            <span className="text-base leading-none">←</span>
            <span>Classic UI</span>
          </button>
        )}

        {/* Dark mode toggle + user */}
        {user && (
          <div className={cn('mt-2 pt-2 border-t border-slate-100 dark:border-dark-border', collapsed && 'flex flex-col items-center gap-1')}>
            <button
              onClick={toggle}
              title={isDark ? 'Light mode' : 'Dark mode'}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors dark:text-slate-400 dark:hover:bg-dark-hover dark:hover:text-slate-100',
                collapsed ? 'justify-center p-2.5 w-full' : 'gap-3 px-3 py-2 w-full'
              )}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun size={16} className="text-amber-400 flex-shrink-0" />
              ) : (
                <Moon size={16} className="text-slate-400 flex-shrink-0" />
              )}
              {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
            </button>

            {collapsed ? (
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 w-full flex justify-center"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2 mt-1">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0 dark:bg-brand-900/40 dark:text-brand-300">
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate dark:text-slate-200">{user.displayName}</p>
                  <p className="text-xs text-slate-400 truncate dark:text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </aside>
  )
}
