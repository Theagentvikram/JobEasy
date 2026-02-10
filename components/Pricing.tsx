import React, { useState } from 'react';
import { Check, GraduationCap, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (Replace with your actual Publishable Key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY || 'pk_test_placeholder');

export const Pricing: React.FC = () => {
  const [isStudent, setIsStudent] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      // Placeholder for backend call
      // const response = await api.post('/create-checkout-session', { planId, isStudent });
      // const { sessionId } = response.data;
      // const stripe = await stripePromise;
      // await stripe?.redirectToCheckout({ sessionId });

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`Redirecting to Stripe Checkout for ${planId} ${isStudent ? '(Student Discount Applied)' : ''}... \n\n(Backend Endpoint Pending)`);
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Failed to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-24 bg-white/40 dark:bg-slate-900/40 border-y border-white/50 dark:border-slate-800 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Invest in your career for less than the cost of a coffee.</p>

          {/* Student Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-semibold ${!isStudent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Standard</span>
            <button
              onClick={() => setIsStudent(!isStudent)}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isStudent ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${isStudent ? 'translate-x-6' : 'translate-x-0'}`}>
                {isStudent && <GraduationCap size={14} className="text-emerald-500" />}
              </div>
            </button>
            <span className={`text-sm font-semibold ${isStudent ? 'text-emerald-600' : 'text-gray-500'}`}>
              Student Offer <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">50% OFF</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="p-8 bg-white/70 dark:bg-slate-800/70 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$0</span>
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">For casual job seekers.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> 1 AI Resume Scan per day</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> Basic Grammar Check</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> Export to PDF</li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white font-semibold hover:border-gray-900 dark:hover:border-white transition-colors">Get Started</button>
          </div>

          {/* Pro */}
          <div className="p-8 bg-gray-900 rounded-3xl shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Pro</h3>
              <div className="mt-4 flex items-baseline">
                {isStudent ? (
                  <>
                    <span className="text-4xl font-bold tracking-tight text-white">$6</span>
                    <span className="ml-2 text-lg text-gray-500 line-through">$12</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold tracking-tight text-white">$12</span>
                )}
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
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={!!loadingPlan}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'pro' && <Loader2 className="animate-spin" size={18} />}
              Upgrade to Pro
            </button>
          </div>

          {/* Ultimate */}
          <div className="p-8 bg-white/70 dark:bg-slate-800/70 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ultimate</h3>
              <div className="mt-4 flex items-baseline">
                {isStudent ? (
                  <>
                    <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$14.50</span>
                    <span className="ml-2 text-lg text-gray-400 line-through">$29</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$29</span>
                )}
                <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">For power users & coaches.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> Everything in Pro</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> LinkedIn Profile Optimization</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> Cover Letter Generator</li>
              <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300"><Check size={18} className="text-emerald-500" /> Priority Support</li>
            </ul>
            <button
              onClick={() => handleSubscribe('ultimate')}
              disabled={!!loadingPlan}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white font-semibold hover:border-gray-900 dark:hover:border-white transition-colors flex items-center justify-center gap-2"
            >
              {loadingPlan === 'ultimate' && <Loader2 className="animate-spin" size={18} />}
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};