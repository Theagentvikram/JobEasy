import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
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
import { BlogDetail } from './components/BlogDetail';
import { ThemeProvider } from './context/ThemeContext';
import { CursorGlow } from './components/ui/cursor-glow';

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = async (retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { default: api } = await import('./services/api');
        const response = await api.get('/auth/me');
        setUserData(response.data);
        return;
      } catch (error) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        } else {
          console.error("Failed to fetch user profile after retries:", error);
        }
      }
    }
  };

  // Listen for Firebase auth state changes — single source of truth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        setUserEmail(user.email);
        fetchUserProfile();

        // Handle Redirects (e.g. from Hero quick scan)
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        if (redirect) {
          navigate(redirect);
        } else if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
      } else {
        setFirebaseUser(null);
        setUserEmail(null);
        setUserData(null);
        if (location.pathname.startsWith('/dashboard')) {
          navigate('/');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]); // Removed location.pathname dependency to avoid circular loops

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUserEmail(null);
      setUserData(null);
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020c07] text-emerald-600">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          Loading JobEasy...
        </div>
      </div>
    );
  }

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
    <ThemeProvider>
      <div className="min-h-screen font-sans selection:bg-emerald-100 selection:text-emerald-900 relative text-gray-900 dark:text-gray-100 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300">

        {/* Global Background */}
        <div className="fixed inset-0 z-[-1] bg-white dark:bg-[#020c07] transition-colors duration-300"></div>
        <div className="fixed inset-0 z-[-1] vault-grid opacity-60 pointer-events-none dark:opacity-20"></div>

        {/* Subtle Ambient Light */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-100/30 dark:bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

        {/* Interactive Cursor Glow */}
        <CursorGlow />

        {/* Show Navbar only when NOT in Dashboard or Login */}
        {!location.pathname.startsWith('/dashboard') && location.pathname !== '/login' && (
          <Navbar
            isLoggedIn={!!userEmail}
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        )}

        <main key={location.pathname} className="min-h-screen flex flex-col animate-route-in">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard/*" element={
              <div className="h-screen overflow-hidden animate-route-in">
                <Scanner
                  user={{
                    uid: firebaseUser?.uid,
                    displayName: firebaseUser?.displayName,
                    email: firebaseUser?.email || userEmail,
                    ...userData,
                  }}
                  onLogout={handleLogout}
                  requestRefresh={fetchUserProfile}
                />
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}
