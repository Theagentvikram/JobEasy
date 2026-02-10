import React from 'react';
import { ArrowLeft, BarChart2, CheckCircle, Zap, User, Star, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';

interface DeepDiveProps {
    type: 'hardSkills' | 'softSkills' | 'impact';
    data: any;
    onClose: () => void;
}

export const DeepDiveOverlay: React.FC<DeepDiveProps> = ({ type, data, onClose }) => {
    const config = {
        hardSkills: {
            title: 'Hard Skills Analysis',
            subtitle: 'Technical competencies & Tools',
            icon: <BarChart2 size={24} className="text-blue-500" />,
            theme: 'blue',
            description: "These are the measurable, teachable abilities that you've listed. We've matched them against industry standards."
        },
        softSkills: {
            title: 'Soft Skills & Culture Fit',
            subtitle: 'Communication, Leadership & Adaptability',
            icon: <User size={24} className="text-purple-500" />,
            theme: 'purple',
            description: "Recruiters look for these traits to see how you'll work with the team. These are detected from your bullet points."
        },
        impact: {
            title: 'Recruiter Impact Score',
            subtitle: 'Quantifiable achievements & Results',
            icon: <Zap size={24} className="text-emerald-500" />,
            theme: 'emerald',
            description: "Your ability to demonstrate value through numbers and results. This is the #1 thing hiring managers look for."
        }
    };

    const currentTheme = config[type].theme;
    const ThemeColors = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        emerald: 'bg-emerald-500',
        blueLight: 'bg-blue-50 text-blue-700 border-blue-100',
        purpleLight: 'bg-purple-50 text-purple-700 border-purple-100',
        emeraldLight: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };

    const getThemeColor = (key: string) => {
        // simple mapping
        if (currentTheme === 'blue') return key === 'bg' ? 'bg-blue-500' : 'text-blue-600';
        if (currentTheme === 'purple') return key === 'bg' ? 'bg-purple-500' : 'text-purple-600';
        return key === 'bg' ? 'bg-emerald-500' : 'text-emerald-600';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-fade-in-up">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-10 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-gray-600 font-medium"
                >
                    <ArrowLeft size={20} />
                    Back to Summary
                </button>
                <span className="text-xs font-bold bg-gray-900 text-white px-3 py-1 rounded-full uppercase">
                    Premium Report
                </span>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12">
                {/* Title Section */}
                <div className="mb-12">
                    <div className={`w-14 h-14 rounded-2xl ${ThemeColors[currentTheme + 'Light' as keyof typeof ThemeColors]} flex items-center justify-center mb-6`}>
                        {config[type].icon}
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{config[type].title}</h1>
                    <p className="text-xl text-gray-500 leading-relaxed max-w-2xl">
                        {config[type].description}
                    </p>
                </div>

                {/* Content Renderers */}

                {/* HARD SKILLS VIEW */}
                {type === 'hardSkills' && (
                    <div className="space-y-12">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Star size={18} className="text-blue-500" /> Top Matches
                                </h3>
                                <div className="space-y-4">
                                    {data.matched.map((skill: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <span className="font-semibold text-gray-800">{skill.name}</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <div key={star} className={`w-1.5 h-6 rounded-full ${star <= skill.level ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-xl shadow-blue-500/5">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" /> Market Gap
                                </h3>
                                <p className="text-gray-500 mb-6 text-sm">
                                    You are missing these high-demand skills often found in similar roles:
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {data.missing.map((skill: string, i: number) => (
                                        <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold flex items-center gap-2">
                                            <AlertCircle size={14} /> {skill}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="flex items-start gap-3">
                                        <BookOpen size={16} className="text-blue-600 mt-0.5" />
                                        <div>
                                            <div className="text-sm font-bold text-blue-900 mb-1">Recommendation</div>
                                            <p className="text-xs text-blue-700">Add a project using <strong>{data.missing[0]}</strong> to boost your score by ~15%.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SOFT SKILLS VIEW */}
                {type === 'softSkills' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        {data.skills.map((skill: any, i: number) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold">
                                        {skill.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{skill.name}</h4>
                                        <span className="text-xs text-gray-500">Detected in 3 sections</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                                    "{skill.context}"
                                </p>
                                <div className="flex items-center gap-2 text-xs font-semibold text-purple-600">
                                    <CheckCircle size={14} /> Strong Evidence
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* IMPACT VIEW */}
                {type === 'impact' && (
                    <div className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                                <div className="text-3xl font-extrabold text-emerald-600 mb-1">{data.metricsCount}</div>
                                <div className="text-sm text-emerald-800 font-medium">Metrics Found</div>
                            </div>
                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                                <div className="text-3xl font-extrabold text-emerald-600 mb-1">{data.actionVerbsCount}</div>
                                <div className="text-sm text-emerald-800 font-medium">Strong Action Verbs</div>
                            </div>
                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                                <div className="text-3xl font-extrabold text-emerald-600 mb-1">{data.score}/100</div>
                                <div className="text-sm text-emerald-800 font-medium">Global Impact Score</div>
                            </div>
                        </div>

                        <h3 className="font-bold text-xl text-gray-900">Detailed Bullet Point Analysis</h3>
                        <div className="space-y-4">
                            {data.bullets.map((item: any, i: number) => (
                                <div key={i} className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-emerald-500 transition-colors cursor-default">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <p className="text-gray-800 font-medium leading-relaxed">
                                            {item.text}
                                        </p>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${item.score > 80 ? 'bg-emerald-100 text-emerald-700' :
                                                item.score > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {item.score > 80 ? 'High Impact' : item.score > 50 ? 'Medium Impact' : 'Weak'}
                                        </span>
                                    </div>

                                    {item.fix && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                                <Zap size={14} />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-900 block mb-1">Make it stronger:</span>
                                                <p className="text-sm text-gray-600">"{item.fix}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
