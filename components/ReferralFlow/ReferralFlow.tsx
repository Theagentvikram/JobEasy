import React, { useState, useEffect } from 'react';
import { Plus } from '@phosphor-icons/react';
import { Job, JobStatus } from '../../types';
import api from '../../services/api';
import { JobEntryForm } from './JobEntryForm';
import { StatusColumn } from './StatusColumn';
import { StatsView } from './StatsView';
import { ApplyTodayDashboard } from './ApplyTodayDashboard';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Particles } from '../ui/particles';

const STATUS_COLUMNS = [
    { id: JobStatus.WAITING_REFERRAL, label: 'Waiting for Referral', color: 'bg-amber-500' },
    { id: JobStatus.APPLY_TODAY, label: 'Apply Today', color: 'bg-emerald-500' },
    { id: JobStatus.REFERRAL_RECEIVED, label: 'Referral Received', color: 'bg-blue-500' },
    { id: JobStatus.APPLIED, label: 'Applied', color: 'bg-purple-500' },
    { id: JobStatus.CLOSED, label: 'Closed', color: 'bg-gray-500' },
];

export const ReferralFlow: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await api.get<Job[]>('/referral/jobs');
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddJob = (newJob: Job) => {
        setJobs(prev => [...prev, newJob]);
    };

    const handleMarkApplied = async (jobId: string) => {
        // Optimistic update
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.APPLIED } : j));
        try {
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                await api.put(`/referral/jobs/${jobId}`, { ...job, status: JobStatus.APPLIED });
            }
        } catch (error) {
            console.error("Failed to mark applied:", error);
            fetchJobs(); // Revert
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as JobStatus;

        // Optimistic Update
        const updatedJobs = jobs.map(job =>
            job.id === draggableId ? { ...job, status: newStatus } : job
        );
        setJobs(updatedJobs);

        try {
            // Find the job to get current full object
            const jobToUpdate = jobs.find(j => j.id === draggableId);
            if (jobToUpdate) {
                await api.put(`/referral/jobs/${draggableId}`, { ...jobToUpdate, status: newStatus });
            }
        } catch (error) {
            console.error("Failed to update job status:", error);
            fetchJobs(); // Revert on failure
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-emerald-600 font-medium">Loading your flow...</div>;
    }

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white dark:from-emerald-950/20 dark:via-[#051510] dark:to-black rounded-3xl border border-emerald-100/60 dark:border-emerald-500/10 p-6 shadow-sm">
            {/* Background Particles */}
            <Particles
                className="absolute inset-0 z-0 pointer-events-none"
                quantity={150}
                staticity={30}
                ease={50}
                color="#10b981"
                refresh
            />

            {/* Content Content - z-index to sit above particles */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Referral Flow</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                            Track referrals and manage your application timing. Jobs in <span className="text-amber-600 font-bold">Waiting</span> will automatically move to <span className="text-emerald-600 font-bold">Apply Today</span> when their wait period expires.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} /> Add Opportunity
                    </button>
                </div>

                {/* Actionable Dashboard */}
                <ApplyTodayDashboard jobs={jobs} onMarkApplied={handleMarkApplied} />

                {/* Stats Overview */}
                <StatsView jobs={jobs} />

                {/* Kanban Board */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <div className="flex gap-6 min-w-max pb-4 h-full px-1">
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

                {showAddModal && (
                    <JobEntryForm onClose={() => setShowAddModal(false)} onSave={handleAddJob} />
                )}
            </div>
        </div>
    );
};
