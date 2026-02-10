
import React from 'react';
import { Resume } from '../types';
import { AuditResult, AuditIssue } from '../utils/resumeAudit';
import { AlertCircle, CheckCircle, Info, Sparkles, XCircle, TrendingUp, Mic, Dumbbell, Lightbulb, ArrowRight, Zap } from 'lucide-react';

interface ResumeAuditProps {
    auditResult: AuditResult;
    aiAudit?: any; // The AI result from backend
    onFix: (issue: AuditIssue) => void;
    isAnalyzing: boolean;
}

export const ResumeAudit: React.FC<ResumeAuditProps> = ({ auditResult, aiAudit, onFix, isAnalyzing }) => {

    if (isAnalyzing) {
        return (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center animate-pulse">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-full mb-4">
                    <Sparkles className="text-emerald-500 animate-spin-slow" size={32} />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1">Analyzing Resume...</h3>
                <p className="text-sm dark:text-gray-400">Checking impact, keywords, and formatting.</p>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
        if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800';
    };

    const AuditCard = ({ title, icon, data, description }: { title: string, icon: any, data: any, description: string }) => {
        if (!data) return null;
        const score = data.score || 0;
        const issues = data.issues || data.found || []; // 'found' for buzzwords/personals
        const suggestions = data.suggestions || [];

        return (
            <div className="bg-white dark:bg-dark-gray p-5 rounded-xl border border-gray-200 dark:border-dark-gray shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : score >= 60 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {icon}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h4>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Impact Score</div>
                        </div>
                    </div>
                    <div className={`text-sm font-bold px-2 py-1 rounded border ${getScoreColor(score)}`}>
                        {score}/100
                    </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed border-b border-gray-50 dark:border-black pb-3">{description}</p>

                {/* Issues Section */}
                {issues.length > 0 ? (
                    <div className="mb-4">
                        <h5 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-2">
                            <XCircle size={12} /> Needs Improvement
                        </h5>
                        <ul className="space-y-2">
                            {issues.map((issue: string, i: number) => (
                                <li key={i} className="text-xs text-gray-700 dark:text-gray-300 bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-50 dark:border-red-900/20 flex items-start gap-2">
                                    <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                    <span>{issue}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="mb-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-50 dark:border-emerald-900/20">
                        <CheckCircle size={14} /> Great job! No critical issues found.
                    </div>
                )}

                {/* Suggestions Section */}
                {suggestions.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-2">
                            <Lightbulb size={12} /> AI Suggestions
                        </h5>
                        <ul className="space-y-2">
                            {suggestions.map((suggestion: string, i: number) => (
                                <li key={i} className="text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-100 dark:border-blue-900/20 flex items-start gap-2">
                                    <ArrowRight size={12} className="mt-0.5 opacity-50 shrink-0" />
                                    <span>{suggestion}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Overall Score Banner */}
            <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg text-white overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/2 -translate-y-1/2">
                    <Sparkles size={120} />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h3 className="text-xl font-bold mb-1">Resume Health Score</h3>
                        <p className="text-emerald-300 text-xs font-medium uppercase tracking-wider">Based on ATS & Impact checks</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-4xl font-bold ${auditResult.score >= 80 ? 'text-emerald-400' : auditResult.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {auditResult.score}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">out of 100</div>
                    </div>
                </div>
            </div>

            {/* AI Insights Grid */}
            {aiAudit && aiAudit.audit && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-dark-gray pb-2">
                        <Zap size={16} className="text-amber-500" /> Content Impact Analysis
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <AuditCard
                            title="Action Verbs"
                            icon={<Dumbbell size={18} />}
                            data={aiAudit.audit.actionVerbs}
                            description="Strong action verbs (e.g., 'Orchestrated', 'Developed') quantify your contributions better than passive ones."
                        />
                        <AuditCard
                            title="Measurable Results"
                            icon={<TrendingUp size={18} />}
                            data={aiAudit.audit.quantifiableResults}
                            description="Employers love numbers. Quantifying achievements (e.g., 'Increased revenue by 20%') proves your value."
                        />
                        <AuditCard
                            title="Buzzwords"
                            icon={<AlertCircle size={18} />}
                            data={aiAudit.audit.buzzwords}
                            description="Avoid overused clichés like 'Hard worker' or 'Team player'. Demonstrate these traits through examples instead."
                        />
                        <AuditCard
                            title="Professional Tone"
                            icon={<Mic size={18} />}
                            data={aiAudit.audit.personals}
                            description="Avoid personal pronouns (I, Me, My). Resumes should be written in a professional, impartial voice."
                        />
                    </div>
                </div>
            )}

            {/* Structural Issues */}
            <div className="bg-white dark:bg-dark-gray rounded-2xl border border-gray-200 dark:border-dark-gray shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-dark-gray bg-gray-50/50 dark:bg-black/20">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        <Info size={16} className="text-blue-500" /> ATS Structure Audit
                    </h3>
                </div>

                <div className="p-4">
                    {auditResult.issues.length === 0 ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="p-2 bg-white dark:bg-black rounded-full"><CheckCircle size={20} className="text-emerald-500" /></div>
                            <div>
                                <div className="font-bold text-sm">Structure looks perfect!</div>
                                <div className="text-xs opacity-80">Your resume follows all standard ATS formatting rules.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {auditResult.issues.map((issue, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${issue.type === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' :
                                    issue.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'
                                    }`}>
                                    <div className={`mt-0.5 p-1.5 rounded-full ${issue.type === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : issue.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                        {issue.type === 'critical' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${issue.type === 'critical' ? 'bg-red-200/50 dark:bg-red-800/30 text-red-800 dark:text-red-200' : 'bg-amber-200/50 dark:bg-amber-800/30 text-amber-800 dark:text-amber-200'}`}>
                                                {issue.section}
                                            </span>
                                            {/* <button className="text-[10px] font-bold text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded bg-white shadow-sm">Auto Fix</button> */}
                                        </div>
                                        <div className={`text-sm font-medium leading-snug ${issue.type === 'critical' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'}`}>{issue.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
