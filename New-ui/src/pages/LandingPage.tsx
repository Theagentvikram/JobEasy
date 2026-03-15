import { Link } from 'react-router-dom'
import {
  ScanText,
  FileText,
  BriefcaseBusiness,
  Bot,
  User,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../components/ui'

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-50 text-base tracking-tight">JobEasy</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">How it works</a>
          <a href="#pricing" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Get started free</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-20 pb-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} />
          AI-powered career tools · Free to start
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-6">
          Get past the{' '}
          <span className="text-brand-700 dark:text-brand-400">ATS filter.</span>
          <br />
          Land more interviews.
        </h1>

        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          JobEasy analyzes your resume against job descriptions, scores ATS compatibility,
          builds optimized resumes, and tracks your entire job search — all from one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="shadow-lg shadow-brand-200 dark:shadow-brand-900/50">
              Start optimizing free
              <ArrowRight size={16} />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg">
              See how it works
            </Button>
          </a>
        </div>

        {/* Trust strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          {['No credit card required', 'Free ATS scan', '3 resume templates'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success-500" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Score dashboard mockup */}
      <div className="max-w-4xl mx-auto mt-16">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          {/* Browser bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
            <div className="ml-2 flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
              app.jobeasy.ai/dashboard/ats
            </div>
          </div>

          {/* Mock ATS result */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <svg width="96" height="96" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8" className="dark:stroke-slate-700" />
                <circle
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="238.76"
                  strokeDashoffset="50"
                  transform="rotate(-90 44 44)"
                />
                <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fill="#0369a1" fontSize="18" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">79</text>
              </svg>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">ATS Score</p>
            </div>

            {/* Keywords found */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Keywords detected</p>
              <div className="flex flex-wrap gap-1.5">
                {['React', 'TypeScript', 'Node.js', 'REST API', 'AWS', 'CI/CD'].map(k => (
                  <span key={k} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">{k}</span>
                ))}
              </div>
            </div>

            {/* Missing keywords */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Missing keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {['GraphQL', 'Docker', 'Kubernetes', 'Redis'].map(k => (
                  <span key={k} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{k}</span>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">3 improvements suggested</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────

const features = [
  {
    icon: ScanText,
    title: 'ATS Score & Gap Analysis',
    description:
      'Instantly score your resume against any job description. See exactly which keywords are missing, which sections need improvement, and get a detailed breakdown of hard and soft skills detected.',
    color: 'brand',
  },
  {
    icon: FileText,
    title: 'AI Resume Builder',
    description:
      'Build polished resumes with a live split-pane editor. AI generates bullet points and professional summaries for each role. Import from LinkedIn or PDF in one click.',
    color: 'accent',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Job Application Tracker',
    description:
      'Track every application from discovery to offer with a Kanban board. Monitor outreach, set follow-up reminders, and auto-move jobs to "Apply Today" when your waiting period ends.',
    color: 'brand',
  },
  {
    icon: User,
    title: 'Career Desk',
    description:
      'Maintain a master profile of your skills, experiences, and projects. Reuse it across multiple resumes without retyping. Centralise your entire professional identity.',
    color: 'accent',
  },
  {
    icon: Bot,
    title: 'AI Career Coach',
    description:
      'Chat with a Gemini-powered AI that knows your resume and career context. Get interview prep, negotiation tips, LinkedIn profile advice, and job-search strategy.',
    color: 'brand',
  },
  {
    icon: TrendingUp,
    title: 'Scan History & Insights',
    description:
      'Every ATS scan is saved to your history. Track your score improvements over time, compare across job roles, and see patterns in what top employers look for.',
    color: 'accent',
  },
]

function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-brand-700 dark:text-brand-400 text-sm font-semibold mb-2">Everything you need</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Your complete career operating system
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            From resume optimization to application tracking — every tool a modern job seeker needs, integrated seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-default"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  color === 'brand' ? 'bg-brand-50 dark:bg-brand-950' : 'bg-accent-50 dark:bg-violet-950'
                }`}
              >
                <Icon size={20} className={color === 'brand' ? 'text-brand-700 dark:text-brand-400' : 'text-accent-600 dark:text-violet-400'} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ────────────────────────────────────────────────────────────

const steps = [
  {
    step: '01',
    title: 'Upload your resume',
    description: 'Upload a PDF or DOCX, or import directly from your LinkedIn profile URL. Our AI parses and structures it instantly.',
  },
  {
    step: '02',
    title: 'Paste the job description',
    description: 'Copy any job posting — from LinkedIn, Indeed, or anywhere else — and paste it. JobEasy extracts key requirements automatically.',
  },
  {
    step: '03',
    title: 'Get your ATS score',
    description: 'Receive a 0–100 score with a full breakdown: missing keywords, formatting issues, section scores, and actionable improvements.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-brand-700 dark:text-brand-400 text-sm font-semibold mb-2">Simple process</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            From upload to insights in seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ step, title, description }, i) => (
            <div key={step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-full w-full h-px bg-slate-200 dark:bg-slate-700 -translate-x-8 z-0" />
              )}
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white font-bold text-sm flex items-center justify-center mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Get started with core tools',
    features: [
      '2 resumes',
      '1 ATS scan per day',
      'All resume templates',
      'Career Desk',
      'Job tracker',
      'AI assistant (limited)',
    ],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Pro Monthly',
    price: '₹499',
    period: 'per month',
    description: 'For serious job seekers',
    features: [
      '10 resume uploads/week',
      '20 ATS scans per day',
      'Detailed section scores',
      'Hard & soft skill analysis',
      'Full AI assistant context',
      'Scan history & insights',
    ],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    name: 'Lifetime',
    price: '₹2,999',
    period: 'one time',
    description: 'Best value, forever',
    features: [
      'Everything in Pro',
      'Lifetime access',
      'All future features',
      'Priority support',
      'Use coupon BOSS45',
      '45% off available',
    ],
    cta: 'Get lifetime access',
    highlight: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-20 px-6 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-brand-700 dark:text-brand-400 text-sm font-semibold mb-2">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map(({ name, price, period, description, features, cta, highlight }) => (
            <div
              key={name}
              className={`rounded-xl border p-6 ${
                highlight
                  ? 'border-brand-700 bg-brand-700 text-white shadow-lg shadow-brand-200 dark:shadow-brand-900/50'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="mb-5">
                <p className={`text-xs font-semibold mb-1 ${highlight ? 'text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  {name}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-extrabold ${highlight ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
                    {price}
                  </span>
                  <span className={`text-sm ${highlight ? 'text-brand-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    / {period}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${highlight ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {description}
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      size={14}
                      className={highlight ? 'text-brand-200 flex-shrink-0' : 'text-success-500 flex-shrink-0'}
                    />
                    <span className={highlight ? 'text-brand-50' : 'text-slate-600 dark:text-slate-300'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link to="/login">
                <button
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                    highlight
                      ? 'bg-white text-brand-700 hover:bg-brand-50'
                      : 'bg-brand-700 text-white hover:bg-brand-800'
                  }`}
                >
                  {cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Software Engineer at Flipkart',
    text: 'Got 3 interview calls in the same week after using JobEasy to optimize my resume. The ATS score went from 42 to 87.',
  },
  {
    name: 'Rahul Mehta',
    role: 'Product Manager at Razorpay',
    text: 'The job tracker with Kanban view is incredible. I finally have visibility into my entire pipeline without using spreadsheets.',
  },
  {
    name: 'Anjali Patel',
    role: 'Data Scientist at PhonePe',
    text: 'The AI coach helped me prep for interviews and negotiate a 30% higher salary. Worth every rupee of the lifetime plan.',
  },
]

function Testimonials() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Real results, real people
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map(({ name, role, text }) => (
            <div key={name} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">"{text}"</p>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto text-center bg-brand-700 rounded-2xl py-14 px-8 shadow-lg shadow-brand-200 dark:shadow-brand-900/50">
        <ShieldCheck size={36} className="text-brand-200 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-3">
          Start your job search the smart way
        </h2>
        <p className="text-brand-100 mb-8 max-w-lg mx-auto">
          Join thousands of job seekers who've improved their ATS scores and landed interviews faster with JobEasy.
        </p>
        <Link to="/login">
          <button className="inline-flex items-center gap-2 bg-white text-brand-700 px-7 py-3 rounded-lg font-semibold text-sm hover:bg-brand-50 transition-colors cursor-pointer">
            Get started for free
            <ChevronRight size={16} />
          </button>
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-slate-100 dark:border-slate-800 py-8 px-6 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-700 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-50 text-sm">JobEasy</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} JobEasy. All rights reserved.
        </p>
        <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  )
}
