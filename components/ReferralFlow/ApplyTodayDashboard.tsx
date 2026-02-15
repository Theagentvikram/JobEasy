import React, { useMemo } from 'react';
import { Job, JobStatus } from '../../types';
import { CheckCircle, ArrowRight, ArrowSquareOut } from '@phosphor-icons/react';

interface ApplyTodayDashboardProps {
    jobs: Job[];
    onMarkApplied: (jobId: string) => void;
    onApplyNow: (job: Job) => void;
}

const getDaysOverdue = (job: Job) => {
    if (!job.autoMoveDate) return 0;
    const due = new Date(job.autoMoveDate).getTime();
    const now = Date.now();
    const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
};

export const ApplyTodayDashboard: React.FC<ApplyTodayDashboardProps> = ({ jobs, onMarkApplied, onApplyNow }) => {
    const readyJobs = useMemo(
        () => jobs.filter(j => j.status === JobStatus.APPLY_TODAY),
        [jobs]
    );

    if (readyJobs.length === 0) return null;

    const urgency = readyJobs.length >= 8 ? "high" : readyJobs.length >= 4 ? "medium" : "low";
    const wrapperClass = urgency === "high"
        ? "from-red-500 to-amber-600"
        : urgency === "medium"
            ? "from-amber-500 to-orange-500"
            : "from-emerald-500 to-teal-600";

    return (
        <div className={`mb-8 bg-gradient-to-br ${wrapperClass} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${readyJobs.length > 5 ? 'animate-pulse' : ''}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
                    <CheckCircle size={26} weight="fill" className="text-white" />
                    Apply Today Queue ({readyJobs.length})
                </h2>
                <p className="text-white/85 mb-4 max-w-3xl text-sm">
                    Jobs below are ready now. This list is fully free-tier and computed automatically from your waiting period.
                </p>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {readyJobs.map(job => (
                        <div key={job.id} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-all">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-bold text-base leading-tight">{job.title}</h3>
                                    <p className="text-white/80 text-xs">{job.company}</p>
                                    <p className="text-[11px] text-white/80 mt-1">
                                        {getDaysOverdue(job) > 0 ? `${getDaysOverdue(job)} day(s) overdue` : "Due today"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => onApplyNow(job)}
                                    className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-1"
                                >
                                    Apply Now <ArrowRight size={14} />
                                </button>
                                {job.link && (
                                    <a
                                        href={job.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-white/15 border border-white/30 rounded-lg text-xs font-bold hover:bg-white/25 transition-colors flex items-center gap-1"
                                    >
                                        Open Link <ArrowSquareOut size={13} />
                                    </a>
                                )}
                                <button
                                    onClick={() => onMarkApplied(job.id)}
                                    className="ml-auto px-3 py-1.5 bg-black/20 border border-white/20 rounded-lg text-xs font-bold hover:bg-black/30 transition-colors"
                                >
                                    Mark Applied
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
