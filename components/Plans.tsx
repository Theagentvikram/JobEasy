import React, { useState } from 'react';
import { Check, Star, Zap } from 'lucide-react';

interface PlansProps {
    isPro?: boolean;
    onUpgradeSuccess?: () => void;
}

export const Plans: React.FC<PlansProps> = ({ isPro = false, onUpgradeSuccess }) => {
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
    const [couponCode, setCouponCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Lazy import api to avoid circular dependencies if any, or just use standard import if it works
    // But better to just use api from services/api
    const handleRedeem = async () => {
        if (!couponCode.trim()) return;
        setIsRedeeming(true);
        try {
            const { default: api } = await import('../services/api');
            const response = await api.post('/auth/redeem-coupon', { code: couponCode });
            setShowSuccessModal(true);
            setCouponCode('');
            // Notify parent to refresh user profile
            if (onUpgradeSuccess) {
                onUpgradeSuccess();
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || "Invalid coupon code");
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleDowngrade = async () => {
        if (!confirm("Are you sure you want to downgrade to the Free plan?")) return;

        try {
            const { default: api } = await import('../services/api');
            await api.post('/auth/downgrade');
            alert("Plan downgraded to Free.");
            if (onUpgradeSuccess) onUpgradeSuccess();
        } catch (error) {
            console.error("Downgrade failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 p-8 overflow-y-auto transition-colors duration-300">
            <div className="max-w-7xl mx-auto text-center mb-12">
                <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                    Pricing Plans
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
                    Invest in your career
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
                    Choose the plan that fits your job search needs. Cancel anytime.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center bg-gray-100 dark:bg-slate-900 p-1 rounded-full relative mb-12">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billing === 'yearly' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Yearly <span className="text-emerald-500 dark:text-emerald-400 text-[10px] ml-1">-20%</span>
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-4">
                {/* Free Plan */}
                <div className="p-8 rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Free Starter</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">For casual job seekers.</p>
                    <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">$0<span className="text-lg text-gray-400 font-medium">/mo</span></div>

                    <button
                        disabled={!isPro}
                        onClick={isPro ? handleDowngrade : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-8 ${!isPro ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-default' : 'bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                        {!isPro ? 'Current Plan' : 'Downgrade'}
                    </button>

                    <ul className="space-y-4 text-left">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={18} className="text-emerald-500" /> 1 AI Resume Scan / day
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={18} className="text-emerald-500" /> Basic PDF Export
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
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

                    <button
                        disabled={isPro}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-8 shadow-lg ${isPro ? 'bg-emerald-800 text-emerald-200 cursor-default shadow-none' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-900/50'}`}
                    >
                        {isPro ? 'Current Plan' : 'Upgrade Now'}
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
                <div className="p-8 rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lifetime Access</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">One-time payment.</p>
                    <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">$199</div>

                    <button className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-900 dark:border-slate-600 text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors mb-8">
                        Get Lifetime
                    </button>

                    <ul className="space-y-4 text-left">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={18} className="text-emerald-500" /> Everything in Pro
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={18} className="text-emerald-500" /> Priority Support
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={18} className="text-emerald-500" /> Early Access to Features
                        </li>
                    </ul>
                </div>
            </div>

            {/* Coupon Code Section */}
            <div className="max-w-md mx-auto mt-16 text-center">
                <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Have a promo code?</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter coupon code"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none uppercase placeholder:normal-case"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button
                        onClick={handleRedeem}
                        disabled={isRedeeming || !couponCode}
                        className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRedeeming ? 'Checking...' : 'Apply'}
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all text-center border border-gray-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Pro!</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Your account has been successfully upgraded. Enjoy unlimited access.</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
