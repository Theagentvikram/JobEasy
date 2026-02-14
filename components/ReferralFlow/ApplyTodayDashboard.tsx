import React, { useMemo } from 'react';
import { Job, JobStatus } from '../../types';
import { CheckCircle, ArrowRight } from '@phosphor-icons/react';

interface ApplyTodayDashboardProps {
    jobs: Job[];
    onMarkApplied: (jobId: string) => void;
}

export const ApplyTodayDashboard: React.FC<ApplyTodayDashboardProps> = ({ jobs, onMarkApplied }) => {
    const readyJobs = useMemo(() =>
        jobs.filter(j => j.status === JobStatus.APPLY_TODAY),
        [jobs]);

    if (readyJobs.length === 0) return null;

    return (
        <div className="mb-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <CheckCircle size={28} weight="fill" className="text-white" />
                    Action Required: Apply Today!
                </h2>
                <p className="text-emerald-100 mb-6 max-w-2xl">
                    You have {readyJobs.length} jobs where the referral waiting period has ended. It's time to submit your application to keep momentum going.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    {readyJobs.map(job => (
                        <div key={job.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{job.title}</h3>
                                    <p className="text-emerald-100 text-sm">{job.company}</p>
                                </div>
                                <button
                                    onClick={() => onMarkApplied(job.id)}
                                    className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
                                >
                                    Mark Applied <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
