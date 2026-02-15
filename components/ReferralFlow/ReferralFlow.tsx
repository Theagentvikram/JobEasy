import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FunnelSimple, ArrowsDownUp, Rows, Columns, ArrowSquareOut } from '@phosphor-icons/react';
import { Job, JobStatus } from '../../types';
import api from '../../services/api';
import { JobEntryForm } from './JobEntryForm';
import { StatusColumn } from './StatusColumn';
import { StatsView } from './StatsView';
import { ApplyTodayDashboard } from './ApplyTodayDashboard';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Particles } from '../ui/particles';

const STATUS_COLUMNS = [
    { id: JobStatus.APPLY_TODAY, label: 'Apply Today', color: 'bg-emerald-500' },
    { id: JobStatus.WAITING_REFERRAL, label: 'Waiting', color: 'bg-amber-500' },
    { id: JobStatus.REFERRAL_RECEIVED, label: 'Referral Received', color: 'bg-blue-500' },
    { id: JobStatus.APPLIED, label: 'Applied', color: 'bg-purple-500' },
    { id: JobStatus.INTERVIEW, label: 'Interview', color: 'bg-indigo-500' },
    { id: JobStatus.OFFER, label: 'Offer', color: 'bg-emerald-700' },
    { id: JobStatus.REJECTED, label: 'Rejected', color: 'bg-rose-500' },
    { id: JobStatus.WITHDRAWN, label: 'Withdrawn', color: 'bg-orange-500' },
    { id: JobStatus.CLOSED, label: 'Closed', color: 'bg-gray-500' },
];

type ViewMode = 'kanban' | 'table';

