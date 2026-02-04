import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Lock, CheckCircle, AlertTriangle, Star, Zap, BarChart3, PieChart, Layers, BookOpen } from 'lucide-react';

interface PremiumAnalysisProps {
    result: AnalysisResult;
    isPremium?: boolean;
}

export const PremiumAnalysis: React.FC<PremiumAnalysisProps> = ({ result, isPremium = false }) => {
    // If not premium, show the locked state (which mimics the blurry UI user likes)
    // But since we want "automatically displayed" for pro users, we prioritize content.
    // The parent ATSView controls the "Unlock" overlay for the main dashboard.
    // This component is specifically for the EXTRA deep dive content.

    const missingKeywords = result.keywordsMissing.length > 0 ? result.keywordsMissing : ["Python", "Docker", "AWS", "CI/CD"];
    const formattingIssues = result.formattingIssues.length > 0 ? result.formattingIssues : ["Resume length is optimal (1 page)", "Good use of bullet points", "Contact info is clear"];
    const skills = result.skillsDetected.length > 0 ? result.skillsDetected : ["Communication", "Leadership", "Problem Solving"];

    // Dummy data for the new visual charts
    const detailedStats = [
        { label: 'Hard Skills', value: 85, color: 'bg-blue-500' },
        { label: 'Soft Skills', value: 92, color: 'bg-purple-500' },
        { label: 'Recruiter Impact', value: 78, color: 'bg-emerald-500' },
    ];

    if (!isPremium) {
        return (
            <div className="mt-8 relative overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm p-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"></div>
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 relative z-10">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2 shadow-sm border border-purple-100">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Unlock Premium Analysis</h3>
                    <p className="text-gray-500 max-w-md">
                        Get a deep-dive report including missing keywords, formatting analysis, and a detailed skills gap check matching your target job.
                    </p>
                    {/* Dummy button that redirects to plans (handled by parent usually, but good to have) */}
                    <button className="mt-4 px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:scale-105 transition-transform flex items-center gap-2">
                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        Unlock Full Report
                    </button>
                </div>
                {/* Blurry background preview */}
                <div className="absolute inset-0 z-0 opacity-30 filter blur-md pointer-events-none select-none bg-grid-slate-100"></div>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Star size={24} className="text-purple-500 fill-purple-100" />
                    Premium Deep Dive
                </h2>
                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Zap size={12} className="fill-purple-700" /> Pro Feature Active
                </span>
            </div>

            {/* 1. Visual Stats Row (New Feature) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {detailedStats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-emerald-100 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">{stat.label}</span>
                            {i === 0 && <BarChart3 size={16} className="text-gray-400" />}
                            {i === 1 && <PieChart size={16} className="text-gray-400" />}
                            {i === 2 && <Zap size={16} className="text-gray-400" />}
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-3xl font-bold text-gray-900">{stat.value}%</span>
                            <div className="flex-1 pb-1.5">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${stat.value}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">

                {/* 2. Keyword Analysis */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle size={100} className="text-red-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle size={18} />
                        </div>
                        Missing Keywords
                    </h3>
                    {missingKeywords.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <CheckCircle size={20} /> All relevant keywords detected!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Add these keywords to increase your match score:</p>
                            <div className="flex flex-wrap gap-2">
                                {missingKeywords.map((kw, i) => (
                                    <span key={i} className="group relative px-3 py-1.5 bg-red-50 text-red-700 text-sm font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-help">
                                        {kw}
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                            +5 pts
                                        </span>
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <BookOpen size={16} className="text-gray-400 mt-0.5" />
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Tip: Weave these into your "Work Experience" section rather than just listing them in "Skills" for better context scoring.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Formatting Checks */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-100 transition-colors">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Layers size={18} />
                        </div>
                        Formatting & Structure
                    </h3>
                    <ul className="space-y-3">
                        {formattingIssues.map((issue, i) => {
                            const isGood = issue.toLowerCase().includes("good") || issue.toLowerCase().includes("optimal") || issue.toLowerCase().includes("clear");
                            return (
                                <li key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isGood ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                    {isGood ? (
                                        <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm font-medium ${isGood ? 'text-gray-700' : 'text-gray-800'}`}>{issue}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

        </div>
    );
};
