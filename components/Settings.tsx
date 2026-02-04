import React, { useState } from 'react';
import { User, Bell, Shield, Moon, Save } from 'lucide-react';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 border-r border-gray-100 bg-gray-50/50 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
                        >
                            <User size={18} /> Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
                        >
                            <Bell size={18} /> Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
                        >
                            <Shield size={18} /> Security
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8">
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 flex items-center gap-4 mb-4">
                                        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                                            JD
                                        </div>
                                        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Change Photo</button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">First Name</label>
                                        <input type="text" defaultValue="John" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Last Name</label>
                                        <input type="text" defaultValue="Doe" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Email Address</label>
                                        <input type="email" defaultValue="john.doe@example.com" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-100 flex justify-end">
                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
                                        <Save size={18} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                                <div className="space-y-4">
                                    {['Email me when a scan is complete', 'Weekly career digest', 'Product updates and offers'].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-gray-700 font-medium">{item}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
