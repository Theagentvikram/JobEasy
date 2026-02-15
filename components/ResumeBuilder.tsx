import React, { useState, useEffect } from 'react';
import { Resume, ExperienceItem, EducationItem } from '../types';
import { ArrowLeft, Save, Download, Sparkles, Plus, Trash2, ChevronDown, Wand2, Star, Briefcase, FileText, Palette, User, Mail, Phone, MapPin, Linkedin, Globe, LayoutDashboard, LogOut, GraduationCap, FolderOpen, Award, Layers, CheckCircle, ChevronUp } from 'lucide-react';
import { generateExperienceContent, generateProfessionalSummary } from '../services/geminiService';
import { ResumePreview } from './ResumePreview';
import { ResumeAudit } from './ResumeAudit';
import { auditResume } from '../utils/resumeAudit';
import api from '../services/api';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ResumeBuilderProps {
   initialResume: Resume;
   onBack: () => void;
   onSave: (resume: Resume) => void;
}

export const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ initialResume, onBack, onSave }) => {
   const [resume, setResume] = useState<Resume>(initialResume);
   const [activeSection, setActiveSection] = useState<string | null>('personal'); // Allow null for all collapsed
   const [isGenerating, setIsGenerating] = useState(false);
   const [jobDescription, setJobDescription] = useState('');
   const [isSaving, setIsSaving] = useState(false);
   const [menuOpen, setMenuOpen] = useState(false);
   const [isDownloading, setIsDownloading] = useState(false);

   const [aiAuditResults, setAiAuditResults] = useState<any>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);

   // Auto-save effect
   useEffect(() => {
      const timer = setTimeout(() => {
         onSave(resume);
      }, 5000);
      return () => clearTimeout(timer);
   }, [resume, onSave]);

   const handleDownload = async () => {
      setIsDownloading(true);

      // Wait for multi-page layout + measurement effects to settle.
      await new Promise(resolve => setTimeout(resolve, 2000));

      const element = document.getElementById('resume-preview-content');

      if (!element) {
         console.error("Resume preview element not found");
         alert("Error: Could not find resume element.");
         setIsDownloading(false);
         return;
      }

      try {
         const opt = {
            margin: 0,
            filename: `${resume.title || 'Resume'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
               scale: 2,
               useCORS: true,
               logging: false,
               scrollX: 0,
               scrollY: 0,
               windowWidth: element.scrollWidth,
               windowHeight: element.scrollHeight
            },
            pagebreak: {
               mode: ['css', 'legacy'],
               before: '.print-break-before'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true }
         };

         await html2pdf().set(opt).from(element).save();
      } catch (error) {
         console.error("Download failed", error);
         alert("Download failed. Please try print option.");
      } finally {
         setIsDownloading(false);
      }
   };

   // Fallback for Safari/Mobile if needed
   const handlePrint = () => {
      window.print();
   };

   const handleSave = () => {
      setIsSaving(true);
      onSave(resume);
      setTimeout(() => setIsSaving(false), 800);
   };

   const sections = [
      { id: 'personal', label: 'Personal Information', icon: <User size={18} /> },
      { id: 'summary', label: 'Summary', icon: <FileText size={18} /> },
      { id: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
      { id: 'experience', label: 'Work Experience', icon: <Briefcase size={18} /> },
      { id: 'projects', label: 'Projects', icon: <FolderOpen size={18} /> },
      { id: 'skills', label: 'Skills', icon: <Star size={18} /> },
      { id: 'certifications', label: 'Certifications', icon: <Award size={18} /> },
      // { id: 'custom', label: 'Custom Section', icon: <Layers size={18} /> },
      { id: 'review', label: 'Review & Audit', icon: <CheckCircle size={18} /> },
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

   const handleImportFromDesk = async () => {
      if (!window.confirm("This will overwrite your current resume details with data from your Career Desk. Continue?")) return;

      try {
         const response = await api.get('/user/desk');
         const data = response.data || {};
         const deskProfile = data.profile || {};
         const deskSkills = Array.isArray(data.skills) ? data.skills : [];
         const deskExp = Array.isArray(data.experiences) ? data.experiences : [];
         const deskProjects = Array.isArray(data.projects) ? data.projects : [];

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
         alert("Failed to load data from Career Desk cloud storage.");
      }
   };

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

   // --- Audit Handler ---
   const runAudit = async () => {
      if (aiAuditResults) return;
      setIsAnalyzing(true);
      try {
         const resumeText = JSON.stringify(resume, null, 2);
         const response = await api.post('/ai/analyze', {
            resume_text: resumeText,
            job_description: jobDescription || "General Professional Context"
         });
         setAiAuditResults(response.data);
      } catch (error) {
         console.error("Audit failed", error);
         alert("Failed to run AI audit. Please try again.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   useEffect(() => {
      if (activeSection === 'review') {
         runAudit();
      }
   }, [activeSection]);


   const toggleSection = (id: string) => {
      setActiveSection(current => current === id ? null : id);
   };

   return (
      <div className="flex flex-col h-screen bg-[#f8fafc] dark:bg-[#020c07] transition-colors duration-300">
         <style>{`
            @media print {
               @page { margin: 0; size: A4 portrait; }
               body, html { height: auto !important; overflow: visible !important; }
               * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
         `}</style>

         {/* DASHBOARD HEADER */}
         <div className="h-16 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-emerald-500/10 flex items-center justify-between px-4 z-30 shadow-sm print:hidden shrink-0 relative transition-colors duration-300">
            <div className="flex items-center gap-3">
               <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-black rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft size={20} />
               </button>
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Builder</span>
                  <input
                     value={resume.title}
                     onChange={(e) => setResume({ ...resume, title: e.target.value })}
                     className="text-sm font-bold text-gray-900 dark:text-white bg-transparent outline-none w-48 truncate"
                  />
               </div>
            </div>

            <div className="flex items-center gap-2">
               <div className="hidden md:flex items-center text-xs text-gray-400 mr-2">
                  {isSaving ? 'Saving changes...' : 'All changes saved'}
               </div>
               <button
                  onClick={handleImportFromDesk}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100"
               >
                  <Briefcase size={14} /> Import Desk
               </button>
               <div className="h-6 w-px bg-gray-200 mx-1"></div>
               <button
                  onClick={updateTemplate}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-emerald-950/40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-emerald-500/10 text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
               >
                  <Palette size={14} /> {resume.templateId}
               </button>
               <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
               >
                  {isDownloading ? <Sparkles size={14} className="animate-spin" /> : <Download size={14} />}
                  {isDownloading ? 'Processing...' : 'Download PDF'}
               </button>
            </div>
         </div>

         <div className="flex flex-1 overflow-hidden">

            {/* LEFT PANEL: VERTICAL ACCORDION EDITOR */}
            <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-emerald-500/10 bg-[#f8fafc] dark:bg-black z-10 overflow-hidden transition-colors duration-300">

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                  {/* Context Helper */}
                  <div className="mb-6 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-emerald-500/10 shadow-sm transition-colors duration-300">
                     <div className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-bold text-sm">
                        <Sparkles size={16} className="text-emerald-500" />
                        Add the job description for accurate suggestions...
                     </div>

                     <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste job description here..."
                        className="w-full text-xs p-3 bg-gray-50 dark:bg-emerald-950/40 border border-gray-200 dark:border-emerald-500/10 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-12 transition-all focus:h-24 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                     />
                  </div>

                  <div className="space-y-3 pb-20">
                     {sections.map(section => (
                        <div key={section.id} className="bg-white dark:bg-emerald-950/80 rounded-xl border border-gray-200 dark:border-emerald-500/10 shadow-sm overflow-hidden transition-all duration-300">
                           <button
                              onClick={() => toggleSection(section.id)}
                              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${activeSection === section.id ? 'bg-gray-50 dark:bg-slate-800' : ''}`}
                           >
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg ${activeSection === section.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-black text-gray-500 dark:text-gray-400'}`}>
                                    {section.icon}
                                 </div>
                                 <span className="font-bold text-sm text-gray-800 dark:text-white">{section.label}</span>
                              </div>
                              {activeSection === section.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                           </button>

                           {activeSection === section.id && (
                              <div className="p-4 border-t border-gray-100 dark:border-emerald-500/10 animate-slide-down">
                                 {/* Personal Info */}
                                 {section.id === 'personal' && (
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="col-span-2">
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Target Job Title</label>
                                          <input value={resume.personalInfo.title} onChange={(e) => updateInfo('title', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-emerald-950/40 border border-gray-200 dark:border-emerald-500/10 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                       </div>
                                       <div>
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Full Name</label>
                                          <input value={resume.personalInfo.fullName} onChange={(e) => updateInfo('fullName', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                       </div>
                                       <div>
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email</label>
                                          <input value={resume.personalInfo.email} onChange={(e) => updateInfo('email', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                       </div>
                                       <div>
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Phone</label>
                                          <input value={resume.personalInfo.phone} onChange={(e) => updateInfo('phone', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                       </div>
                                       <div>
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Location</label>
                                          <input value={resume.personalInfo.location} onChange={(e) => updateInfo('location', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                       </div>
                                       <div className="col-span-2">
                                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">LinkedIn</label>
                                          <input value={resume.personalInfo.linkedin} onChange={(e) => updateInfo('linkedin', e.target.value)} className="w-full p-2.5 mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="https://linkedin.com/in/..." />
                                       </div>
                                    </div>
                                 )}

                                 {/* Summary */}
                                 {section.id === 'summary' && (
                                    <>
                                       <textarea
                                          value={resume.summary}
                                          onChange={(e) => setResume(prev => ({ ...prev, summary: e.target.value }))}
                                          className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm h-64 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed text-gray-900 dark:text-white"
                                          placeholder="Experienced professional..."
                                       />
                                       <div className="flex justify-end mt-2">
                                          <button onClick={generateSummary} disabled={isGenerating} className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                                             <Sparkles size={14} /> {isGenerating ? 'Generating...' : 'Rewrite with AI'}
                                          </button>
                                       </div>
                                    </>
                                 )}

                                 {/* Experience */}
                                 {section.id === 'experience' && (
                                    <div className="space-y-6">
                                       <div className="flex justify-end">
                                          <button onClick={addExperience} className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm"><Plus size={14} /> Add Position</button>
                                       </div>
                                       {resume.experience.map((exp) => (
                                          <div key={exp.id} className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl relative group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                             <button onClick={() => setResume(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                             <div className="grid grid-cols-2 gap-3 mb-3">
                                                <input value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} placeholder="Job Title" className="col-span-2 font-bold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                <input value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} placeholder="Company" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                <div className="flex gap-2">
                                                   <input value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} placeholder="Start" className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                   <input value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} placeholder="End" className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                </div>
                                             </div>
                                             <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} className="w-full p-3 text-sm border border-gray-200 dark:border-slate-700 rounded-lg h-32 focus:ring-1 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white" placeholder="Description..." />
                                             <button onClick={() => generateBullets(exp.id)} disabled={!exp.role} className="mt-2 text-xs text-purple-600 font-bold flex items-center gap-1 hover:text-purple-700"><Wand2 size={12} /> Enhance with AI</button>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 {/* Education */}
                                 {section.id === 'education' && (
                                    <div className="space-y-6">
                                       <div className="flex justify-end">
                                          <button onClick={addEducation} className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm"><Plus size={14} /> Add Education</button>
                                       </div>
                                       {resume.education.map((edu) => (
                                          <div key={edu.id} className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl relative group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                             <button onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter(e => e.id !== edu.id) }))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                             <div className="grid grid-cols-2 gap-3">
                                                <input value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} placeholder="School / University" className="col-span-2 font-bold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                <input value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} placeholder="Degree" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                <input value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} placeholder="Year" className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 {/* Projects */}
                                 {section.id === 'projects' && (
                                    <div className="space-y-6">
                                       <div className="flex justify-end">
                                          <button onClick={addProject} className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm"><Plus size={14} /> Add Project</button>
                                       </div>
                                       {(resume.projects || []).map((proj) => (
                                          <div key={proj.id} className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl relative group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                             <button onClick={() => {
                                                const newProjs = (resume.projects || []).filter(p => p.id !== proj.id);
                                                setResume(prev => ({ ...prev, projects: newProjs }));
                                             }} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} />
                                             </button>
                                             <div className="grid grid-cols-1 gap-3 mb-3">
                                                <input value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} placeholder="Project Name" className="w-full font-bold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                                <input value={proj.link} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} placeholder="Link (URL)" className="w-full text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-emerald-500 outline-none p-1 text-blue-500 dark:text-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                             </div>
                                             <textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg h-24 focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-gray-900 dark:text-white" placeholder="Description..." />
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 {/* Skills */}
                                 {section.id === 'skills' && (
                                    <>
                                       <textarea
                                          value={resume.skills.join(', ')}
                                          onChange={(e) => setResume(prev => ({ ...prev, skills: e.target.value.split(', ') }))}
                                          className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm h-40 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                                          placeholder="Java, Python, Leadership (comma separated)..."
                                       />
                                    </>
                                 )}

                                 {/* Certifications (Just a placeholder for now as it was in original list but not implemented) */}
                                 {section.id === 'certifications' && (
                                    <div className="text-sm text-gray-500 italic p-4 text-center">
                                       Certifications section coming soon...
                                    </div>
                                 )}


                                 {/* Review & Audit */}
                                 {section.id === 'review' && (
                                    <ResumeAudit
                                       auditResult={auditResume(resume)}
                                       aiAudit={aiAuditResults}
                                       isAnalyzing={isAnalyzing}
                                       onFix={(issue) => console.log("Fixing", issue)}
                                    />
                                 )}
                              </div>
                           )}
                        </div>
                     ))}
                  </div>

               </div>
            </div>

            {/* RIGHT PANEL: LIVE PREVIEW */}
            <div className="w-1/2 bg-gray-200/50 dark:bg-gray-900 h-full overflow-hidden flex flex-col justify-start items-center relative print:hidden transition-colors duration-300">
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

         {/* Hidden Print Container - made visible during download for html2canvas to capture it properly */}
         <div
            id="resume-preview-content"
            className={isDownloading
               ? "absolute top-0 left-0 z-[9999] bg-white w-auto h-auto" // Visible High-Z for capture, natural flow
               : "absolute left-[-9999px] top-0 print:static print:visible" // Hidden normally
            }
         >
            <div style={{ width: '210mm', minHeight: '297mm', background: 'white' }}>
               <ResumePreview resume={resume} scale={1} isExport />
            </div>
         </div>

      </div>
   );
};
