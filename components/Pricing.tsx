import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Globe } from 'lucide-react';

// Country-specific pricing (mirrors dashboard Plans.tsx)
interface RegionPricing {
  symbol: string;
  weekly: number;
  monthly: number;
  quarterly: number;
  lifetime: number;
  region: string;
}

const PRICING: Record<string, RegionPricing> = {
  IN: { symbol: '₹', weekly: 99, monthly: 299, quarterly: 499, lifetime: 2499, region: 'India' },
  US: { symbol: '$', weekly: 9, monthly: 19, quarterly: 39, lifetime: 99, region: 'US & Global' },
  GB: { symbol: '$', weekly: 9, monthly: 19, quarterly: 39, lifetime: 99, region: 'US & Global' },
  DEFAULT: { symbol: '$', weekly: 9, monthly: 19, quarterly: 39, lifetime: 99, region: 'US & Global' },
};

function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/London')) return 'GB';
  } catch { }
  return 'DEFAULT';
}

export const Pricing: React.FC = () => {
  const [region, setRegion] = useState<string>('DEFAULT');
  const pricing = PRICING[region] || PRICING.DEFAULT;

  useEffect(() => {
    setRegion(detectCountry());
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="pricing" className="py-24 bg-white/40 dark:bg-[#020c07]/80 border-y border-white/50 dark:border-emerald-900/20 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Pick a pass that matches your job search timeline.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Globe size={14} />
            <span>Prices for {pricing.region}</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">7-Day Money-Back Guarantee</span>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">Coupons Live: BOSS45 / GETJOB / JOBEASY45</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-7xl mx-auto">
          {/* Free */}
          <div className="p-8 bg-white/70 dark:bg-emerald-950/50 rounded-3xl border border-gray-100 dark:border-emerald-500/10 shadow-sm flex flex-col hover:border-gray-200 dark:hover:border-emerald-500/20 transition-colors">
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
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-emerald-800 text-gray-900 dark:text-white font-semibold hover:border-gray-900 dark:hover:border-emerald-500 transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Weekly */}
          <div className="p-8 bg-white/90 dark:bg-slate-950/60 rounded-3xl border border-blue-100 dark:border-blue-500/20 shadow-sm flex flex-col hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Pass</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.weekly}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/week</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">For urgent applications.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Zap size={18} className="text-blue-500 shrink-0" /> Unlimited AI Scans (up to 20/day)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-blue-500 shrink-0" /> Resume Uploads (up to 10/week)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-blue-500 shrink-0" /> Detailed ATS Reports</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
            >
              Get Weekly Pass — {pricing.symbol}{pricing.weekly}/week
            </button>
          </div>

          {/* Monthly */}
          <div className="p-8 bg-white/95 dark:bg-slate-950/60 rounded-3xl border border-cyan-100 dark:border-cyan-500/20 shadow-sm flex flex-col hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.monthly}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Smart alternative to $29/mo tools.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Zap size={18} className="text-cyan-500 shrink-0" /> Unlimited AI Scans (up to 20/day)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-cyan-500 shrink-0" /> Resume Uploads (up to 10/week)</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-cyan-500 shrink-0" /> Detailed ATS Reports</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/20"
            >
              Get Monthly — {pricing.symbol}{pricing.monthly}/mo
            </button>
          </div>

          {/* Quarterly */}
          <div className="p-8 bg-gray-900 dark:bg-emerald-950 rounded-3xl shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4 border-2 border-emerald-500">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">MOST POPULAR</div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Quarterly Pass</h3>
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
              Get Quarterly Pass — {pricing.symbol}{pricing.quarterly}/3m
            </button>
          </div>

          {/* Lifetime */}
          <div className="p-8 bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-950/20 dark:to-emerald-950/50 rounded-3xl border border-amber-200/50 dark:border-amber-500/15 shadow-sm flex flex-col hover:border-amber-300 dark:hover:border-amber-500/30 transition-colors relative">
            <div className="absolute top-4 right-4">
              <Crown size={20} className="text-amber-500" />
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lifetime Access</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{pricing.symbol}{pricing.lifetime}</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">one-time</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">High-anchor option for power users.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-amber-500 shrink-0" /> Everything in Quarterly Pass</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-amber-500 shrink-0" /> No recurring charges</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-amber-500 shrink-0" /> All future updates</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Crown size={18} className="text-amber-500 shrink-0" /> Priority Support</li>
            </ul>
            <button
              onClick={scrollToTop}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-200 dark:shadow-amber-900/20"
            >
              Get Lifetime Access — {pricing.symbol}{pricing.lifetime}
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-10 p-4 rounded-2xl bg-gray-50 dark:bg-emerald-950/30 border border-gray-200 dark:border-emerald-500/10">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Comparison Snapshot</p>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>Rezi (~$29/mo)</p>
            <p>Resume.io (~$24.95/mo)</p>
            <p>JobEasy ({pricing.symbol}{pricing.monthly}/mo)</p>
          </div>
        </div>
      </div>
    </section>
  );
};
