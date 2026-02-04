import React, { useState } from 'react';
import { Check, Star, Zap } from 'lucide-react';

export const Plans: React.FC = () => {
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div className="min-h-screen bg-white p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto text-center mb-12">
                <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-4">
                    Pricing Plans
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                    Invest in your career
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                    Choose the plan that fits your job search needs. Cancel anytime.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center bg-gray-100 p-1 rounded-full relative mb-12">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billing === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Yearly <span className="text-emerald-500 text-[10px] ml-1">-20%</span>
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-4">
                {/* Free Plan */}
                <div className="p-8 rounded-3xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Free Starter</h3>
                    <p className="text-gray-500 text-sm mb-6">For casual job seekers.</p>
                    <div className="text-4xl font-extrabold text-gray-900 mb-8">$0<span className="text-lg text-gray-400 font-medium">/mo</span></div>

                    <button className="w-full py-3 rounded-xl bg-gray-50 text-gray-900 font-bold hover:bg-gray-100 transition-colors mb-8">
                        Current Plan
                    </button>

                    <ul className="space-y-4 text-left">
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> 1 AI Resume Scan / day
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> Basic PDF Export
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> 1 Resume Template
                        </li>
                    </ul>
                </div>

                {/* Pro Plan */}
                <div className="p-8 rounded-3xl border-2 border-emerald-500 bg-gray-900 text-white relative transform md:-translate-y-4 shadow-2xl shadow-emerald-500/20">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                        Most Popular
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Pro Job Seeker</h3>
                    <p className="text-emerald-200/80 text-sm mb-6">For serious applicants.</p>
                    <div className="text-4xl font-extrabold text-white mb-8">
                        {billing === 'monthly' ? '$19' : '$15'}
                        <span className="text-lg text-emerald-200/50 font-medium">/mo</span>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors mb-8 shadow-lg shadow-emerald-900/50">
                        Upgrade Now
                    </button>

                    <ul className="space-y-4 text-left">
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-1 bg-emerald-500/20 rounded-full"><Zap size={14} className="text-emerald-400" /></div>
                            Unlimited AI Scans
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-1 bg-emerald-500/20 rounded-full"><Check size={14} className="text-emerald-400" /></div>
                            All Premium Templates
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-1 bg-emerald-500/20 rounded-full"><Check size={14} className="text-emerald-400" /></div>
                            Detailed ATS Report
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-1 bg-emerald-500/20 rounded-full"><Star size={14} className="text-emerald-400" /></div>
                            AI Career Assistant Chat
                        </li>
                    </ul>
                </div>

                {/* Enterprise Plan */}
                <div className="p-8 rounded-3xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Lifetime Access</h3>
                    <p className="text-gray-500 text-sm mb-6">One-time payment.</p>
                    <div className="text-4xl font-extrabold text-gray-900 mb-8">$199</div>

                    <button className="w-full py-3 rounded-xl bg-white border-2 border-gray-900 text-gray-900 font-bold hover:bg-gray-50 transition-colors mb-8">
                        Get Lifetime
                    </button>

                    <ul className="space-y-4 text-left">
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> Everything in Pro
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> Priority Support
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <Check size={18} className="text-emerald-500" /> Early Access to Features
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
