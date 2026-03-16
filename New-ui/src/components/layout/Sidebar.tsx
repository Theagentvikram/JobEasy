import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ScanText,
  BriefcaseBusiness,
  Bot,
  User,
  Rocket,
  Navigation,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../ui'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/dashboard/ats', icon: ScanText, label: 'ATS Scanner' },
  { to: '/dashboard/resumes', icon: FileText, label: 'My Resumes' },
  { to: '/dashboard/desk', icon: User, label: 'Career Desk' },
  { to: '/dashboard/tracker', icon: BriefcaseBusiness, label: 'Job Tracker' },
  { to: '/dashboard/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/dashboard/autopilot', icon: Navigation, label: 'Auto Pilot' },
  { to: '/dashboard/autoapply', icon: Rocket, label: 'AutoApply' },
]

const bottomNav = [
  { to: '/dashboard/plans', icon: CreditCard, label: 'Plans' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside className="flex flex-col h-screen w-56 bg-white border-r border-slate-100 flex-shrink-0 dark:bg-slate-900 dark:border-slate-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight dark:text-slate-50">JobEasy</span>
        </div>
      </div>

      {/* Plan badge */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              user.plan === 'pro'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {user.plan === 'pro' ? `Pro · ${user.plan_type}` : 'Free plan'}
          </span>
        </div>
      )}

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer group',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-brand-400 dark:text-brand-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3 space-y-0.5">
        {bottomNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* UI Switcher */}
        <button
          onClick={() => {
            localStorage.setItem('jobeasy_ui', 'classic');
            window.location.href = '/';
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer transition-colors dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          title="Switch back to the classic UI"
        >
          <span className="text-base leading-none">←</span>
          <span>Classic UI</span>
        </button>

        {/* Dark mode toggle + User avatar + logout */}
        {user && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun size={16} className="text-amber-400 flex-shrink-0" />
              ) : (
                <Moon size={16} className="text-slate-400 flex-shrink-0" />
              )}
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>

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
          </div>
        )}
      </div>
    </aside>
  )
}
