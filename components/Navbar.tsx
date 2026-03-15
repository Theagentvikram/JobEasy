import React from 'react';
import { Briefcase, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import { AppState } from '../types';
import { useTheme } from '../context/ThemeContext';

import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  isLoggedIn: boolean;
  userEmail: string | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, userEmail, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 pt-6">
      <div className="max-w-6xl mx-auto glass-panel dark:bg-[#020c07]/90 dark:border-emerald-500/10 shadow-sm rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-300 backdrop-blur-md">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md group-hover:bg-emerald-700 transition-all duration-300">
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">JobEasy</span>
        </div>

        {/* Links - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-600 dark:text-gray-300">
          <button onClick={() => scrollToSection('features')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Features</button>
          <button onClick={() => scrollToSection('pricing')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Pricing</button>
          <button onClick={() => scrollToSection('blog')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Blog</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contact</button>
        </div>

        {/* Auth / CTA */}
        <div className="flex items-center gap-4">
          {/* UI Switcher */}
          <button
            onClick={() => {
              localStorage.setItem('jobeasy_ui', 'new');
              window.location.href = '/new/';
            }}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            title="Switch to the new UI"
          >
            <span>✨</span> New UI
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-neutral-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-emerald-500/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                {userEmail}
              </div>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                Dashboard
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:block text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="group flex items-center gap-2 bg-gray-900 dark:bg-emerald-600 hover:bg-gray-800 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-none"
              >
                Get Started
                <LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};