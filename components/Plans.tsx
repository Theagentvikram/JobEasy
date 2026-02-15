import React, { useState } from 'react';
import { Check, Star, Zap, Crown, Globe } from 'lucide-react';
import api from '../services/api';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PlansProps {
    isPro?: boolean;
    onUpgradeSuccess?: () => void;
    activePlanType?: string;
}

// Country-specific pricing
interface RegionPricing {
    currency: string;
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
        currency: 'INR',
        symbol: '₹',
        region: 'India',
        weekly: 99,
        monthly: 499,
        quarterly: 999,
        lifetime: 2499,
        weeklyBase: 299,
        monthlyBase: 999,
        quarterlyBase: 1999,
        lifetimeBase: 4999,
    },
    US: {
        currency: 'USD',
        symbol: '$',
        region: 'US & Global',
        weekly: 9,
        monthly: 19,
        quarterly: 39,
        lifetime: 99,
    },
}

export const Plans: React.FC<PlansProps> = ({ isPro = false, onUpgradeSuccess, activePlanType = '' }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [region, setRegion] = useState<'IN' | 'US'>('US');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
    const [couponMessage, setCouponMessage] = useState('');
    const [couponError, setCouponError] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [showCouponInput, setShowCouponInput] = useState(false);

    const pricing = PRICING[region];

    const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) { resolve(true); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const isCurrentPaidPlan = (plan: 'weekly' | 'monthly' | 'quarterly' | 'lifetime') => {
        if (!isPro) return false;
        if (!activePlanType) return true;
        return activePlanType === plan;
    };

    const applyCouponCode = async (rawCode: string) => {
        const code = rawCode.trim().toUpperCase();
        if (!code) {
            setCouponError('Enter a valid coupon code.');
            setCouponMessage('');
            setAppliedCoupon(null);
            return;
        }

        setIsApplyingCoupon(true);
        setCouponError('');
        setCouponMessage('');
        try {
            const res = await api.post('/payment/validate-coupon', { code });
            if (res.data?.valid) {
                setAppliedCoupon({ code, discount: res.data.discount || 0 });
                setCouponMessage(res.data?.message || `Coupon applied: ${code}`);
            } else {
                setAppliedCoupon(null);
                setCouponError(res.data?.message || 'Invalid coupon code.');
            }
        } catch {
            setAppliedCoupon(null);
            setCouponError('Unable to validate coupon right now. Please try again.');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleApplyCoupon = async () => {
        await applyCouponCode(couponCode);
    };

    const handleUpgrade = async (plan: 'weekly' | 'monthly' | 'quarterly' | 'lifetime') => {
        setIsProcessing(true);
        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) { alert('Failed to load payment gateway.'); setIsProcessing(false); return; }

            const selectedPlanAmount = plan === 'weekly'
                ? pricing.weekly
                : plan === 'monthly'
                    ? pricing.monthly
                : plan === 'quarterly'
                    ? pricing.quarterly
                    : pricing.lifetime;
            const amount = Math.round(selectedPlanAmount * 100);

            const orderRes = await api.post('/payment/create-order', {
                amount,
                plan,
                currency: pricing.currency,
                coupon_code: appliedCoupon?.code || undefined,
            });
            if (orderRes.data?.status === 'activated') {
                setShowSuccessModal(true);
                if (onUpgradeSuccess) onUpgradeSuccess();
                setIsProcessing(false);
                return;
            }

            const { order_id, amount: orderAmount, currency, key_id } = orderRes.data;

            const options = {
                key: key_id,
                amount: orderAmount,
                currency: currency,
                name: 'JobEasy',
                description: plan === 'weekly'
                    ? 'Weekly Pass (7 days)'
                    : plan === 'monthly'
                        ? 'Monthly Pass (30 days)'
                    : plan === 'quarterly'
                        ? 'Quarterly Pass (90 days)'
                        : 'Lifetime Access',
                order_id: order_id,
                handler: async (response: any) => {
                    try {
                        await api.post('/payment/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        setShowSuccessModal(true);
                        if (onUpgradeSuccess) onUpgradeSuccess();
                    } catch (err) { alert('Payment verification failed. Please contact support.'); }
                    setIsProcessing(false);
                },
                theme: { color: '#059669' },
                modal: { ondismiss: () => setIsProcessing(false) }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to initiate payment.');
            setIsProcessing(false);
        }
    };

    const handleDowngrade = async () => {
        if (!confirm("Are you sure you want to downgrade to the Free plan?")) return;
        try { await api.post('/auth/downgrade'); if (onUpgradeSuccess) onUpgradeSuccess(); } catch { }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#020c07] p-6 md:p-10 overflow-y-auto transition-colors duration-300">
            <div className="max-w-7xl mx-auto text-center mb-10">
                <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                    Pricing Plans
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                    Pick your job search pass
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-3">
                    Weekly for urgency, monthly for steady prep, quarterly for full search season.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                    <Globe size={14} />
                    <span>Prices shown for {pricing.region}</span>
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

                <div className="max-w-md mx-auto mt-6">
                    <button
                        onClick={() => setShowCouponInput((prev) => !prev)}
                        className="text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 transition-colors"
                    >
                        {showCouponInput ? 'Hide coupon field' : 'Have a coupon?'}
                    </button>

                    {showCouponInput && (
                        <div className="mt-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-white/90 dark:bg-emerald-950/40">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    placeholder="Enter coupon code"
                                    className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-emerald-950/60 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-400"
                                />
                                <button
                                    onClick={handleApplyCoupon}
                                    disabled={isApplyingCoupon}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isApplyingCoupon
                                        ? 'bg-emerald-400/70 text-white cursor-wait'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                        }`}
                                >
                                    {isApplyingCoupon ? 'Applying...' : 'Apply'}
                                </button>
                            </div>
                            {!!couponMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{couponMessage}</p>}
                            {!!couponError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{couponError}</p>}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 px-4">
                {/* Free Plan */}
                <div className="p-7 rounded-3xl border border-gray-100 dark:border-emerald-500/10 bg-white dark:bg-emerald-950/50 hover:border-gray-200 dark:hover:border-emerald-500/20 transition-all flex flex-col opacity-80 hover:opacity-100">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Free</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">For casual job seekers</p>
                    <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">
                        {pricing.symbol}0<span className="text-base text-gray-400 font-medium ml-1">/forever</span>
                    </div>

                    <button
                        disabled={!isPro}
                        onClick={isPro ? handleDowngrade : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-7 ${!isPro
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                            }`}
                    >
                        {!isPro ? 'Get Started' : 'Downgrade'}
                    </button>

                    <ul className="space-y-3.5 flex-1">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> 1 ATS Scan / day
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> 2 Resume Uploads
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Basic PDF Export
                        </li>
                    </ul>
                </div>

                {/* Weekly Pass */}
                <div className="p-7 rounded-3xl border border-emerald-200/70 dark:border-emerald-500/20 bg-white dark:bg-emerald-950/60 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Weekly Pass</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Perfect for deadline panic applications</p>
                    <div className="mb-6">
                        {pricing.weeklyBase && pricing.weeklyBase > pricing.weekly && (
                            <div className="text-sm font-semibold text-gray-400 line-through mb-1">
                                {pricing.symbol}{pricing.weeklyBase}
                            </div>
                        )}
                        <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                            {pricing.symbol}{pricing.weekly}
                            <span className="text-base text-gray-400 font-medium ml-1">/week</span>
                        </div>
                    </div>

                    <button
                        disabled={isPro || isProcessing}
                        onClick={!isPro ? () => handleUpgrade('weekly') : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-7 ${isCurrentPaidPlan('weekly') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default'
                            : isProcessing ? 'bg-emerald-500/70 text-white cursor-wait'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30'
                            }`}
                    >
                        {isCurrentPaidPlan('weekly') ? 'Current Plan' : isProcessing ? 'Processing...' : 'Upgrade'}
                    </button>

                    <ul className="space-y-3.5 flex-1">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Zap size={16} className="text-emerald-500 shrink-0" /> Unlimited ATS Scans (up to 20/day)
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Resume Uploads (up to 10/week)
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Detailed ATS Reports
                        </li>
                    </ul>
                </div>

                {/* Monthly Plan */}
                <div className="p-7 rounded-3xl border border-emerald-200/70 dark:border-emerald-500/20 bg-white dark:bg-emerald-950/60 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Monthly</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Affordable standard plan for active applications</p>
                    <div className="mb-6">
                        {pricing.monthlyBase && pricing.monthlyBase > pricing.monthly && (
                            <div className="text-sm font-semibold text-gray-400 line-through mb-1">
                                {pricing.symbol}{pricing.monthlyBase}
                            </div>
                        )}
                        <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                            {pricing.symbol}{pricing.monthly}
                            <span className="text-base text-gray-400 font-medium ml-1">/month</span>
                        </div>
                    </div>

                    <button
                        disabled={isPro || isProcessing}
                        onClick={!isPro ? () => handleUpgrade('monthly') : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-7 ${isCurrentPaidPlan('monthly') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default'
                            : isProcessing ? 'bg-emerald-500/70 text-white cursor-wait'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30'
                            }`}
                    >
                        {isCurrentPaidPlan('monthly') ? 'Current Plan' : isProcessing ? 'Processing...' : 'Upgrade'}
                    </button>

                    <ul className="space-y-3.5 flex-1">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Zap size={16} className="text-emerald-500 shrink-0" /> Unlimited ATS Scans (up to 20/day)
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Resume Uploads (up to 10/week)
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Detailed ATS Reports
                        </li>
                    </ul>
                </div>

                {/* Quarterly Pass */}
                <div className="p-7 rounded-3xl border-2 border-emerald-500 bg-emerald-950 dark:bg-emerald-950 text-white relative transform md:-translate-y-4 shadow-2xl shadow-emerald-500/20 flex flex-col">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                        Most Popular
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Quarterly Pass</h3>
                    <p className="text-emerald-200/80 text-sm mb-5">Best for Job Search Season</p>
                    <div className="mb-6">
                        {pricing.quarterlyBase && pricing.quarterlyBase > pricing.quarterly && (
                            <div className="text-sm font-semibold text-emerald-200/50 line-through mb-1">
                                {pricing.symbol}{pricing.quarterlyBase}
                            </div>
                        )}
                        <div className="text-4xl font-extrabold text-white">
                            {pricing.symbol}{pricing.quarterly}
                            <span className="text-base text-emerald-200/50 font-medium ml-1">/3 months</span>
                        </div>
                    </div>

                    <button
                        disabled={isPro || isProcessing}
                        onClick={!isPro ? () => handleUpgrade('quarterly') : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-7 shadow-lg ${isCurrentPaidPlan('quarterly') ? 'bg-emerald-800 text-emerald-200 cursor-default shadow-none'
                            : isProcessing ? 'bg-emerald-700 text-white cursor-wait'
                                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-900/50'
                            }`}
                    >
                        {isCurrentPaidPlan('quarterly') ? 'Current Plan' : isProcessing ? 'Processing...' : 'Upgrade'}
                    </button>

                    <ul className="space-y-3.5 flex-1">
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-0.5 bg-emerald-500/20 rounded-full shrink-0"><Zap size={13} className="text-emerald-400" /></div>
                            Unlimited ATS Scans (up to 20/day)
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-0.5 bg-emerald-500/20 rounded-full shrink-0"><Check size={13} className="text-emerald-400" /></div>
                            Resume Uploads (up to 10/week)
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-0.5 bg-emerald-500/20 rounded-full shrink-0"><Check size={13} className="text-emerald-400" /></div>
                            Detailed ATS Reports
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-0.5 bg-emerald-500/20 rounded-full shrink-0"><Star size={13} className="text-emerald-400" /></div>
                            AI Career Assistant
                        </li>
                        <li className="flex items-center gap-3 text-emerald-50 text-sm">
                            <div className="p-0.5 bg-emerald-500/20 rounded-full shrink-0"><Check size={13} className="text-emerald-400" /></div>
                            All Premium Templates
                        </li>
                    </ul>
                </div>

                {/* Lifetime Plan */}
                <div className="p-7 rounded-3xl border border-emerald-200/70 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-emerald-950/60 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all flex flex-col relative">
                    <div className="absolute top-3 right-3">
                        <Crown size={20} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Lifetime Access</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">High-value anchor for long-term users</p>
                    <div className="mb-6">
                        {pricing.lifetimeBase && pricing.lifetimeBase > pricing.lifetime && (
                            <div className="text-sm font-semibold text-gray-400 line-through mb-1">
                                {pricing.symbol}{pricing.lifetimeBase}
                            </div>
                        )}
                        <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                            {pricing.symbol}{pricing.lifetime}
                            <span className="text-base text-gray-400 font-medium ml-1">one-time</span>
                        </div>
                    </div>

                    <button
                        disabled={isPro || isProcessing}
                        onClick={!isPro ? () => handleUpgrade('lifetime') : undefined}
                        className={`w-full py-3 rounded-xl font-bold transition-colors mb-7 ${isCurrentPaidPlan('lifetime') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 cursor-default'
                            : isProcessing ? 'bg-emerald-500/70 text-white cursor-wait'
                                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30'
                            }`}
                    >
                        {isCurrentPaidPlan('lifetime') ? 'Current Plan' : isProcessing ? 'Processing...' : 'Upgrade'}
                    </button>

                    <ul className="space-y-3.5 flex-1">
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> Everything in Quarterly Pass
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> No recurring charges
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Check size={16} className="text-emerald-500 shrink-0" /> All future updates
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm">
                            <Crown size={16} className="text-emerald-500 shrink-0" /> Priority Support
                        </li>
                    </ul>
                </div>
            </div>

            {/* Secure Payment Badge */}
            <div className="max-w-md mx-auto mt-10 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    🔒 Payments processed securely by Razorpay. Your data is encrypted and safe.
                </p>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-emerald-950 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100 dark:border-emerald-500/20">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pass Activated!</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Your premium pass is active. Enjoy full access during your plan period.</p>
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
