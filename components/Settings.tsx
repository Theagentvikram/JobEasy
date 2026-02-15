import React, { useEffect, useState } from 'react';
import { User, Bell, Shield, Save, Sparkles, Loader2 } from 'lucide-react';
import api from '../services/api';

export const Settings: React.FC<{ user?: any }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'integrations'>('profile');
    const [jobspyEnabled, setJobspyEnabled] = useState<boolean>(Boolean(user?.settings?.jobspy_enabled ?? user?.jobspy_enabled ?? false));
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState('');

    const displayName = user?.displayName || 'User';
    const names = displayName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
    const email = user?.email || '';
    const initials = (firstName.substring(0, 1) + (lastName.substring(0, 1) || firstName.substring(1, 2))).toUpperCase().substring(0, 2) || 'U';

    useEffect(() => {
        setJobspyEnabled(Boolean(user?.settings?.jobspy_enabled ?? user?.jobspy_enabled ?? false));
    }, [user?.settings?.jobspy_enabled, user?.jobspy_enabled]);

    useEffect(() => {
        const loadSettings = async () => {
            setLoadingSettings(true);
            try {
                const response = await api.get('/auth/settings');
                setJobspyEnabled(Boolean(response.data?.jobspy_enabled));
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoadingSettings(false);
            }
        };
        loadSettings();
    }, []);

    const saveIntegrationSettings = async () => {
        setSavingSettings(true);
        setSettingsMessage('');
        try {
            await api.put('/auth/settings', { jobspy_enabled: jobspyEnabled });
            setSettingsMessage('Saved.');
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            setSettingsMessage(error?.response?.data?.detail || 'Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020c07] p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

                <div className="bg-white dark:bg-emerald-950/80 rounded-2xl shadow-sm border border-gray-200 dark:border-emerald-500/10 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    <div className="w-full md:w-64 border-r border-gray-100 dark:border-emerald-500/10 bg-gray-50/50 dark:bg-[#030d08]/30 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                        >
                            <User size={18} /> Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                        >
                            <Bell size={18} /> Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab('integrations')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                        >
                            <Shield size={18} /> Integrations
                        </button>
                    </div>

                    <div className="flex-1 p-8">
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 flex items-center gap-4 mb-4">
                                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                                            {initials}
                                        </div>
                                        <button className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300">Change Photo</button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">First Name</label>
                                        <input type="text" defaultValue={firstName} className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Last Name</label>
                                        <input type="text" defaultValue={lastName} className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-white" />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email Address</label>
                                        <input type="email" readOnly defaultValue={email} className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-500 dark:text-gray-500 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
                                        <Save size={18} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                                <div className="space-y-4">
                                    {['Email me when a scan is complete', 'Weekly career digest', 'Product updates and offers'].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Integrations</h2>

                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                                                <Sparkles size={18} className="text-emerald-500" />
                                                JobSpy URL Extraction
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Use JobSpy for LinkedIn job extraction. This may be slower and can fail depending on LinkedIn/network restrictions.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={loadingSettings || savingSettings}
                                            onClick={() => setJobspyEnabled(prev => !prev)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${jobspyEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'} disabled:opacity-60`}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${jobspyEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    {settingsMessage && (
                                        <span className={`text-sm ${settingsMessage === 'Saved.' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {settingsMessage}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={saveIntegrationSettings}
                                        disabled={loadingSettings || savingSettings}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Integration
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