export const ReferralFlow: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('kanban');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [sortBy, setSortBy] = useState('dateDiscovered');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const fetchJobs = async () => {
        try {
            const response = await api.get<Job[]>('/referral/jobs', {
                params: {
                    status: statusFilter,
                    source: sourceFilter,
                    sort: sortBy,
                    order: sortOrder,
                }
            });
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/referral/stats', { params: { period: 'week' } });
            setStats(response.data);
        } catch (error) {
            console.error("Failed to fetch referral stats:", error);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchJobs(), fetchStats()]);
            setLoading(false);
        })();
    }, [statusFilter, sourceFilter, sortBy, sortOrder]);

    const handleRefresh = async () => {
        await Promise.all([fetchJobs(), fetchStats()]);
    };

    const handleAddJob = async (newJob: Job) => {
        setJobs(prev => [...prev, newJob]);
        await handleRefresh();
    };

    const handleMarkApplied = async (jobId: string) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.APPLIED } : j));
        try {
            await api.patch(`/referral/jobs/${jobId}`, {
                status: JobStatus.APPLIED,
                dateApplied: new Date().toISOString()
            });
            await fetchStats();
        } catch (error) {
            console.error("Failed to mark applied:", error);
            fetchJobs();
        }
    };

    const handleApplyNow = async (job: Job) => {
        if (job.link) {
            window.open(job.link, '_blank', 'noopener,noreferrer');
        }
        await handleMarkApplied(job.id);
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as JobStatus;
        setJobs(prev => prev.map(job => job.id === draggableId ? { ...job, status: newStatus } : job));

        try {
            await api.patch(`/referral/jobs/${draggableId}`, { status: newStatus });
            await fetchStats();
        } catch (error) {
            console.error("Failed to update job status:", error);
            fetchJobs();
        }
    };

    const availableSources = useMemo(() => {
        const sources = new Set<string>();
        jobs.forEach(job => {
            if (job.source) sources.add(job.source);
        });
        return ['all', ...Array.from(sources)];
    }, [jobs]);

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-emerald-600 font-medium">Loading your flow...</div>;
    }

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-emerald-100/90 via-emerald-50/85 to-teal-50/80 dark:from-emerald-950/20 dark:via-[#051510] dark:to-black rounded-3xl border border-emerald-200/80 dark:border-emerald-500/10 p-6 shadow-md shadow-emerald-900/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(16,185,129,0.13),transparent_45%),radial-gradient(circle_at_84%_76%,rgba(20,184,166,0.10),transparent_40%)] pointer-events-none" />
            <Particles className="absolute inset-0 z-0 pointer-events-none" quantity={150} staticity={30} ease={50} color="#10b981" refresh />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-4 gap-3 px-1">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Referral Flow</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                            Free-tier referral-first workflow. Jobs auto-surface into <span className="text-emerald-600 font-bold">Apply Today</span> when the wait period expires.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/70 dark:bg-white/5 border-emerald-200/80 dark:border-emerald-500/20 text-gray-700 dark:text-gray-300'}`}
                        >
                            <Columns size={14} /> Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1 ${viewMode === 'table' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/70 dark:bg-white/5 border-emerald-200/80 dark:border-emerald-500/20 text-gray-700 dark:text-gray-300'}`}
                        >
                            <Rows size={14} /> Table
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all"
                        >
                            <Plus size={16} /> Add Opportunity
                        </button>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 items-center">
                    <div className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-white/5 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center gap-1">
                        <FunnelSimple size={13} /> Filters
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-white/5">
                        <option value="all">All Status</option>
                        {STATUS_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-white/5">
                        {availableSources.map(source => <option key={source} value={source}>{source === 'all' ? 'All Sources' : source}</option>)}
                    </select>
                    <div className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-white/5 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center gap-1">
                        <ArrowsDownUp size={13} /> Sort
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-white/5">
                        <option value="dateDiscovered">Discovered Date</option>
                        <option value="autoMoveDate">Apply By Date</option>
                        <option value="priority">Priority</option>
                        <option value="updatedAt">Last Updated</option>
                        <option value="company">Company</option>
                    </select>
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className="px-3 py-1.5 rounded-lg text-xs border border-emerald-200/80 dark:border-emerald-500/20 bg-white/80 dark:bg-white/5">
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>

                <ApplyTodayDashboard jobs={jobs} onMarkApplied={handleMarkApplied} onApplyNow={handleApplyNow} />
                <StatsView jobs={jobs} stats={stats} />

                {viewMode === 'kanban' && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <div className="flex gap-4 min-w-max pb-3 h-full px-1">
                                {STATUS_COLUMNS.map(column => (
                                    <StatusColumn
                                        key={column.id}
                                        id={column.id}
                                        label={column.label}
                                        color={column.color}
                                        jobs={jobs.filter(j => j.status === column.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </DragDropContext>
                )}

                {viewMode === 'table' && (
                    <div className="flex-1 overflow-auto custom-scrollbar rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-white/70 dark:bg-white/[0.03]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-emerald-50/90 dark:bg-black/30 backdrop-blur border-b border-emerald-200/80 dark:border-emerald-500/20">
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-3">Company</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Apply By</th>
                                    <th className="px-4 py-3">Contacts</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job.id} className="border-b border-emerald-100/70 dark:border-emerald-500/10">
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{job.company}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{job.title}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {job.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{job.autoMoveDate ? new Date(job.autoMoveDate).toLocaleDateString() : '--'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{job.outreachCount || 0}</td>
                                        <td className="px-4 py-3 text-amber-500">{'★'.repeat(Math.max(0, Math.min(3, job.priority ?? 0))) || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleMarkApplied(job.id)} className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">Mark Applied</button>
                                                {job.link && (
                                                    <a href={job.link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-md text-xs font-bold bg-white dark:bg-black/30 border border-emerald-200/80 dark:border-emerald-500/20 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-1">
                                                        Open <ArrowSquareOut size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={7}>
                                            No jobs match current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {showAddModal && (
                    <JobEntryForm onClose={() => setShowAddModal(false)} onSave={handleAddJob} />
                )}
            </div>
        </div>
    );
};
