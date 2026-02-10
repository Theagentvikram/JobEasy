import React from 'react';
import { Briefcase, Twitter, Linkedin, Instagram, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">J</div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">JobEasy</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              AI-powered tools to help you build a better resume, beat the ATS, and land your dream job faster.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"><Twitter size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"><Linkedin size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600 dark:hover:text-pink-400 transition-all"><Instagram size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Resume Scanner</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">AI Resume Builder</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Cover Letter Generator</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">LinkedIn Optimization</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Career Blog</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Resume Examples</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Job Search Guide</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Interview Prep</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
          <p>© 2024 JobEasy AI Inc. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="#" className="hover:text-gray-600">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};