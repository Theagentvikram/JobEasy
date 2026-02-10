import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Lock, CheckCircle, Warning, Star, Lightning, ChartBar, ChartPie, Stack, BookOpen, ArrowRight } from '@phosphor-icons/react';
import { DeepDiveOverlay } from './DeepDiveOverlay';

interface PremiumAnalysisProps {
    result: AnalysisResult;
    isPremium?: boolean;
}

export const PremiumAnalysis: React.FC<PremiumAnalysisProps> = ({ result, isPremium = false }) => {
    const [activeView, setActiveView] = useState<'hardSkills' | 'softSkills' | 'impact' | null>(null);

    // If not premium, show the locked state
    if (!isPremium) {
        return (
            <div className="mt-8 relative overflow-hidden rounded-3xl border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-dark-gray shadow-sm p-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"></div>
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 relative z-10">
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-2 shadow-sm border border-purple-100 dark:border-purple-800">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Unlock Premium Analysis</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        Get a deep-dive report including missing keywords, formatting analysis, and a detailed skills gap check matching your target job.
                    </p>
                    <button className="mt-4 px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:scale-105 transition-transform flex items-center gap-2">
                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        Unlock Full Report
                    </button>
                </div>
                <div className="absolute inset-0 z-0 opacity-30 filter blur-md pointer-events-none select-none bg-grid-slate-100"></div>
            </div>
        );
    }

    // --- DATA PREPARATION (Enriching the basic result) ---
    // In a real app, this would come from the backend. Here we derive/mock it for the demo.

    // 1. Separate Skills (Mock logic)
    const allSkills = result.skillsDetected || [];
    const knownSoftSkills = ['communication', 'leadership', 'teamwork', 'problem solving', 'adaptability', 'time management'];

    const hardSkillsList = allSkills.filter(s => !knownSoftSkills.includes(s.toLowerCase()));
    const softSkillsList = allSkills.filter(s => knownSoftSkills.includes(s.toLowerCase()));

    // 2. Generate Impact Data from Improvements
    // We'll create some "Good" bullets from the improvements text for demo
    const impactData = {
        score: result.sectionScores.impact,
        metricsCount: 4,
        actionVerbsCount: 12,
        bullets: [
            { text: "Led a team of 5 developers to create the new dashboard.", score: 65, fix: "Spearheaded a team of 5 developers, launching the new dashboard 2 weeks ahead of schedule." },
            { text: "Responsible for managing AWS infrastructure.", score: 40, fix: "Optimized AWS infrastructure, reducing monthly cloud costs by 20%." },
            { text: "Created python scripts for automation.", score: 60, fix: "Automated manual workflows using Python scripts, saving 15 hours of engineering time per week." },
            { text: "Increased sales by 50% year over year.", score: 95, fix: null } // Perfect one
        ]
    };

    const hardSkillsData = {
        matched: hardSkillsList.map(s => ({ name: s, level: Math.floor(Math.random() * 2) + 3 })), // Random 3-5 stars
        missing: result.keywordsMissing || []
    };

    const softSkillsData = {
        skills: softSkillsList.length > 0 ? softSkillsList.map(s => ({ name: s, context: "Demonstrated in Work Experience" })) : [
            { name: "Leadership", context: "Inferred from 'Managed team' bullet point" },
            { name: "Communication", context: "Inferred from 'Presented to stakeholders'" }
        ]
    };

    const stats = [
        { id: 'hardSkills', label: 'Hard Skills', value: result.sectionScores.structure, color: 'bg-blue-500' }, // Mapping structure score to hard skills proxy for now
        { id: 'softSkills', label: 'Soft Skills', value: result.sectionScores.style, color: 'bg-purple-500' },
        { id: 'impact', label: 'Recruiter Impact', value: result.sectionScores.impact, color: 'bg-emerald-500' },
    ];

    return (
        <div className="mt-8 space-y-6 animate-fade-in text-left">

            {/* Full Screen Overlay for Details */}
            {activeView === 'hardSkills' && <DeepDiveOverlay type="hardSkills" data={hardSkillsData} onClose={() => setActiveView(null)} />}
            {activeView === 'softSkills' && <DeepDiveOverlay type="softSkills" data={softSkillsData} onClose={() => setActiveView(null)} />}
            {activeView === 'impact' && <DeepDiveOverlay type="impact" data={impactData} onClose={() => setActiveView(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star size={24} className="text-purple-500 fill-purple-100" />
                    Premium Deep Dive
                </h2>
                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Lightning size={12} className="fill-purple-700" weight="fill" /> Pro Feature Active
                </span>
            </div>

            {/* 1. Visual Stats Row (Clickable) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveView(stat.id as any)}
                        className="group bg-white dark:bg-dark-gray p-5 rounded-2xl border border-gray-100 dark:border-dark-gray shadow-sm flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all text-left relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                {stat.label} <ArrowRight size={12} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-purple-500" />
                            </span>
                            {i === 0 && <ChartBar size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />}
                            {i === 1 && <ChartPie size={18} className="text-gray-300 group-hover:text-purple-500 transition-colors" />}
                            {i === 2 && <Lightning size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" weight="fill" />}
                        </div>
                        <div className="flex items-end gap-3 relative z-10">
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{stat.value}%</span>
                            <div className="flex-1 pb-2">
                                <div className="h-2 bg-gray-100 dark:bg-black rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${stat.color} transition-all duration-1000 ease-out`} style={{ width: `${stat.value}%` }}></div>
                                </div>
                            </div>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">

                {/* 2. Keyword Analysis */}
                <div className="bg-white dark:bg-dark-gray p-6 rounded-3xl border border-gray-100 dark:border-dark-gray shadow-sm relative overflow-hidden group hover:border-red-100 dark:hover:border-red-900/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Warning size={100} className="text-red-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <Warning size={18} />
                        </div>
                        Missing Keywords
                    </h3>
                    {(result.keywordsMissing || []).length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <CheckCircle size={20} /> All relevant keywords detected!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Add these keywords to increase your match score:</p>
                            <div className="flex flex-wrap gap-2">
                                {(result.keywordsMissing || []).map((kw, i) => (
                                    <span key={i} className="group relative px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-bold rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-help">
                                        {kw}
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                            +5 pts
                                        </span>
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-dark-gray">
                                <BookOpen size={16} className="text-gray-400 mt-0.5" />
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Tip: Weave these into your "Work Experience" section rather than just listing them in "Skills" for better context scoring.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Formatting Checks */}
                <div className="bg-white dark:bg-dark-gray p-6 rounded-3xl border border-gray-100 dark:border-dark-gray shadow-sm hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Stack size={18} />
                        </div>
                        Formatting & Structure
                    </h3>
                    <ul className="space-y-3">
                        {(result.formattingIssues.length > 0 ? result.formattingIssues : ["Resume length is optimal", "Good use of bullet points"]).map((issue, i) => {
                            const isGood = issue.toLowerCase().includes("good") || issue.toLowerCase().includes("optimal") || issue.toLowerCase().includes("clear");
                            return (
                                <li key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isGood ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800'}`}>
                                    {isGood ? (
                                        <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <Warning size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm font-medium ${isGood ? 'text-gray-700 dark:text-gray-200' : 'text-gray-800 dark:text-gray-100'}`}>{issue}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

        </div>
    );
};
