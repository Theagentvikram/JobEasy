import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Job, JobStatus } from '../../types';
import { JobCard } from './JobCard';

interface StatusColumnProps {
    id: JobStatus;
    label: string;
    color: string;
    jobs: Job[];
}

export const StatusColumn: React.FC<StatusColumnProps> = ({ id, label, color, jobs }) => {
    return (
        <div className="w-80 flex flex-col bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-emerald-500/10 h-full max-h-[calc(100vh-180px)] shrink-0">
            {/* Column Header */}
            <div className={`p-4 border-b border-gray-100 dark:border-emerald-500/10 flex items-center justify-between sticky top-0 bg-inherit rounded-t-2xl z-10 backdrop-blur-sm`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`}></div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{label}</h3>
                    <span className="text-xs font-semibold text-gray-400 bg-white dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/5">
                        {jobs.length}
                    </span>
                </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={id}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                    >
                        {jobs.map((job, index) => (
                            <JobCard key={job.id} job={job} index={index} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};
