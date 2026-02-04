import React, { useState, useEffect } from 'react';
import { Resume, ExperienceItem, EducationItem } from '../types';
import { ArrowLeft, Save, Download, Sparkles, Plus, Trash2, ChevronDown, Wand2, Star, Briefcase, FileText, Palette, User, Mail, Phone, MapPin, Linkedin, Globe, Menu, LayoutDashboard, LogOut, GraduationCap, FolderOpen, Award, Layers } from 'lucide-react';
import { generateExperienceContent, generateProfessionalSummary } from '../services/geminiService';
import { ResumePreview } from './ResumePreview';

interface ResumeBuilderProps {
   initialResume: Resume;
   onBack: () => void;
   onSave: (resume: Resume) => void;
}

export const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ initialResume, onBack, onSave }) => {
   const [resume, setResume] = useState<Resume>(initialResume);
   const [activeSection, setActiveSection] = useState<string>('personal');
   const [isGenerating, setIsGenerating] = useState(false);
   const [jobContextOpen, setJobContextOpen] = useState(false);
   const [jobDescription, setJobDescription] = useState('');
   const [isSaving, setIsSaving] = useState(false);
   const [menuOpen, setMenuOpen] = useState(false); // Added missing state

   // Auto-save effect mock
   useEffect(() => {
      const timer = setTimeout(() => {
         onSave(resume);
      }, 5000);
      return () => clearTimeout(timer);
   }, [resume, onSave]);

   const handleDownload = () => {
      window.print();
   };

   const handleSave = () => {
      setIsSaving(true);
      onSave(resume);
      setTimeout(() => setIsSaving(false), 800);
   };

   const sections = [
      { id: 'personal', label: 'Personal Info', icon: <User size={18} /> },
      { id: 'summary', label: 'Summary', icon: <FileText size={18} /> },
      { id: 'experience', label: 'Work Experience', icon: <Briefcase size={18} /> },
      { id: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
      { id: 'projects', label: 'Projects', icon: <FolderOpen size={18} /> },
      { id: 'skills', label: 'Skills', icon: <Star size={18} /> },
      { id: 'certifications', label: 'Certifications', icon: <Award size={18} /> },
      { id: 'custom', label: 'Custom Section', icon: <Layers size={18} /> },
   ];

   // --- Handlers ---

   const updateInfo = (field: keyof typeof resume.personalInfo, value: string) => {
      setResume(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
   };

   const addExperience = () => {
      const newExp: ExperienceItem = { id: Date.now().toString(), role: '', company: '', startDate: '', endDate: '', description: '' };
      setResume(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
   };

   const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
      setResume(prev => ({
         ...prev,
         experience: prev.experience.map(e => e.id === id ? { ...e, [field]: value } : e)
      }));
   };

   const addEducation = () => {
      const newEdu: EducationItem = { id: Date.now().toString(), degree: '', school: '', year: '' };
      setResume(prev => ({ ...prev, education: [...prev.education, newEdu] }));
   };

   const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
      setResume(prev => ({
         ...prev,
         education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e)
      }));
   };

   const addProject = () => {
      const newProj = { id: Date.now().toString(), name: '', description: '', link: '' };
      setResume(prev => ({ ...prev, projects: [...(prev.projects || []), newProj] }));
   };

   const updateProject = (id: string, field: string, value: string) => {
      setResume(prev => ({
         ...prev,
         projects: (prev.projects || []).map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
   };

   const updateTemplate = () => {
      const templates = ['modern', 'professional', 'minimalist', 'creative'];
      const currentIndex = templates.indexOf(resume.templateId);
      const nextTemplate = templates[(currentIndex + 1) % templates.length];
      setResume(prev => ({ ...prev, templateId: nextTemplate }));
   };

   // --- Import from Desk Logic ---
   const handleImportFromDesk = () => {
      if (!window.confirm("This will overwrite your current resume details with data from your Career Desk. Continue?")) return;

      try {
         const deskProfile = JSON.parse(localStorage.getItem('desk_profile') || '{}');
         const deskSkills = JSON.parse(localStorage.getItem('desk_skills') || '[]');
         const deskExp = JSON.parse(localStorage.getItem('desk_experiences') || '[]');
         const deskProjects = JSON.parse(localStorage.getItem('desk_projects') || '[]');

         setResume(prev => ({
            ...prev,
            personalInfo: {
               ...prev.personalInfo,
               fullName: deskProfile.name || prev.personalInfo.fullName,
               email: deskProfile.email || prev.personalInfo.email,
               phone: deskProfile.phone || prev.personalInfo.phone,
               location: deskProfile.location || prev.personalInfo.location,
               title: deskProfile.role || prev.personalInfo.title
            },
            skills: deskSkills.length > 0 ? deskSkills : prev.skills,
            experience: Array.isArray(deskExp) ? deskExp.map((e: any) => ({
               id: e.id ? e.id.toString() : Date.now().toString(),
               role: e.role || '',
               company: e.company || '',
               startDate: e.year ? e.year.split('-')[0].trim() : '',
               endDate: e.year ? e.year.split('-')[1]?.trim() || 'Present' : '',
               description: e.description || ''
            })) : prev.experience,
            projects: Array.isArray(deskProjects) ? deskProjects.map((p: any) => ({
               id: p.id ? p.id.toString() : Date.now().toString(),
               name: p.name || '',
               description: p.description || '',
               link: p.link || ''
            })) : prev.projects
         }));
      } catch (e) {
         console.error("Failed to import from desk", e);
         alert("Failed to load data from Career Desk.");
      }
   };

   // AI Generators
   const generateBullets = async (id: string) => {
      const exp = resume.experience.find(e => e.id === id);
      if (!exp?.role) return;

      setIsGenerating(true);
      const bullets = await generateExperienceContent(exp.role, exp.company, jobDescription || exp.description);
      const formatted = bullets.map(b => `• ${b}`).join('\n');
      updateExperience(id, 'description', formatted);
      setIsGenerating(false);
   };

   const generateSummary = async () => {
      setIsGenerating(true);
      const mainRole = resume.experience[0]?.role || resume.personalInfo.title || "Professional";
      const text = await generateProfessionalSummary(mainRole, resume.skills);
      setResume(prev => ({ ...prev, summary: text || "" }));
      setIsGenerating(false);
   };

   return (
      <div className="flex flex-col h-screen bg-[#f8fafc]">
         <style>{`
            @media print {
               @page { margin: 0; size: A4 portrait; }
               body, html { height: auto !important; overflow: visible !important; }
               * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
         `}</style>

         {/* TOP HEADER */}
         <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30 shadow-sm print:hidden shrink-0 relative">
            <div className="flex items-center gap-3">
               {/* Hamburger Menu */}
               <div className="relative">
                  <button
                     onClick={() => setMenuOpen(!menuOpen)}
                     className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                  >
                     <Menu size={20} />
                  </button>

                  {menuOpen && (
                     <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                        <div className="absolute top-12 left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                           <div className="px-4 py-2 border-b border-gray-100 mb-2">
                              <div className="text-xs font-bold text-gray-400 uppercase">Menu</div>
                           </div>
                           <button onClick={onBack} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <LayoutDashboard size={16} /> Dashboard
                           </button>
                           <button onClick={onBack} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <FileText size={16} /> My Resumes
                           </button>
                           <div className="border-t border-gray-100 my-1"></div>
                           <button
                              onClick={async () => {
                                 const { auth } = await import('../firebase/config');
                                 await auth.signOut();
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                           >
                              <LogOut size={16} /> Sign Out
                           </button>
                        </div>
                     </>
                  )}
               </div>

               <div className="h-6 w-px bg-gray-200 mx-1"></div>
               <input
                  value={resume.title}
                  onChange={(e) => setResume({ ...resume, title: e.target.value })}
                  className="text-sm font-semibold text-gray-800 bg-transparent hover:bg-gray-50 p-1.5 rounded transition-colors focus:ring-2 focus:ring-emerald-500 outline-none w-48 truncate"
               />
               <span className="text-xs text-gray-400">{isSaving ? 'Saving...' : 'Saved'}</span>
            </div>

            <div className="flex items-center gap-2">
               <button
                  onClick={handleImportFromDesk}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Auto-fill from Career Desk"
               >
                  <Briefcase size={14} />
                  <span className="hidden sm:inline">Import Desk</span>
               </button>

               <button
                  onClick={updateTemplate}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 transition-all"
                  title="Cycle Template Style"
               >
                  <Palette size={14} />
                  <span className="capitalize">{resume.templateId}</span>
               </button>

               <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-600 border border-emerald-200 text-xs font-medium rounded-md hover:bg-emerald-50 transition-all"
               >
                  <Save size={14} /> Save
               </button>

               <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-sm transition-all"
               >
                  <Download size={14} /> Download PDF
               </button>
            </div>
         </div>

         {/* MAIN WORKSPACE SPLIT */}
         <div className="flex flex-1 overflow-hidden">

            {/* LEFT PANEL: EDITOR FORM */}
            <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
               {/* Sections Tab Bar */}
               <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-gray-100 bg-gray-50/50 no-scrollbar">
                  {sections.map(section => (
                     <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border
                        ${activeSection === section.id
                              ? 'bg-white text-emerald-700 border-emerald-100 shadow-sm ring-1 ring-emerald-50'
                              : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'}`}
                     >
                        {section.icon}
                        {section.label}
                     </button>
                  ))}
               </div>

               {/* Form Area */}
               <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white custom-scrollbar">

                  {/* Context Helper */}
                  <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                     <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Sparkles size={16} />
                     </div>
                     <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-800 mb-1">AI Assistant Ready</h4>
                        <p className="text-xs text-gray-500 mb-2">Paste the job description to get tailored suggestions.</p>
                        <textarea
                           value={jobDescription}
                           onChange={(e) => setJobDescription(e.target.value)}
                           placeholder="Paste job description here..."
                           className="w-full text-xs p-2 bg-white border border-blue-100 rounded-md focus:ring-1 focus:ring-blue-400 outline-none resize-none h-16"
                        />
                     </div>
                  </div>

                  <div className="space-y-6 max-w-2xl mx-auto pb-20">
                     {/* Render Form Sections */}
                     {activeSection === 'personal' && (
                        <div className="animate-fade-in space-y-4">
                           <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Personal Information</h2>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                 <label className="text-xs font-bold text-gray-500 uppercase">Target Job Title</label>
                                 <input value={resume.personalInfo.title} onChange={(e) => updateInfo('title', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                                 <input value={resume.personalInfo.fullName} onChange={(e) => updateInfo('fullName', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                 <input value={resume.personalInfo.email} onChange={(e) => updateInfo('email', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                                 <input value={resume.personalInfo.phone} onChange={(e) => updateInfo('phone', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                                 <input value={resume.personalInfo.location} onChange={(e) => updateInfo('location', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                              </div>
                              <div className="col-span-2">
                                 <label className="text-xs font-bold text-gray-500 uppercase">LinkedIn</label>
                                 <input value={resume.personalInfo.linkedin} onChange={(e) => updateInfo('linkedin', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="https://linkedin.com/in/..." />
                              </div>
                           </div>
                        </div>
                     )}

                     {activeSection === 'summary' && (
                        <div className="animate-fade-in">
                           <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Professional Summary</h2>
                           <textarea
                              value={resume.summary}
                              onChange={(e) => setResume(prev => ({ ...prev, summary: e.target.value }))}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm h-64 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                              placeholder="Experienced professional..."
                           />
                           <button onClick={generateSummary} disabled={isGenerating} className="mt-3 text-emerald-600 font-bold text-xs flex items-center gap-1 hover:underline">
                              <Sparkles size={12} /> {isGenerating ? 'Generating...' : 'Rewrite with AI'}
                           </button>
                        </div>
                     )}

                     {activeSection === 'experience' && (
                        <div className="animate-fade-in space-y-6">
                           <div className="flex justify-between items-center border-b pb-2 mb-4">
                              <h2 className="text-lg font-bold text-gray-900">Work Experience</h2>
                              <button onClick={addExperience} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100">+ Add</button>
                           </div>
                           {resume.experience.map((exp) => (
                              <div key={exp.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative group">
                                 <button onClick={() => setResume(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                 <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} placeholder="Job Title" className="col-span-2 font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                    <input value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} placeholder="Company" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                    <div className="flex gap-2">
                                       <input value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} placeholder="Start" className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                       <input value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} placeholder="End" className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                    </div>
                                 </div>
                                 <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} className="w-full p-2 text-sm border border-gray-200 rounded-lg h-24 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Description..." />
                                 <button onClick={() => generateBullets(exp.id)} disabled={!exp.role} className="mt-2 text-xs text-purple-600 font-bold flex items-center gap-1"><Wand2 size={12} /> Enhance with AI</button>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeSection === 'education' && (
                        <div className="animate-fade-in space-y-6">
                           <div className="flex justify-between items-center border-b pb-2 mb-4">
                              <h2 className="text-lg font-bold text-gray-900">Education</h2>
                              <button onClick={addEducation} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100">+ Add</button>
                           </div>
                           {resume.education.map((edu) => (
                              <div key={edu.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative group">
                                 <button onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter(e => e.id !== edu.id) }))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                 <div className="grid grid-cols-2 gap-3">
                                    <input value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} placeholder="School / University" className="col-span-2 font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                    <input value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} placeholder="Degree" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                    <input value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} placeholder="Year" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeSection === 'skills' && (
                        <div className="animate-fade-in">
                           <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Skills</h2>
                           <textarea
                              value={resume.skills.join(', ')}
                              onChange={(e) => setResume(prev => ({ ...prev, skills: e.target.value.split(', ') }))}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm h-40 focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="Java, Python, Leadership..."
                           />
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {activeSection === 'projects' && (
               <div className="animate-fade-in space-y-6">
                  <div className="flex justify-between items-center border-b pb-2 mb-4">
                     <h2 className="text-lg font-bold text-gray-900">Projects</h2>
                     <button onClick={addProject} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100">+ Add</button>
                  </div>
                  {(resume.projects || []).map((proj) => (
                     <div key={proj.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative group">
                        <button onClick={() => setResume(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== proj.id) }))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        <div className="grid grid-cols-1 gap-3 mb-3">
                           <input value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} placeholder="Project Name" className="font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1" />
                           <input value={proj.link} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} placeholder="Link (URL)" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none p-1 text-blue-500" />
                        </div>
                        <textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} className="w-full p-2 text-sm border border-gray-200 rounded-lg h-20 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Description..." />
                     </div>
                  ))}
               </div>
            )}

            {/* RIGHT PANEL: LIVE PREVIEW */}
            {/* We use flex-1 to take remaining space, and a gray background to contrast the A4 sheet */}
            <div className="w-1/2 bg-gray-200/50 h-full overflow-hidden flex flex-col justify-start items-center relative print:hidden">

               {/* Preview Container: Fixed width/height relative logic to allow accurate scaling */}
               <div className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col items-center py-8">
                  <div className="origin-top transform scale-75 xl:scale-90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-transform duration-300">
                     <ResumePreview resume={resume} />
                  </div>
               </div>

               <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-gray-500 shadow-sm border border-gray-200 pointer-events-none">
                  A4 Live Preview
               </div>
            </div>
         </div>

         {/* Hidden Print Container */}
         <div className="hidden print:block print:w-full print:m-0 print:p-0">
            <ResumePreview resume={resume} scale={1} />
         </div>

      </div>
   );
};