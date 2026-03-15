import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, guestLogin, devLogin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [devLoading, setDevLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-700 flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">JobEasy</span>
        </Link>

        <div>
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed mb-6">
            "My ATS score went from 42 to 87 in one session. Got 3 interview calls the same week."
          </blockquote>
          <div>
            <p className="text-white font-semibold text-sm">Priya Sharma</p>
            <p className="text-brand-200 text-sm">Software Engineer, Flipkart</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '10k+', label: 'Resumes optimized' },
            { value: '3.2x', label: 'More interviews' },
            { value: '87%', label: 'Avg ATS score' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-white text-2xl font-bold">{value}</p>
              <p className="text-brand-200 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 lg:hidden mb-6">
              <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-50">JobEasy</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-5 bg-white dark:bg-slate-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" />
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              icon={<Mail size={15} />}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-colors duration-150"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-700 dark:text-brand-400 font-medium hover:underline">
              Sign up free
            </Link>
          </p>

          {/* Guest login */}
          <button
            onClick={async () => {
              setGuestLoading(true)
              setError('')
              try {
                await guestLogin()
                navigate('/dashboard')
              } catch {
                setError('Guest login failed. Please try again.')
              } finally {
                setGuestLoading(false)
              }
            }}
            disabled={guestLoading}
            className="w-full mt-3 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-50 bg-white dark:bg-slate-800"
          >
            {guestLoading ? 'Entering...' : 'Continue as Guest'}
          </button>

          {/* Dev login — only works when backend has DEV_MODE=1 */}
          <button
            onClick={async () => {
              setDevLoading(true)
              setError('')
              try {
                await devLogin()
                navigate('/dashboard')
              } catch {
                setError('Dev login failed — is the backend running with DEV_MODE=1?')
              } finally {
                setDevLoading(false)
              }
            }}
            disabled={devLoading}
            className="w-full mt-3 border border-dashed border-amber-400 dark:border-amber-600 rounded-lg py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            {devLoading ? 'Logging in...' : 'Dev Login (skip Firebase)'}
          </button>
        </div>
      </div>
    </div>
  )
}
