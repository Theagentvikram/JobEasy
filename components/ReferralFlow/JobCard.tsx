import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Job, JobStatus } from '../../types';
import { Briefcase, Calendar, Globe, Link as LinkIcon, LinkedinLogo, ArrowSquareOut } from '@phosphor-icons/react';

interface JobCardProps {
    job: Job;
    index: number;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index }) => {
    return (
        <Draggable draggableId={job.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{ ...provided.draggableProps.style }}
                    className={`bg-white dark:bg-[#051510] p-4 rounded-xl border border-gray-200 dark:border-emerald-500/10 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg ring-2 ring-emerald-500/50 rotate-2' : ''}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">{job.title}</h4>
                        {job.waitingPeriod > 0 && job.status === JobStatus.WAITING_REFERRAL && (
                            <span className="shrink-0 ml-2 text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                Wait {job.waitingPeriod}d
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                        <Briefcase size={12} weight="duotone" />
                        <span className="truncate">{job.company}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-emerald-500/10">
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${job.source === 'LinkedIn' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                                    job.source === 'Referral' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' :
                                        'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                                }`}>
                                {job.source === 'LinkedIn' && <LinkedinLogo size={10} weight="fill" />}
                                {job.source}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};
