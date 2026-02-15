import React, { useState } from 'react';
import { Check, Zap, Crown, Globe } from 'lucide-react';

// Country-specific pricing (mirrors dashboard Plans.tsx)
interface RegionPricing {
  symbol: string;
  weekly: number;
  monthly: number;
  quarterly: number;
  lifetime: number;
  weeklyBase?: number;
  monthlyBase?: number;
  quarterlyBase?: number;
  lifetimeBase?: number;
  region: string;
}

const PRICING: Record<'IN' | 'US', RegionPricing> = {
  IN: {
    symbol: '₹',
    weekly: 99,
    monthly: 499,
    quarterly: 999,
    lifetime: 2499,
    weeklyBase: 299,
    monthlyBase: 999,
    quarterlyBase: 1999,
    lifetimeBase: 4999,
    region: 'India',
  },
  US: {
    symbol: '$',
    weekly: 9,
    monthly: 19,
    quarterly: 39,
    lifetime: 99,
    region: 'US & Global',
  },
};

export const Pricing: React.FC = () => {
  const [region, setRegion] = useState<'IN' | 'US'>('US');
  const pricing = PRICING[region];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-slate-50/90 via-white/85 to-emerald-50/70 dark:from-[#02150d]/90 dark:via-[#031e13]/80 dark:to-[#04160f]/90 border-y border-emerald-100/70 dark:border-emerald-900/30 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Pick a pass that matches your job search timeline.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Globe size={14} />
            <span>Prices for {pricing.region}</span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-xl border border-emerald-200/80 dark:border-emerald-700/40 bg-white/80 dark:bg-emerald-950/50 p-1">
            <button
              onClick={() => setRegion('US')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${region === 'US'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                }`}
            >
              US Market
            </button>
            <button
              onClick={() => setRegion('IN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${region === 'IN'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                }`}
            >
              India
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">7-Day Money-Back Guarantee</span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">Have a coupon? Apply at checkout</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-7xl mx-auto">
          {/* Free */}
          <div className="p-8 bg-gradient-to-b from-white via-white to-slate-50/70 dark:from-emerald-950/55 dark:to-emerald-950/35 rounded-3xl border border-slate-200/80 dark:border-emerald-500/15 shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-emerald-500/25 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Free</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}0</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/forever</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">For casual job seekers.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> 1 AI Resume Scan / day</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> 2 Resume Uploads</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Basic PDF Export</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
            >
              Get Started
            </button>
          </div>

          {/* Weekly */}
          <div className="p-8 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/40 dark:from-emerald-950/75 dark:to-emerald-900/30 rounded-3xl border border-emerald-200/80 dark:border-emerald-500/25 shadow-sm flex flex-col hover:border-emerald-300 dark:hover:border-emerald-400/40 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Pass</h3>
              {pricing.weeklyBase && pricing.weeklyBase > pricing.weekly && (
                <p className="mt-3 text-sm font-semibold text-gray-400 line-through">{pricing.symbol}{pricing.weeklyBase}</p>
              )}
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.weekly}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/week</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">For urgent applications.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Zap size={18} className="text-emerald-500 shrink-0" /> Unlimited AI Scans (up to 20/day)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Resume Uploads (up to 10/week)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Detailed ATS Reports</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
            >
              Upgrade
            </button>
          </div>

          {/* Monthly */}
          <div className="p-8 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/40 dark:from-emerald-950/75 dark:to-emerald-900/30 rounded-3xl border border-emerald-200/80 dark:border-emerald-500/25 shadow-sm flex flex-col hover:border-emerald-300 dark:hover:border-emerald-400/40 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly</h3>
              {pricing.monthlyBase && pricing.monthlyBase > pricing.monthly && (
                <p className="mt-3 text-sm font-semibold text-gray-400 line-through">{pricing.symbol}{pricing.monthlyBase}</p>
              )}
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.monthly}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Great for steady applications.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Zap size={18} className="text-emerald-500 shrink-0" /> Unlimited AI Scans (up to 20/day)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Resume Uploads (up to 10/week)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Detailed ATS Reports</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
            >
              Upgrade
            </button>
          </div>

          {/* Quarterly */}
          <div className="p-8 bg-gradient-to-b from-[#0a2034] via-[#0b1b2f] to-[#0a1322] dark:from-emerald-950 dark:via-emerald-900 dark:to-[#0a1322] rounded-3xl shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4 border-2 border-emerald-500">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">MOST POPULAR</div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Quarterly Pass</h3>
              {pricing.quarterlyBase && pricing.quarterlyBase > pricing.quarterly && (
                <p className="mt-3 text-sm font-semibold text-emerald-200/60 line-through">{pricing.symbol}{pricing.quarterlyBase}</p>
              )}
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-white">{pricing.symbol}{pricing.quarterly}</span>
                <span className="ml-1 text-sm font-semibold text-gray-400">/3 months</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">Best for job search season.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-300"><Zap size={18} className="text-emerald-400 shrink-0" /> Unlimited AI Scans (up to 20/day)</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400 shrink-0" /> Resume Uploads (up to 10/week)</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400 shrink-0" /> Detailed ATS Reports</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400 shrink-0" /> AI Career Assistant</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400 shrink-0" /> All Premium Templates</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20"
            >
              Upgrade
            </button>
          </div>

          {/* Lifetime */}
          <div className="p-8 bg-gradient-to-b from-emerald-50/95 via-white to-emerald-50/55 dark:from-emerald-950/25 dark:to-emerald-950/55 rounded-3xl border border-emerald-200/70 dark:border-emerald-500/20 shadow-sm flex flex-col hover:border-emerald-300 dark:hover:border-emerald-500/35 transition-colors relative">
            <div className="absolute top-4 right-4">
              <Crown size={20} className="text-emerald-500" />
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lifetime Access</h3>
              {pricing.lifetimeBase && pricing.lifetimeBase > pricing.lifetime && (
                <p className="mt-3 text-sm font-semibold text-gray-400 line-through">{pricing.symbol}{pricing.lifetimeBase}</p>
              )}
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.lifetime}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">one-time</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">High-anchor option for power users.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> Everything in Quarterly Pass</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> No recurring charges</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500 shrink-0" /> All future updates</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Crown size={18} className="text-emerald-500 shrink-0" /> Priority Support</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
            >
              Upgrade
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
