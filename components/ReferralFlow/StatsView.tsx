import React, { useMemo } from 'react';
import { Job, JobStatus } from '../../types';
import { TrendUp, PaperPlaneRight, Handshake, CheckCircle } from '@phosphor-icons/react';

interface StatsViewProps {
    jobs: Job[];
}

export const StatsView: React.FC<StatsViewProps> = ({ jobs }) => {
    const stats = useMemo(() => {
        const total = jobs.length;
        const waiting = jobs.filter(j => j.status === JobStatus.WAITING_REFERRAL).length;
        const applyToday = jobs.filter(j => j.status === JobStatus.APPLY_TODAY).length;
        const applied = jobs.filter(j => j.status === JobStatus.APPLIED).length;
        const referralReceived = jobs.filter(j => j.status === JobStatus.REFERRAL_RECEIVED).length;

        // Calculate conversion rate (Referral Received / Total that are eligible)
        // eligible = waiting + referral received + applied (assuming applied came from referral flow)
        const eligibleForReferral = waiting + referralReceived + applied; // Rough approximation
        const referralRate = eligibleForReferral > 0 ? Math.round((referralReceived / eligibleForReferral) * 100) : 0;

        return { total, waiting, applyToday, applied, referralReceived, referralRate };
    }, [jobs]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
                title="Discovered"
                value={stats.total}
                icon={<TrendUp size={20} weight="duotone" />}
                color="text-blue-500"
                bg="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard
                title="Waiting Referral"
                value={stats.waiting}
                icon={<Handshake size={20} weight="duotone" />}
                color="text-amber-500"
                bg="bg-amber-50 dark:bg-amber-900/20"
            />
            <StatCard
                title="Ready to Apply"
                value={stats.applyToday}
                icon={<PaperPlaneRight size={20} weight="duotone" />}
                color="text-emerald-500"
                bg="bg-emerald-50 dark:bg-emerald-900/20"
                highlight={stats.applyToday > 0}
            />
            <StatCard
                title="Referral Rate"
                value={`${stats.referralRate}%`}
                icon={<CheckCircle size={20} weight="duotone" />}
                color="text-purple-500"
                bg="bg-purple-50 dark:bg-purple-900/20"
            />
        </div>
    );
};

const StatCard = ({ title, value, icon, color, bg, highlight }: any) => (
    <div className={`p-4 rounded-2xl border ${highlight ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-gray-200 dark:border-emerald-500/10'} bg-white dark:bg-white/[0.02] flex items-center justify-between`}>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
            {icon}
        </div>
    </div>
);
