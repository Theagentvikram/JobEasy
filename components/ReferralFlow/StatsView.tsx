import React, { useMemo } from 'react';
import { Job, JobStatus } from '../../types';
import { TrendUp, PaperPlaneRight, Handshake, CheckCircle } from '@phosphor-icons/react';

interface StatsViewProps {
    jobs: Job[];
    stats?: any;
}

export const StatsView: React.FC<StatsViewProps> = ({ jobs, stats: serverStats }) => {
    const localStats = useMemo(() => {
        const total = jobs.length;
        const waiting = jobs.filter(j => j.status === JobStatus.WAITING_REFERRAL).length;
        const applyToday = jobs.filter(j => j.status === JobStatus.APPLY_TODAY).length;
        const applied = jobs.filter(j =>
            [JobStatus.APPLIED, JobStatus.INTERVIEW, JobStatus.OFFER].includes(j.status as JobStatus)
        ).length;
        const referralReceived = jobs.filter(j => j.status === JobStatus.REFERRAL_RECEIVED).length;
        const eligibleForReferral = waiting + referralReceived + applied;
        const referralRate = eligibleForReferral > 0 ? Math.round((referralReceived / eligibleForReferral) * 100) : 0;

        return { total, waiting, applyToday, applied, referralReceived, referralRate };
    }, [jobs]);

    const effective = {
        total: serverStats?.jobs_discovered ?? localStats.total,
        waiting: localStats.waiting,
        applyToday: localStats.applyToday,
        applied: serverStats?.applications_sent ?? localStats.applied,
        referralReceived: serverStats?.referrals_received ?? localStats.referralReceived,
        referralRate: Math.round(serverStats?.referral_rate ?? localStats.referralRate),
        outreachSent: serverStats?.outreach_sent ?? 0,
        interviewsScheduled: serverStats?.interviews_scheduled ?? 0,
        avgTimeToReferralHours: serverStats?.avg_time_to_referral_hours ?? 0,
    };

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard
                    title="Discovered"
                    value={effective.total}
                    icon={<TrendUp size={20} weight="duotone" />}
                    color="text-blue-500"
                    bg="bg-blue-50 dark:bg-blue-900/20"
                />
                <StatCard
                    title="Waiting Referral"
                    value={effective.waiting}
                    icon={<Handshake size={20} weight="duotone" />}
                    color="text-amber-500"
                    bg="bg-amber-50 dark:bg-amber-900/20"
                />
                <StatCard
                    title="Ready To Apply"
                    value={effective.applyToday}
                    icon={<PaperPlaneRight size={20} weight="duotone" />}
                    color="text-emerald-500"
                    bg="bg-emerald-50 dark:bg-emerald-900/20"
                    highlight={effective.applyToday > 0}
                />
                <StatCard
                    title="Referral Rate"
                    value={`${effective.referralRate}%`}
                    icon={<CheckCircle size={20} weight="duotone" />}
                    color="text-purple-500"
                    bg="bg-purple-50 dark:bg-purple-900/20"
                />
            </div>

            <div className="mb-6 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full border border-emerald-200/80 bg-white/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-300">
                    Outreach Sent: {effective.outreachSent}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-blue-200/80 bg-white/80 text-blue-700 dark:border-blue-500/20 dark:bg-white/5 dark:text-blue-300">
                    Applied: {effective.applied}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-purple-200/80 bg-white/80 text-purple-700 dark:border-purple-500/20 dark:bg-white/5 dark:text-purple-300">
                    Interviews: {effective.interviewsScheduled}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-amber-200/80 bg-white/80 text-amber-700 dark:border-amber-500/20 dark:bg-white/5 dark:text-amber-300">
                    Avg Referral Time: {effective.avgTimeToReferralHours}h
                </span>
            </div>
        </>
    );
};

const StatCard = ({ title, value, icon, color, bg, highlight }: any) => (
    <div className={`p-4 rounded-2xl border ${highlight ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/20' : 'border-emerald-200/80 dark:border-emerald-500/10'} bg-gradient-to-br from-white to-emerald-50/75 dark:from-white/[0.04] dark:to-white/[0.02] flex items-center justify-between shadow-sm`}>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
            {icon}
        </div>
    </div>
);
