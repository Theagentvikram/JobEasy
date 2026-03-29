import { useState } from 'react'
import { CheckCircle2, Zap, Tag } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Card, Badge } from '../components/ui'
import { cn } from '../components/ui'

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void }
  }
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'weekly',
    name: 'Starter',
    price: { inr: 199, label: '₹199' },
    period: '7 days',
    description: 'Try Pro risk-free for a week',
    features: [
      '10 resume uploads/week',
      '20 ATS scans per day',
      'Detailed section scores',
      'Hard & soft skill analysis',
      'Full AI assistant',
      'Scan history',
    ],
    highlight: false,
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: { inr: 499, label: '₹499' },
    period: 'per month',
    description: 'Most popular for active job seekers',
    features: [
      'Everything in Starter',
      'Cancel anytime',
      'Priority support',
      'Full career desk',
      'Job tracker unlimited',
      'AI coach full context',
    ],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: 'Pro Quarterly',
    price: { inr: 999, label: '₹999' },
    period: '3 months',
    description: 'Best value for extended search',
    features: [
      'Everything in Monthly',
      'Save 33% vs monthly',
      'Quarterly billing',
      'All future features',
      'Export to PDF unlimited',
      'Multi-device access',
    ],
    highlight: false,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: { inr: 2999, label: '₹2,999' },
    period: 'one time',
    description: 'Pay once, use forever',
    features: [
      'Everything in Pro',
      'Lifetime access',
      'All future updates',
      'Priority email support',
      'Early access to new features',
      'Use coupon BOSS45 for 45% off',
    ],
    highlight: false,
    badge: 'Best deal',
  },
]

// ─── Coupon bar ───────────────────────────────────────────────────────────────

function CouponBar({ onApply }: { onApply: (code: string, discount: number) => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const apply = async () => {
    if (!code.trim()) return
    setLoading(true)
    setMsg('')
    try {
      // BOSS45 is a free Pro lifetime code — use redeem endpoint
      if (code.trim().toUpperCase() === 'BOSS45') {
        await api.post('/auth/redeem-coupon', { coupon_code: 'BOSS45' })
        setMsg('🎉 Pro plan activated! Refresh the page.')
        setSuccess(true)
        onApply(code.trim(), 100)
        return
      }
      const res = await api.post('/payment/validate-coupon', { coupon_code: code.trim() })
      const discount = res.data.discount || 0
      onApply(code.trim(), discount)
      setMsg(`Coupon applied! ${discount}% off`)
      setSuccess(true)
    } catch {
      setMsg('Invalid or expired coupon code.')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mb-8">
      <div className="flex gap-2">
        <Input
          placeholder="Have a coupon? e.g. BOSS45, GETJOB"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          icon={<Tag size={14} />}
        />
        <Button variant="secondary" onClick={apply} loading={loading}>Apply</Button>
      </div>
      {msg && (
        <p className={cn('text-xs mt-1.5', success ? 'text-green-600' : 'text-red-600')}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  couponDiscount,
  currentPlan,
  onUpgrade,
  upgrading,
}: {
  plan: (typeof PLANS)[0]
  couponDiscount: number
  currentPlan: string | undefined
  onUpgrade: (planId: string) => void
  upgrading: string | null
}) {
  const isCurrentPlan = currentPlan === plan.id
  const discountedPrice = couponDiscount > 0
    ? Math.round(plan.price.inr * (1 - couponDiscount / 100))
    : plan.price.inr

  return (
    <div
      className={cn(
        'border rounded-2xl p-6 flex flex-col relative',
        plan.highlight
          ? 'border-brand-700 shadow-lg shadow-brand-100 dark:shadow-brand-900/30'
          : 'border-slate-200 dark:border-dark-border-subtle bg-white dark:bg-dark-card'
      )}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-brand-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}
      {plan.badge && (
        <Badge variant="success" className="absolute top-4 right-4">{plan.badge}</Badge>
      )}

      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{plan.name}</p>
        <div className="flex items-baseline gap-1.5">
          {couponDiscount > 0 ? (
            <>
              <span className="text-slate-400 dark:text-slate-500 line-through text-lg">₹{plan.price.inr}</span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">₹{discountedPrice}</span>
            </>
          ) : (
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{plan.price.label}</span>
          )}
          <span className="text-sm text-slate-400 dark:text-slate-500">/ {plan.period}</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={14} className="text-success-500 flex-shrink-0 mt-0.5" />
            <span className="text-slate-600 dark:text-slate-300">{f}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
          <CheckCircle2 size={15} />
          Current plan
        </div>
      ) : (
        <Button
          onClick={() => onUpgrade(plan.id)}
          loading={upgrading === plan.id}
          variant={plan.highlight ? 'primary' : 'outline'}
          className="w-full"
        >
          <Zap size={14} />
          {plan.id === 'lifetime' ? 'Get lifetime access' : `Upgrade to ${plan.name}`}
        </Button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { user, refreshUser } = useAuth()
  const [coupon, setCoupon] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId)
    try {
      const plan = PLANS.find((p) => p.id === planId)!
      const amount = Math.round(plan.price.inr * (1 - couponDiscount / 100)) * 100 // paise

      const orderRes = await api.post('/payment/create-order', {
        amount,
        plan: planId,
        coupon_code: coupon || undefined,
      })

      const { order_id, amount: orderAmount, currency } = orderRes.data

      // Load Razorpay script if needed
      if (!window.Razorpay) {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        document.body.appendChild(script)
        await new Promise<void>((resolve) => { script.onload = () => resolve() })
      }

      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: orderAmount,
        currency,
        order_id,
        name: 'JobEasy',
        description: `${plan.name} Plan`,
        theme: { color: '#0369A1' },
        handler: async (response: Record<string, string>) => {
          try {
            await api.post('/payment/verify', {
              ...response,
              plan: planId,
              coupon_code: coupon || undefined,
            })
            await refreshUser()
            setSuccessMsg(`You're now on the ${plan.name} plan!`)
            setTimeout(() => setSuccessMsg(''), 5000)
          } catch {
            alert('Payment verification failed. Please contact support.')
          }
        },
      })
      rzp.open()
    } catch {
      alert('Could not initiate payment. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Upgrade your plan</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          {user?.plan === 'pro'
            ? `You're on the ${user.plan_type} plan.${user.plan_expires_at ? ` Expires ${new Date(user.plan_expires_at).toLocaleDateString()}.` : ''}`
            : "You're on the free plan. Unlock full access to all features."}
        </p>
      </div>

      {successMsg && (
        <div className="max-w-md mx-auto mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400 text-center font-medium">
          {successMsg}
        </div>
      )}

      <CouponBar
        onApply={(code, discount) => {
          setCoupon(code)
          setCouponDiscount(discount)
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            couponDiscount={couponDiscount}
            currentPlan={user?.plan_type}
            onUpgrade={handleUpgrade}
            upgrading={upgrading}
          />
        ))}
      </div>

      {/* Public coupons hint */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Available coupons: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">GETJOB</span> (30% off) ·{' '}
          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">BOSS45</span> (45% off) ·{' '}
          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">TRIAL99</span> (₹99 weekly)
        </p>
      </div>
    </div>
  )
}
