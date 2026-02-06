import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, Lock, AlertCircle, Star, ArrowLeft, CheckCircle } from 'lucide-react';
import { auth } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';

interface LoginProps {
  onLogin: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (!isForgotPassword && !password.trim())) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // BACKDOOR for Test Accounts
    if (!isForgotPassword && (email === 'theagentvikram@gmail.com' || email === 'sidhardharoy9@gmail.com')) {
      setTimeout(() => {
        onLogin(email);
      }, 500);
      return;
    }

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage("Password reset email sent! Check your inbox.");
      } else if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        onLogin(email);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin(email);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use. Try logging in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user.email || '');
    } catch (err: any) {
      console.error("Google Sign-in Error:", err);
      // Detailed error for debugging
      const errorMessage = err.message || "Unknown error";
      const errorCode = err.code || "No code";
      setError(`Google Sign-In failed: ${errorCode} - ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex overflow-hidden lg:static lg:h-auto lg:min-h-screen lg:bg-transparent">

      {/* LEFT SIDE - Hero/Informational */}
      <div className="hidden lg:flex w-[40%] bg-[#0B1120] relative flex-col justify-between p-8 lg:p-10 overflow-hidden text-white">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20 animate-pulse-slow delay-700"></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-emerald-300 text-[10px] font-bold mb-4 backdrop-blur-sm">
            <ShieldCheck size={12} /> Official Partner of 500+ Companies
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 leading-[1.1]">
            Landing your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Dream Job</span> just got easier.
          </h1>
          <p className="text-base text-gray-400 max-w-md leading-relaxed">
            Stop guessing with your resume. Get instant, AI-powered feedback to match any job description perfectly.
          </p>
        </div>

        {/* Feature List */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">ATS Compliance Check</h4>
              <p className="text-xs text-gray-500">Pass the bot filters automatically.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center backdrop-blur-sm">
              <Lock size={16} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Secure & Private</h4>
              <p className="text-xs text-gray-500">Your data is encrypted and safe.</p>
            </div>
          </div>
        </div>

        {/* Review Card */}
        <div className="relative z-10 p-5 bg-white/10 border border-white/5 backdrop-blur-md rounded-xl">
          <div className="flex gap-1 text-yellow-400 mb-2">
            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-yellow-400" />)}
          </div>
          <p className="text-gray-300 text-xs mb-3 leading-relaxed">
            "I applied to 50 jobs with no luck. After using JobEasy, I got 3 interviews in my first week! It's actually insane."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold">AK</div>
            <div>
              <div className="text-sm font-bold">Alex K.</div>
              <div className="text-[10px] text-gray-500">Software Engineer @ Google</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-white lg:bg-gray-50/50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 relative overflow-hidden animate-fade-in-up">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create your account' : 'Welcome back')}
            </h2>
            <p className="text-xs text-gray-500">
              {isForgotPassword
                ? 'Enter your email to receive a reset link.'
                : (isSignUp ? 'Start your specialized journey.' : 'Please enter your details to sign in.')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {!isForgotPassword && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-95 duration-200"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] uppercase font-bold tracking-wider">Or with email</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>
              </>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400 group-hover:bg-white"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400 group-hover:bg-white"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-bold shadow-lg shadow-gray-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In'))}
                {!loading && !isForgotPassword && <ArrowRight size={16} />}
              </button>

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full py-2 text-gray-500 hover:text-gray-900 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Back to Log In
                </button>
              )}
            </form>
          </div>

          {!isForgotPassword && (
            <p className="mt-6 text-center text-xs text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-all"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};