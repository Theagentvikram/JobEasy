import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Scanner } from './components/Scanner';
import { Login } from './components/Login';
import { Testimonials } from './components/Testimonials';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Blog } from './components/Blog';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { AppState } from './types';

// DEV MODE: Set to false to enable actual Authentication (Firebase + Mock)
const DEV_MODE = false;
const DEV_USER_EMAIL = 'dev@jobeasy.local';

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(DEV_MODE ? DEV_USER_EMAIL : null);
  const [loading, setLoading] = useState(!DEV_MODE);
  const navigate = useNavigate();
  const location = useLocation();

  // Track mock logins to prevent Firebase from over-riding them
  const isMockLogin = React.useRef(false);

  // Listen for auth state changes (skipped in DEV_MODE)
  useEffect(() => {
    if (DEV_MODE) {
      console.log('🚀 DEV MODE: Bypassing Firebase auth');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If we have a real firebase user, sync state
      if (user) {
        isMockLogin.current = false; // Reset mock flag if real user found
        setUserEmail(user.email);
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
      }
      // If no firebase user, ONLY clear if it's not a mock session
      else if (!isMockLogin.current) {
        setUserEmail(null);
        if (location.pathname.startsWith('/dashboard')) {
          navigate('/');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [location.pathname, navigate]);

  const handleLogin = (email: string) => {
    if (email === 'theagentvikram@gmail.com' || email === 'sidhardharoy9@gmail.com') {
      isMockLogin.current = true;
    }
    setUserEmail(email);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      isMockLogin.current = false;
      await auth.signOut();
      setUserEmail(null);
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-emerald-600">Loading JobEasy...</div>;
  }

  // Helper for Landing Page content
  const LandingPage = () => (
    <div className="animate-fade-in">
      <Hero onStart={() => navigate('/login')} />
      <Features />
      <Pricing />
      <Testimonials />
      <Blog />
      <Contact />
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 selection:text-emerald-900 relative text-gray-900">

      {/* Global Background - VaultFlow Style Grid */}
      <div className="fixed inset-0 z-[-1] bg-white"></div>
      <div className="fixed inset-0 z-[-1] vault-grid opacity-60 pointer-events-none"></div>

      {/* Subtle Ambient Light (Top Center) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-100/30 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

      {/* Show Navbar only when NOT in Dashboard or Login mode */}
      {!location.pathname.startsWith('/dashboard') && location.pathname !== '/login' && (
        <Navbar
          isLoggedIn={!!userEmail}
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      )}

      <main className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/dashboard/*" element={
            // Dashboard takes full height and manages its own layout
            <div className="h-screen overflow-hidden">
              <Scanner user={{ email: userEmail }} onLogout={handleLogout} />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}