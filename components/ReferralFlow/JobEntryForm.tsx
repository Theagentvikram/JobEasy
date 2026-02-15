import React, { useMemo, useState } from 'react';
import { X, Plus, Link as LinkIcon, Building, Globe, CloudArrowUp, Spinner, Lightning } from '@phosphor-icons/react';
import { Job } from '../../types';
import api from '../../services/api';

interface JobEntryFormProps {
    onClose: () => void;
    onSave: (job: Job) => void;
}

type AutofillState = {
    kind: 'idle' | 'loading' | 'success' | 'error';
    message: string;
};

export const JobEntryForm: React.FC<JobEntryFormProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        source: 'linkedin',
        sourceOther: '',
        link: '',
        location: '',
        jobType: 'unknown',
        salaryRange: '',
        jobDescription: '',
        sponsorshipRequired: false,
        waitingPeriod: 2,
        priority: 0,
        tagsInput: '',
        notes: '',
        dateDiscovered: new Date().toISOString().split('T')[0],
    });
    const [importUrl, setImportUrl] = useState('');
    const [rawJobText, setRawJobText] = useState('');
    const [usePastedText, setUsePastedText] = useState(false);
    const [autofillState, setAutofillState] = useState<AutofillState>({ kind: 'idle', message: '' });
    const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : (name === 'waitingPeriod' || name === 'priority')
                        ? Number(value)
                        : value
        }));
    };

    const pulseFields = (fields: string[]) => {
        if (!fields.length) return;
        setHighlightedFields({});
        fields.forEach((field, index) => {
            window.setTimeout(() => {
                setHighlightedFields(prev => ({ ...prev, [field]: true }));
            }, index * 80);
        });
        window.setTimeout(() => setHighlightedFields({}), 1800);
    };

    const fieldClass = (name: string) => (
        highlightedFields[name]
            ? 'ring-2 ring-emerald-400/70 border-emerald-400 shadow-lg shadow-emerald-500/15 animate-pulse'
            : ''
    );

    const applyExtractedData = (extracted: any, method: string, warnings: string[]) => {
        const updates: Record<string, string | number | boolean> = {};
        const touchedFields: string[] = [];
        const isFallbackTitle = (value: string) => /^LinkedIn Job #\d+$/i.test(value.trim());

        const assignIfValue = (key: string, value: any) => {
            if (value === undefined || value === null) return;
            const text = String(value).trim();
            if (!text) return;
            if (key === 'title' && isFallbackTitle(text) && formData.title.trim()) return;
            updates[key] = text;
            touchedFields.push(key);
        };

        assignIfValue('title', extracted?.title);
        assignIfValue('company', extracted?.company);
        assignIfValue('location', extracted?.location);
        assignIfValue('salaryRange', extracted?.salaryRange);
        assignIfValue('jobDescription', extracted?.jobDescription);
        assignIfValue('link', extracted?.link || importUrl);
        assignIfValue('source', extracted?.source);
        assignIfValue('sourceOther', extracted?.sourceOther);
        if (Array.isArray(extracted?.tags) && extracted.tags.length) {
            updates.tagsInput = extracted.tags.join(', ');
            touchedFields.push('tagsInput');
        }

        if (typeof extracted?.jobType === 'string' && extracted.jobType.trim()) {
            updates.jobType = extracted.jobType.trim().toLowerCase();
            touchedFields.push('jobType');
        }

        if (typeof extracted?.notes === 'string' && extracted.notes.trim()) {
            setFormData(prev => ({
                ...prev,
                ...updates,
                notes: prev.notes ? `${prev.notes}\n${extracted.notes.trim()}` : extracted.notes.trim(),
            }));
            touchedFields.push('notes');
        } else {
            setFormData(prev => ({ ...prev, ...updates }));
        }

        pulseFields(touchedFields);

        const warningText = warnings.length ? ` • ${warnings[0]}` : '';
        setAutofillState({
            kind: 'success',
            message: `Autofilled via ${method}${warningText}`,
        });
    };

    const handleAutofillFromUrl = async () => {
        const url = importUrl.trim();
        const pasted = usePastedText ? rawJobText.trim() : '';
        if (!url && !pasted) {
            setAutofillState({ kind: 'error', message: 'Paste a job URL or full job text first.' });
            return;
        }

        setAutofillState({ kind: 'loading', message: 'Fetching job details...' });
        try {
            const response = await api.post('/referral/jobs/extract', { url, rawText: pasted });
            const extracted = response.data?.job || {};
            const method = response.data?.method || 'fallback';
            const warnings = Array.isArray(response.data?.warnings) ? response.data.warnings : [];
            applyExtractedData(extracted, method, warnings);
        } catch (error: any) {
            console.error('Failed to auto-fill from URL:', error);
            setAutofillState({
                kind: 'error',
                message: error?.response?.data?.detail || 'Failed to fetch job details from URL.',
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const tags = formData.tagsInput
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const payload = {
                title: formData.title.trim(),
                company: formData.company.trim(),
                source: formData.source,
                sourceOther: formData.source === 'other' ? formData.sourceOther.trim() : '',
                link: formData.link.trim(),
                location: formData.location.trim(),
                jobType: formData.jobType,
                salaryRange: formData.salaryRange.trim(),
                jobDescription: formData.jobDescription.trim(),
                sponsorshipRequired: formData.sponsorshipRequired,
                waitingPeriod: Math.max(0, Number(formData.waitingPeriod) || 2),
                priority: Math.max(0, Math.min(3, Number(formData.priority) || 0)),
                tags,
                notes: formData.notes.trim(),
                dateDiscovered: formData.dateDiscovered,
                outreach: [],
                outreachCount: 0
            };

            const response = await api.post('/referral/jobs', payload);
            onSave(response.data);
            onClose();
        } catch (error: any) {
            console.error("Failed to save job:", error);
            alert(error?.response?.data?.detail || "Failed to save job. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const autofillTone = useMemo(() => {
        if (autofillState.kind === 'success') return 'text-emerald-600 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-900/10';
        if (autofillState.kind === 'error') return 'text-rose-600 dark:text-rose-300 border-rose-300/60 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-900/10';
        return 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-emerald-500/10 bg-white/70 dark:bg-white/5';
    }, [autofillState.kind]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#051510] rounded-2xl shadow-xl w-full max-w-2xl border border-gray-200 dark:border-emerald-500/20 overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-emerald-500/10 bg-gray-50/50 dark:bg-white/5 sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add New Opportunity</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-900/10 dark:to-black/20 p-4 animate-fade-in">
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2">Auto-fill from Job URL</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="url"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                placeholder="Paste LinkedIn/Indeed/Naukri job URL..."
                                className="flex-1 px-4 py-2.5 bg-white/90 dark:bg-black/25 border border-emerald-200/80 dark:border-emerald-500/20 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-gray-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={handleAutofillFromUrl}
                                disabled={autofillState.kind === 'loading'}
                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[150px]"
                            >
                                {autofillState.kind === 'loading' ? (
                                    <>
                                        <Spinner size={16} className="animate-spin" />
                                        Fetching...
                                    </>
                                ) : (
                                    <>
                                        <CloudArrowUp size={16} />
                                        Fetch Details
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            value={rawJobText}
                            onChange={(e) => setRawJobText(e.target.value)}
                            placeholder="Optional but recommended: paste the full 'About the job' text for perfect extraction."
                            rows={4}
                            className={`mt-2 w-full px-4 py-2.5 bg-white/90 dark:bg-black/25 border border-emerald-200/80 dark:border-emerald-500/20 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-gray-900 dark:text-white resize-y ${!usePastedText ? 'opacity-70' : ''}`}
                            disabled={!usePastedText}
                        />
                        <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={usePastedText}
                                onChange={(e) => setUsePastedText(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Use pasted text for this extraction
                        </label>

                        <div className={`mt-3 p-2.5 rounded-xl border text-xs font-medium transition-all duration-300 ${autofillTone}`}>
                            <div className="flex items-center gap-2">
                                {autofillState.kind === 'loading' && <Spinner size={14} className="animate-spin" />}
                                {autofillState.kind === 'success' && <Lightning size={14} weight="fill" />}
                                {autofillState.kind === 'error' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />}
                                <span>{autofillState.message || 'Paste a URL, then click Fetch Details. Enable pasted-text mode only when you want to merge manual JD text.'}</span>
                            </div>
                            {autofillState.kind === 'loading' && (
                                <div className="mt-2 h-1.5 bg-emerald-100/80 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                                    <div className="h-full w-1/2 bg-emerald-500 rounded-full animate-shimmer" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Title*</label>
                            <div className="relative">
                                <input
                                    required
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Senior Frontend Engineer"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('title')}`}
                                />
                                <Building className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Company*</label>
                            <div className="relative">
                                <input
                                    required
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    placeholder="e.g. Google"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('company')}`}
                                />
                                <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Source</label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('source')}`}
                            >
                                <option value="linkedin">LinkedIn</option>
                                <option value="naukri">Naukri</option>
                                <option value="indeed">Indeed</option>
                                <option value="glassdoor">Glassdoor</option>
                                <option value="wellfound">Wellfound</option>
                                <option value="company_site">Company Site</option>
                                <option value="referral_direct">Referral Direct</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {formData.source === 'other' && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Other Source</label>
                                <input
                                    name="sourceOther"
                                    value={formData.sourceOther}
                                    onChange={handleChange}
                                    placeholder="Custom source name"
                                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('sourceOther')}`}
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Link</label>
                            <div className="relative">
                                <input
                                    name="link"
                                    value={formData.link}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('link')}`}
                                />
                                <LinkIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Location</label>
                            <input
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="City, Country"
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('location')}`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Type</label>
                            <select
                                name="jobType"
                                value={formData.jobType}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('jobType')}`}
                            >
                                <option value="unknown">Unknown</option>
                                <option value="remote">Remote</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="onsite">Onsite</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Waiting Period (Days)</label>
                            <input
                                type="number"
                                name="waitingPeriod"
                                min="0"
                                value={formData.waitingPeriod}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Priority</label>
                            <div className="flex gap-2">
                                {[0, 1, 2, 3].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${formData.priority === p
                                                ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-emerald-500/10 dark:text-gray-300'
                                            }`}
                                    >
                                        {p === 0 ? 'Normal' : `${'★'.repeat(p)}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Salary Range</label>
                            <input
                                name="salaryRange"
                                value={formData.salaryRange}
                                onChange={handleChange}
                                placeholder="$120k - $160k"
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white transition-all duration-300 ${fieldClass('salaryRange')}`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tags (comma separated)</label>
                            <input
                                name="tagsInput"
                                value={formData.tagsInput}
                                onChange={handleChange}
                                placeholder="faang, ml, startup"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                id="sponsorshipRequired"
                                type="checkbox"
                                name="sponsorshipRequired"
                                checked={formData.sponsorshipRequired}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor="sponsorshipRequired" className="text-sm text-gray-700 dark:text-gray-300">Sponsorship Required</label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Job Description</label>
                            <textarea
                                name="jobDescription"
                                value={formData.jobDescription}
                                onChange={handleChange}
                                placeholder="Autofilled description appears here. You can edit it."
                                rows={6}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white resize-y transition-all duration-300 ${fieldClass('jobDescription')}`}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Outreach strategy, talking points, etc."
                                rows={3}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-emerald-500/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 dark:text-white resize-none transition-all duration-300 ${fieldClass('notes')}`}
                            />
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
                            {loading ? 'Saving...' : <><Plus size={18} /> Save Job</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
