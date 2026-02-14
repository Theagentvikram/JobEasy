import React, { useState } from 'react';
import { X, Plus, Calendar, Link as LinkIcon, Building, Globe } from '@phosphor-icons/react';
import { Job, JobStatus } from '../../types';
import api from '../../services/api';

interface JobEntryFormProps {
    onClose: () => void;
    onSave: (job: Job) => void;
}

export const JobEntryForm: React.FC<JobEntryFormProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Job>>({
        title: '',
        company: '',
        source: '',
        link: '',
        waitingPeriod: 2,
        dateDiscovered: new Date().toISOString().split('T')[0],
        status: JobStatus.WAITING_REFERRAL,
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'waitingPeriod' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/referral/jobs', {
                ...formData,
                outreach: [],
                outreachCount: 0
            });
            onSave(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to save job:", error);
            alert("Failed to save job. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#051510] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-emerald-500/20 overflow-hidden animate-fade-in-up">

                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-emerald-500/10 bg-gray-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add New Opportunity</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Title</label>
                        <div className="relative">
                            <input
                                required
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Senior Frontend Engineer"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
                            />
                            <Building className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Company</label>
                        <div className="relative">
                            <input
                                required
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="e.g. Google"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
                            />
                            <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Source</label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white"
                            >
                                <option value="">Select...</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Indeed">Indeed</option>
                                <option value="Glassdoor">Glassdoor</option>
                                <option value="Company Site">Company Site</option>
                                <option value="Referral">Referral</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Wait Period (Days)</label>
                            <input
                                type="number"
                                name="waitingPeriod"
                                min="0"
                                value={formData.waitingPeriod}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Link</label>
                        <div className="relative">
                            <input
                                name="link"
                                value={formData.link}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
                            />
                            <LinkIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-200 dark:border-emerald-500/20 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? 'Saving...' : <><Plus size={18} /> Add Job</>}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
