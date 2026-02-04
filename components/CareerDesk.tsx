import React, { useState, useEffect } from 'react';
import { User, Briefcase, Code, Award, Edit2, Plus, Save, X, ExternalLink, Trash2, MapPin, Mail, Phone } from 'lucide-react';

// --- Types ---
interface Profile {
    name: string;
    role: string;
    email: string;
    phone: string;
    location: string;
}

interface Experience {
    id: number;
    role: string;
    company: string;
    year: string;
    description: string;
}

interface Project {
    id: number;
    name: string;
    tech: string;
    description: string;
    link: string;
}

// --- Main Component ---
export const CareerDesk: React.FC = () => {
    // --- State with Persistence ---
    const [profile, setProfile] = useState<Profile>(() => {
        const saved = localStorage.getItem('desk_profile');
        return saved ? JSON.parse(saved) : {
            name: "Abhinay Cherupally",
            role: "Senior Full Stack Engineer",
            email: "cherupallyabhi@gmail.com",
            phone: "+91 98765 43210",
            location: "Hyderabad, India"
        };
    });

    const [skills, setSkills] = useState<string[]>(() => {
        const saved = localStorage.getItem('desk_skills');
        return saved ? JSON.parse(saved) : ["React", "TypeScript", "Python", "Node.js", "AWS", "Docker"];
    });

    const [experiences, setExperiences] = useState<Experience[]>(() => {
        const saved = localStorage.getItem('desk_experiences');
        return saved ? JSON.parse(saved) : [
            { id: 1, role: "Senior Developer", company: "TechCorp", year: "2022 - Present", description: "Leading frontend architecture." },
            { id: 2, role: "Software Engineer", company: "StartupInc", year: "2020 - 2022", description: "Built MVP from scratch." }
        ];
    });

    const [projects, setProjects] = useState<Project[]>(() => {
        const saved = localStorage.getItem('desk_projects');
        return saved ? JSON.parse(saved) : [
            { id: 1, name: "Project Alpha", tech: "Next.js • Tailwind", description: "E-commerce dashboard.", link: "#" }
        ];
    });

    // --- Persistence Effects ---
    useEffect(() => { localStorage.setItem('desk_profile', JSON.stringify(profile)); }, [profile]);
    useEffect(() => { localStorage.setItem('desk_skills', JSON.stringify(skills)); }, [skills]);
    useEffect(() => { localStorage.setItem('desk_experiences', JSON.stringify(experiences)); }, [experiences]);
    useEffect(() => { localStorage.setItem('desk_projects', JSON.stringify(projects)); }, [projects]);

    const [newSkill, setNewSkill] = useState("");

    // Modal States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isAddingExp, setIsAddingExp] = useState(false);
    const [isAddingProject, setIsAddingProject] = useState(false);

    // Temp State for Forms
    const [tempProfile, setTempProfile] = useState<Profile>(profile);
    const [tempExp, setTempExp] = useState<Partial<Experience>>({});
    const [tempProject, setTempProject] = useState<Partial<Project>>({});


    // --- Handlers ---

    // Profile
    const handleSaveProfile = () => {
        setProfile(tempProfile);
        setIsEditingProfile(false);
    };

    // Skills
    const handleAddSkill = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSkill.trim()) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    // Experience
    const handleSaveExperience = () => {
        if (tempExp.role && tempExp.company) {
            const newExp = {
                id: Date.now(),
                role: tempExp.role,
                company: tempExp.company,
                year: tempExp.year || "",
                description: tempExp.description || ""
            } as Experience;
            setExperiences([newExp, ...experiences]); // Add to top
            setIsAddingExp(false);
            setTempExp({});
        }
    };

    const deleteExperience = (id: number) => {
        setExperiences(experiences.filter(e => e.id !== id));
    };

    // Projects
    const handleSaveProject = () => {
        if (tempProject.name) {
            const newProj = {
                id: Date.now(),
                name: tempProject.name,
                tech: tempProject.tech || "",
                description: tempProject.description || "",
                link: tempProject.link || ""
            } as Project;
            setProjects([...projects, newProj]);
            setIsAddingProject(false);
            setTempProject({});
        }
    };


    return (
        <div className="min-h-screen bg-[#e2e8f0] p-8 font-sans overflow-hidden relative selection:bg-emerald-200">
            <div className="absolute inset-0 z-0 bg-repeat opacity-50" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 h-full">

                {/* Header */}
                <div className="md:col-span-12 flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">My Career Desk</h1>
                        <p className="text-slate-500 font-medium ml-1">Master Profile & Assets</p>
                    </div>
                </div>

                {/* LEFT COL */}
                <div className="md:col-span-4 space-y-8">

                    {/* ID Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-300/50 p-6 border border-slate-200 relative transform hover:rotate-1 transition-transform duration-300 w-full max-w-sm mx-auto md:mx-0 group">
                        {/* Lanyard Hole */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-full z-10"></div>

                        <button
                            onClick={() => { setTempProfile(profile); setIsEditingProfile(true); }}
                            className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit2 size={16} />
                        </button>

                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full mb-4 shadow-inner flex items-center justify-center text-white">
                                <User size={48} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                            <p className="text-emerald-600 font-medium mb-4">{profile.role}</p>

                            <div className="w-full text-left space-y-3 text-sm text-gray-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                                    <Mail size={14} className="text-slate-400" /> {profile.email}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> {profile.phone}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-400" /> {profile.location}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Notes (Skills) */}
                    <div className="relative">
                        <div className="bg-yellow-100 p-6 rounded-sm shadow-lg shadow-yellow-500/10 transform -rotate-1 hover:rotate-0 transition-transform duration-300 min-h-[350px] flex flex-col">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-200/50 -rotate-1 backdrop-blur-sm"></div>

                            <h3 className="font-handwriting text-2xl text-yellow-800 font-bold mb-4">Skills Inventory</h3>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {skills.map((skill, i) => (
                                    <span key={i} className="group relative font-handwriting text-lg text-slate-700 bg-yellow-200/50 px-2 py-0.5 rounded cursor-default">
                                        #{skill}
                                        <button onClick={() => removeSkill(skill)} className="ml-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <form onSubmit={handleAddSkill} className="mt-auto">
                                <div className="flex items-center border-b-2 border-yellow-300 pb-1">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        placeholder="Add a new skill..."
                                        className="bg-transparent border-none outline-none w-full font-handwriting text-lg text-slate-700 placeholder:text-yellow-700/40"
                                    />
                                    <button type="submit" className="text-yellow-700 hover:text-yellow-900">
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* MIDDLE/RIGHT COL */}
                <div className="md:col-span-8 space-y-8">

                    {/* Projects Screen */}
                    <div className="bg-slate-900 rounded-3xl p-1 shadow-2xl shadow-slate-900/20">
                        <div className="bg-slate-800 rounded-[20px] p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                                <h3 className="text-slate-100 font-bold flex items-center gap-2">
                                    <Code size={20} className="text-cyan-400" />
                                    Project Portfolio
                                </h3>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {projects.map((proj) => (
                                    <div key={proj.id} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 hover:border-cyan-500/50 hover:bg-slate-700 transition-all cursor-pointer group relative">
                                        <button className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="h-24 bg-slate-900/50 rounded-lg mb-3 flex items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-colors">
                                            <ExternalLink size={24} />
                                        </div>
                                        <div className="font-bold text-slate-200 truncate">{proj.name}</div>
                                        <div className="text-xs text-slate-400 truncate">{proj.tech}</div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setIsAddingProject(true)}
                                    className="bg-slate-800/50 border-2 border-dashed border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all min-h-[160px]"
                                >
                                    <Plus size={32} className="mb-2" />
                                    <span className="text-sm font-medium">Add Project</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Experience Folder */}
                    <div className="relative pt-6">
                        <div className="absolute top-0 left-0 w-40 h-10 bg-amber-200 rounded-t-xl border-l border-t border-r border-amber-300/50 shadow-sm z-0 flex items-center justify-center font-bold text-amber-800/70 text-sm tracking-wider uppercase">
                            Experience
                        </div>

                        <div className="bg-[#fdfbf6] rounded-b-xl rounded-tr-xl shadow-xl border border-l-4 border-amber-100 border-l-amber-300 p-8 relative z-10 min-h-[400px]">
                            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '100% 32px', marginTop: '32px' }}></div>
                            <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-red-300/30 z-0"></div>

                            <div className="relative z-10 space-y-6 pl-12">
                                {experiences.map((exp) => (
                                    <div key={exp.id} className="group relative">
                                        <div className="absolute -left-16 top-1 w-3 h-3 bg-slate-400 rounded-full border-2 border-white shadow-sm group-hover:bg-emerald-500 group-hover:scale-125 transition-all"></div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800">{exp.role} <span className="text-slate-400 font-normal">at</span> {exp.company}</h4>
                                                <div className="text-sm text-slate-500 font-medium mb-1">{exp.year}</div>
                                            </div>
                                            <button onClick={() => deleteExperience(exp.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed font-handwriting text-lg">{exp.description}</p>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setIsAddingExp(true)}
                                    className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-medium transition-colors pl-0"
                                >
                                    <Plus size={18} /> Add New Experience
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- MODALS --- */}

            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md m-4">
                        <h3 className="text-xl font-bold mb-4">Edit Profile Card</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                                <input type="text" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Role / Title</label>
                                <input type="text" value={tempProfile.role} onChange={e => setTempProfile({ ...tempProfile, role: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                <input type="text" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                                <input type="text" value={tempProfile.phone} onChange={e => setTempProfile({ ...tempProfile, phone: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                                <input type="text" value={tempProfile.location} onChange={e => setTempProfile({ ...tempProfile, location: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-gray-500 font-medium">Cancel</button>
                            <button onClick={handleSaveProfile} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Save Badge</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Experience Modal */}
            {isAddingExp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4">
                        <h3 className="text-xl font-bold mb-4">Add Experience</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                                    <input type="text" placeholder="e.g. Senior Dev" value={tempExp.role || ''} onChange={e => setTempExp({ ...tempExp, role: e.target.value })} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Company</label>
                                    <input type="text" placeholder="e.g. Google" value={tempExp.company || ''} onChange={e => setTempExp({ ...tempExp, company: e.target.value })} className="w-full p-2 border rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                                <input type="text" placeholder="e.g. 2022 - Present" value={tempExp.year || ''} onChange={e => setTempExp({ ...tempExp, year: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                <textarea placeholder="Briefly describe what you did..." value={tempExp.description || ''} onChange={e => setTempExp({ ...tempExp, description: e.target.value })} className="w-full p-2 border rounded-lg h-24" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddingExp(false)} className="px-4 py-2 text-gray-500 font-medium">Cancel</button>
                            <button onClick={handleSaveExperience} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600">Add to Folder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Project Modal */}
            {isAddingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4">
                        <h3 className="text-xl font-bold mb-4">New Project</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
                                <input type="text" value={tempProject.name || ''} onChange={e => setTempProject({ ...tempProject, name: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Tech Stack</label>
                                <input type="text" placeholder="e.g. React • Python" value={tempProject.tech || ''} onChange={e => setTempProject({ ...tempProject, tech: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddingProject(false)} className="px-4 py-2 text-gray-500 font-medium">Cancel</button>
                            <button onClick={handleSaveProject} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700">Add Project</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
