import React from 'react';
import { Check } from 'lucide-react';

export const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-24 bg-white/40 border-y border-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500">Invest in your career for less than the cost of a coffee.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="p-8 bg-white/70 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900">$0</span>
                <span className="ml-1 text-sm font-semibold text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">For casual job seekers.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> 1 AI Resume Scan per day</li>
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> Basic Grammar Check</li>
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> Export to PDF</li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-900 font-semibold hover:border-gray-900 transition-colors">Get Started</button>
          </div>

          {/* Pro */}
          <div className="p-8 bg-gray-900 rounded-3xl shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
             <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Pro</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-white">$12</span>
                <span className="ml-1 text-sm font-semibold text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">For serious career moves.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400" /> Unlimited AI Scans</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400" /> Smart Bullet Point Writer</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400" /> Section-wise Suggestions</li>
              <li className="flex gap-3 text-sm text-gray-300"><Check size={18} className="text-emerald-400" /> Job Description Matching</li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20">Upgrade to Pro</button>
          </div>

          {/* Ultimate */}
          <div className="p-8 bg-white/70 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Ultimate</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900">$29</span>
                <span className="ml-1 text-sm font-semibold text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">For power users & coaches.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> Everything in Pro</li>
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> LinkedIn Profile Optimization</li>
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> Cover Letter Generator</li>
              <li className="flex gap-3 text-sm text-gray-600"><Check size={18} className="text-emerald-500" /> Priority Support</li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-900 font-semibold hover:border-gray-900 transition-colors">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
};