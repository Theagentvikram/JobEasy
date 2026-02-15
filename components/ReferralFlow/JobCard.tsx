import React from 'react';
import ReactDOM from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Job, JobStatus } from '../../types';
import { Briefcase, Calendar, LinkedinLogo, ArrowSquareOut } from '@phosphor-icons/react';

interface JobCardProps {
    job: Job;
    index: number;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index }) => {
    const normalizedSource = (job.source || '').toLowerCase();
    const sourceLabelMap: Record<string, string> = {
        linkedin: 'LinkedIn',
        referral_direct: 'Referral',
        company_site: 'Company Site',
        glassdoor: 'Glassdoor',
        wellfound: 'Wellfound',
        indeed: 'Indeed',
        naukri: 'Naukri',
        other: 'Other',
    };

    const sourceTone =
        normalizedSource === 'linkedin'
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
            : normalizedSource === 'referral_direct'
                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600';

    const getWaitLabel = () => {
        if (job.status !== JobStatus.WAITING_REFERRAL || !job.autoMoveDate) {
            return null;
        }
        const deltaMs = new Date(job.autoMoveDate).getTime() - Date.now();
        const days = Math.ceil(deltaMs / (1000 * 60 * 60 * 24));
        if (days <= 0) return "OVERDUE";
        return `${days}d left`;
    };

    const waitLabel = getWaitLabel();
    const priority = Math.max(0, Math.min(3, job.priority ?? 0));

    return (
        <Draggable draggableId={job.id} index={index}>
            {(provided, snapshot) => {
                const card = (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        className={`bg-gradient-to-br from-white to-emerald-50/70 dark:from-[#051510] dark:to-[#051510] p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-500/10 shadow-sm hover:shadow-md hover:border-emerald-300/80 dark:hover:border-emerald-500/20 transition-colors duration-200 group cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg ring-2 ring-emerald-500/50' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">{job.title}</h4>
                            {waitLabel && (
                                <span className={`shrink-0 ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${waitLabel === "OVERDUE" ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'}`}>
                                    {waitLabel}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Briefcase size={12} weight="duotone" />
                                <span className="truncate">{job.company}</span>
                            </div>
                            {priority > 0 && (
                                <span className="text-[10px] text-amber-500 whitespace-nowrap">
                                    {"★".repeat(priority)}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-emerald-100/70 dark:border-emerald-500/10">
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Calendar size={12} />
                                {new Date(job.dateDiscovered).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>

                            <div className="flex items-center gap-2">
                                {job.link && (
                                    <a href={job.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                                        <ArrowSquareOut size={14} />
                                    </a>
                                )}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${sourceTone}`}>
                                    {normalizedSource === 'linkedin' && <LinkedinLogo size={10} weight="fill" />}
                                    {sourceLabelMap[normalizedSource] || job.source}
                                </span>
                            </div>
                        </div>
                    </div>
                );

                if (snapshot.isDragging && typeof document !== 'undefined') {
                    return ReactDOM.createPortal(card, document.body);
                }

                return card;
            }}
        </Draggable>
    );
};
