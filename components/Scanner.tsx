import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
   SquaresFour,
   FileText,
   Scan,
   Gear,
   Briefcase,
   Envelope,
   LinkedinLogo,
   CaretRight,
   CaretDown,
   ArrowSquareOut,
   Lightning,
   CloudArrowUp,
   ChatCircle,
   PlusCircle,
   SignOut,
   Moon,
   Sun,
   Trash,
   FolderSimple,
   UserCircle,
   Robot,
   MapTrifold
} from '@phosphor-icons/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { ATSView } from './ATSView';
import { ResumeBuilder } from './ResumeBuilder';
import { ResumePreview } from './ResumePreview';
import { TemplateSelector } from './TemplateSelector';
import { Particles } from './ui/particles';
import { CareerDesk } from './CareerDesk';
import { Settings } from './Settings';
import { Plans } from './Plans';
import { Resume } from '../types';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';

interface ScannerProps {
   user: any; // User from Firebase
   onLogout: () => void;
   requestRefresh?: () => void; // Function to refresh user profile from parent
}

export const Scanner: React.FC<ScannerProps> = ({ user, onLogout, requestRefresh }) => {
   const [resumes, setResumes] = useState<Resume[]>([]);
   const [documentsOpen, setDocumentsOpen] = useState(true);
   const [isLoading, setIsLoading] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();
   const { theme, toggleTheme } = useTheme();

   const fileInputRef = React.useRef<HTMLInputElement>(null);

   // Determine Plan based on 'plan' field from backend, or fallback to email check if legacy
   // Also check for 'plan' === 'pro'
   const isPro = user?.plan === 'pro' || user?.email?.toLowerCase() === 'theagentvikram@gmail.com';
   console.log('DEBUG: Scanner - User:', user, 'Calculated isPro:', isPro);

   const planName = isPro ? 'Pro Plan' : 'Free Plan';
   const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
   const userInitials = userName.substring(0, 2).toUpperCase();

   useEffect(() => {
      fetchResumes();
   }, []);

   const fetchResumes = async () => {
      try {
         const response = await api.get<Resume[]>('/resumes');
         setResumes(response.data);
      } catch (error) {
         console.error("Failed to fetch resumes:", error);
      }
   };

   const saveResume = async (resume: Resume) => {
      try {
         if (resumes.some(r => r.id === resume.id)) {
            await api.put(`/resumes/${resume.id}`, resume);
         } else {
            await api.post('/resumes', resume);
         }
         fetchResumes(); // Refresh list
      } catch (error) {
         console.error("Failed to save resume:", error);
      }
   };

   const importInputRef = React.useRef<HTMLInputElement>(null);

   const handleImportClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      importInputRef.current?.click();
   };

   const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
         // Upload to Firebase Storage
         const storageRef = ref(storage, `resumes/${user.uid}/${Date.now()}_${file.name}`);
         await uploadBytes(storageRef, file);
         const downloadURL = await getDownloadURL(storageRef);

         // Read file as Base64 for legacy parser fallback (if needed)
         const reader = new FileReader();
         reader.readAsDataURL(file);

         reader.onload = async () => {
            const base64String = reader.result as string;

            try {
               const response = await api.post<Resume>('/resumes/parse', {
                  file_content: base64String,
                  file_url: downloadURL
               });

               const importedResume = response.data;

               // Fetch updated list and navigate
               await fetchResumes();

               // Navigate to editor with the new resume loaded
               navigate(`/dashboard/resumes/${importedResume.id}/edit`);

            } catch (error: any) {
               console.error("Backend parsing failed:", error);
               if (error.response?.status === 403) {
                  alert("Free limit reached (2 resumes). Please upgrade to Pro.");
               } else {
                  alert("Failed to analyze resume. Please try again.");
               }
            } finally {
               setIsLoading(false);
            }
         };

         reader.onerror = () => {
            console.error("File reading failed");
            alert("Failed to read file.");
            setIsLoading(false);
         };

      } catch (error) {
         console.error("Error uploading/importing resume:", error);
         alert("Failed to upload file.");
         setIsLoading(false);
      }
   };

   const handleCreateNew = () => {
      navigate('/dashboard/resumes/new');
   };

   const handleTemplateSelect = async (templateId: string) => {
      const newResume: Resume = {
         id: Date.now().toString(),
         templateId,
         title: 'Untitled Resume',
         lastModified: new Date().toISOString(),
         score: 0,
         personalInfo: { fullName: 'Your Name', email: '', phone: '', location: '', linkedin: '', website: '', title: 'Job Title' },
         summary: '',
         experience: [],
         education: [],
         skills: [],
         projects: [],
         certifications: [],
         awards: [],
         achievements: [],
         publications: [],
         references: [],
         volunteering: [],
         custom: [],
         userId: 'temp-user'
      };

      try {
         await api.post('/resumes', newResume);
         await fetchResumes();
         navigate(`/dashboard/resumes/${newResume.id}/edit`);
      } catch (e: any) {
         console.error("Failed to create resume", e);
         if (e.response?.status === 403) {
            alert("Free limit reached (2 resumes). Please upgrade to Pro.");
         } else {
            alert("Failed to create resume. Please try again.");
         }
      }
   };

   const handleUploadClick = () => {
      fileInputRef.current?.click();
   };

   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
         // Upload to Firebase Storage
         const storageRef = ref(storage, `ats_scans/${user.uid}/${Date.now()}_${file.name}`);
         await uploadBytes(storageRef, file);
         const downloadURL = await getDownloadURL(storageRef);

         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
            const base64String = reader.result as string;
            navigate('/dashboard/ats', {
               state: {
                  file: {
                     base64: base64String,
                     name: file.name,
                     type: file.type,
                     url: downloadURL
                  }
               }
            });
            setIsLoading(false);
         };
      } catch (error) {
         console.error("Error parsing resume:", error);
         alert("Failed to parse resume. Please try again.");
         setIsLoading(false);
      }
   };

   const handleEditResume = (id: string) => {
      navigate(`/dashboard/resumes/${id}/edit`);
   };

   // Helper function to create an empty resume for the builder
   const createEmptyResume = (): Resume => ({
      id: Date.now().toString(),
      templateId: 'modern', // Default template
      title: 'New Resume',
      lastModified: new Date().toISOString(),
      score: 0,
      personalInfo: { fullName: 'Your Name', email: '', phone: '', location: '', linkedin: '', website: '', title: 'Job Title' },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      awards: [],
      achievements: [],
      publications: [],
      references: [],
      volunteering: [],
      custom: [],
      userId: 'temp-user'
   });

   // Function to save a newly created resume
   const saveNewResume = async (resume: Resume) => {
      try {
         const { default: api } = await import('../services/api');
         await api.post('/resumes', resume);
         await fetchResumes();
         navigate(`/dashboard/resumes/${resume.id}/edit`);
      } catch (e: any) {
         console.error("Failed to create resume", e);
         if (e.response?.status === 403) {
            alert("Free limit reached (2 resumes). Please upgrade to Pro.");
         } else {
            alert("Failed to create resume. Please try again.");
         }
      }
   };

   // Function to update an existing resume
   const updateResume = async (resume: Resume) => {
      try {
         const { default: api } = await import('../services/api');
         await api.put(`/resumes/${resume.id}`, resume);
         await fetchResumes();
      } catch (e) {
         console.error("Failed to update resume", e);
      }
   };

   return (
      <div className="flex h-screen bg-[#f8fafc] dark:bg-[#020c07] font-sans relative overflow-hidden transition-colors duration-300">
         <Particles
            className="absolute inset-0 z-0 pointer-events-none"
            quantity={100}
            staticity={50}
            ease={50}
            color="#10b981" // emerald-500
            refresh
         />

         {/* SIDEBAR - JobEasy Style (Hidden in Builder Mode) */}
         {!location.pathname.includes('/edit') && (
            <aside className="w-64 bg-white/90 dark:bg-[#020c07]/95 backdrop-blur-xl border-r border-gray-200/60 dark:border-emerald-500/10 flex flex-col z-20 transition-all duration-300">
               <div className="h-16 flex items-center px-6 border-b border-gray-100/50 dark:border-emerald-500/10">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-emerald-200 dark:shadow-none">
                     <Briefcase className="text-white" size={18} />
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">JobEasy</span>
               </div>

               <div className="p-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-[#051510] dark:to-[#030d08] rounded-xl border border-emerald-100/50 dark:border-emerald-500/10 mb-6">
                     <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold border-2 border-white dark:border-emerald-500/10 shadow-sm">
                        {userInitials}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">{planName}</div>
                     </div>
                     <Gear size={16} className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/settings')} />
                  </div>
               </div>

               <nav className="flex-1 overflow-y-auto px-4 space-y-1">
                  <SidebarItem icon={<SquaresFour size={18} />} label="Dashboard" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
                  <SidebarItem icon={<Scan size={18} />} label="ATS Scanner" active={location.pathname === '/dashboard/ats'} onClick={() => navigate('/dashboard/ats')} />
                  <SidebarItem icon={<FileText size={18} />} label="My Resumes" active={location.pathname === '/dashboard/resumes'} onClick={() => navigate('/dashboard/resumes')} Badge={<span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{resumes.length}</span>} />
                  <SidebarItem icon={<Briefcase size={18} />} label="Career Desk" active={location.pathname === '/dashboard/desk'} onClick={() => navigate('/dashboard/desk')} Badge={<span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">New</span>} />

                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-emerald-500/10">
                     <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</div>
                     <SidebarItem icon={<CloudArrowUp size={18} />} label="Job Tracker" active={location.pathname === '/dashboard/tracker'} onClick={() => navigate('/dashboard/tracker')} />
                     <SidebarItem icon={<ChatCircle size={18} />} label="AI Assistant" active={location.pathname === '/dashboard/assistant'} onClick={() => navigate('/dashboard/assistant')} />
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-emerald-500/10">
                     <SidebarItem
                        icon={<SignOut size={18} />}
                        label="Sign Out"
                        onClick={onLogout}
                        active={false}
                     />

                     <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group mt-1"
                     >
                        <div className="flex items-center gap-3">
                           <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                           </span>
                           <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                     </button>
                  </div>
               </nav>

               <div className="p-4 mt-auto">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#051510] dark:to-black text-white shadow-xl shadow-gray-200 dark:shadow-none border border-transparent dark:border-emerald-500/10">
                     <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                           <Lightning size={16} className="text-yellow-400" weight="fill" />
                        </div>
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</span>
                     </div>
                     <h4 className="font-bold text-sm mb-1">Unlock Premium</h4>
                     <p className="text-xs text-gray-400 mb-3">Get detailed reports & unlimited AI scans.</p>
                     <button onClick={() => navigate('/dashboard/plans')} className="w-full py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors">
                        View Plans
                     </button>
                  </div>
               </div>
            </aside>
         )}

         {/* MAIN CONTENT AREA */}
         <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">

            {/* ROUTES */}
            <Routes>
               <Route path="/" element={
                  <div className="p-8 relative z-10">
                     <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
                        {/* Welcome Header */}
                        <div className="flex justify-between items-end">
                           <div>
                              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                                 Welcome back, John! 👋
                              </h1>
                              <p className="text-gray-500 dark:text-gray-400 font-medium">You have 2 pending applications and 1 resume draft. What's the goal for today?</p>
                           </div>
                        </div>

                        {/* Hero / Action Center - Bento Grid Style */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* Main Action: ATS Scan */}
                           <div className="md:col-span-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-white/30 dark:border-emerald-500/[0.08] relative overflow-hidden group hover:border-emerald-200/60 dark:hover:border-emerald-500/20 transition-all">
                              <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                              <div className="relative z-10">
                                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-4">
                                    <Scan size={14} /> Only 2 scans left today
                                 </div>
                                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">ATS Scanner</h2>
                                 <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Get an ATS score and tailored keywords for any job application. Our AI ensures you match the job description perfectly.</p>
                                 <div className="flex gap-4">
                                    <button onClick={handleUploadClick} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all">
                                       <Scan size={18} /> Scan for ATS
                                    </button>
                                    <input
                                       type="file"
                                       ref={fileInputRef}
                                       className="hidden"
                                       accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                       onChange={handleFileUpload}
                                    />
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-emerald-950/40 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-emerald-500/10 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                                       <LinkedinLogo size={18} className="text-blue-600" /> Import Profile
                                    </button>
                                 </div>
                              </div>
                           </div>

                           {/* Secondary Action: Resume Builder */}
                           <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#051510] dark:to-[#020c07] rounded-2xl p-8 text-white shadow-xl shadow-gray-200 dark:shadow-none border border-transparent dark:border-emerald-500/10 relative overflow-hidden group flex flex-col justify-between">
                              <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none"></div>

                              <div>
                                 <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                                    <PlusCircle size={24} className="text-emerald-400" />
                                 </div>
                                 <h3 className="text-xl font-bold mb-2">Create New</h3>
                                 <p className="text-gray-400 text-sm mb-6">Build a professional resume from scratch or import existing.</p>
                              </div>

                              <div className="flex gap-3 relative z-10">
                                 <button
                                    onClick={handleCreateNew}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold transition-colors"
                                 >
                                    From Scratch
                                 </button>
                                 <button
                                    onClick={handleImportClick}
                                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                 >
                                    <CloudArrowUp size={14} /> Import
                                 </button>
                                 <input
                                    type="file"
                                    ref={importInputRef}
                                    className="hidden"
                                    accept=".pdf,.docx,.doc"
                                    onChange={handleImportFile}
                                 />
                              </div>
                           </div>
                        </div >

                        {/* Feature Cards */}
                        < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" >
                           <FeatureCard
                              icon={<FolderSimple className="text-purple-500" size={24} weight="duotone" />}
                              title="My Resumes"
                              description="Manage your versions."
                              onClick={() => navigate('/dashboard/resumes')}
                           />
                           <FeatureCard
                              icon={<UserCircle className="text-blue-500" size={24} weight="duotone" />}
                              title="Career Desk"
                              description="Your master profile."
                              onClick={() => navigate('/dashboard/desk')}
                           />
                           <FeatureCard
                              icon={<Robot className="text-emerald-500" size={24} weight="duotone" />}
                              title="AI Career Assistant"
                              description="Chat with AI."
                              onClick={() => navigate('/dashboard/assistant')}
                           />
                           <FeatureCard
                              icon={<MapTrifold className="text-amber-500" size={24} weight="duotone" />}
                              title="Job Application Tracker"
                              description="Organize your job search."
                              onClick={() => navigate('/dashboard/tracker')}
                           />
                        </div >

                        {/* My Documents Section */}
                        < div >
                           <div className="flex items-center justify-between mb-6">
                              <div>
                                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Documents</h2>
                              </div>
                           </div>

                           <div className="grid md:grid-cols-3 gap-6">
                              {resumes.map(resume => (
                                 <div key={resume.id} onClick={() => handleEditResume(resume.id!)} className="bg-white dark:bg-emerald-950/80 rounded-2xl border border-gray-100 dark:border-emerald-500/10 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-900 transition-all group overflow-hidden flex flex-col cursor-pointer">
                                    <div className="h-48 bg-gray-100 dark:bg-[#030d08] relative overflow-hidden group-hover:bg-emerald-50/10 dark:group-hover:bg-emerald-900/10 transition-colors">
                                       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[210mm] transform scale-[0.45] origin-top shadow-sm select-none pointer-events-none bg-white min-h-[297mm]">
                                          <ResumePreview resume={resume} />
                                       </div>
                                       <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none"></div>
                                       <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm font-bold text-emerald-600 text-[10px] border border-emerald-100 z-10">
                                          {resume.score}
                                       </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col bg-white dark:bg-neutral-900 relative">
                                       <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{resume.title}</h3>
                                       <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{new Date(resume.lastModified).toLocaleDateString()}</p>

                                       <div className="mt-auto flex items-center justify-between">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                             Edit
                                          </span>
                                          <Gear size={16} className="text-gray-300 group-hover:text-gray-500" />
                                       </div>
                                    </div>
                                 </div>
                              ))}

                              <button
                                 onClick={handleCreateNew}
                                 className="border-2 border-dashed border-gray-200 dark:border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all min-h-[250px]"
                              >
                                 <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-emerald-500/10 flex items-center justify-center mb-3 shadow-sm">
                                    <PlusCircle size={24} />
                                 </div>
                                 <span className="font-semibold text-sm">Create New Document</span>
                              </button>
                           </div>
                        </div >
                     </div >
                  </div >
               } />

               < Route path="resumes/new" element={
                  < TemplateSelector onSelect={handleTemplateSelect} onCancel={() => navigate('/dashboard')} />
               } />

               < Route path="ats" element={
                  < div className="p-8 max-w-7xl mx-auto" >
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <CaretRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <ATSView isPro={isPro} user={user} />
                  </div >
               } />

               < Route path="resumes/:id/edit" element={
                  < EditorWrapper resumes={resumes} saveResume={saveResume} onBack={() => navigate('/dashboard')} />
               } />

               < Route path="resumes" element={
                  < div className="p-8 max-w-6xl mx-auto" >
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <CaretRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Resumes</h2>
                     <div className="grid md:grid-cols-3 gap-6">
                        {resumes.map(resume => (
                           <div key={resume.id} onClick={() => handleEditResume(resume.id!)} className="bg-white dark:bg-emerald-950/80 rounded-2xl border border-gray-100 dark:border-emerald-500/10 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-900 transition-all group overflow-hidden flex flex-col cursor-pointer">
                              <div className="h-48 bg-gray-100 dark:bg-[#030d08] relative overflow-hidden group-hover:bg-emerald-50/10 dark:group-hover:bg-emerald-900/10 transition-colors">
                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[210mm] transform scale-[0.45] origin-top shadow-sm select-none pointer-events-none bg-white min-h-[297mm]">
                                    <ResumePreview resume={resume} />
                                 </div>
                                 <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none"></div>
                              </div>
                              <div className="p-5 flex-1 flex flex-col bg-white dark:bg-neutral-900 relative">
                                 <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{resume.title}</h3>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{new Date(resume.lastModified).toLocaleDateString()}</p>
                              </div>
                           </div>
                        ))}
                        <button onClick={handleCreateNew} className="border-2 border-dashed border-gray-200 dark:border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all min-h-[250px]">
                           <PlusCircle size={24} className="mb-2" />
                           <span className="font-semibold text-sm">Create New</span>
                        </button>
                     </div>
                  </div >
               } />

               < Route path="tracker" element={
                  < div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px]" >
                     <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30 border border-blue-200/50 dark:border-blue-500/20 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/5">
                        <Briefcase size={40} className="text-blue-500 dark:text-blue-400" weight="duotone" />
                     </div>
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 mb-4">Coming Soon</span>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Job Tracker</h3>
                     <p className="max-w-md text-center text-gray-500 dark:text-gray-400 leading-relaxed">Track all your applications, interview stages, and offers in one beautifully organized workspace.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 px-6 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-emerald-500/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm">Return to Dashboard</button>
                  </div >
               } />

               < Route path="assistant" element={
                  < div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px]" >
                     <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30 border border-purple-200/50 dark:border-purple-500/20 flex items-center justify-center mb-8 shadow-lg shadow-purple-500/10 dark:shadow-purple-500/5">
                        <ChatCircle size={40} className="text-purple-500 dark:text-purple-400" weight="duotone" />
                     </div>
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800 mb-4">Coming in V2</span>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">AI Career Assistant</h3>
                     <p className="max-w-md text-center text-gray-500 dark:text-gray-400 leading-relaxed">Your personal AI career coach. Get interview tips, salary negotiation advice, and personalized career guidance.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 px-6 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-emerald-500/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all shadow-sm">Return to Dashboard</button>
                  </div >
               } />
               < Route path="desk" element={
                  < div className="p-8 max-w-7xl mx-auto" >
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <CaretRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <CareerDesk user={user} />
                  </div >
               } />

               < Route path="cover-letters" element={
                  < div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px]" >
                     <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center mb-8 shadow-lg shadow-amber-500/10 dark:shadow-amber-500/5">
                        <Envelope size={40} className="text-amber-500 dark:text-amber-400" weight="duotone" />
                     </div>
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 mb-4">Coming Soon</span>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Cover Letter Generator</h3>
                     <p className="max-w-md text-center text-gray-500 dark:text-gray-400 leading-relaxed">AI-generated cover letters tailored to your resume and the specific job description. Stand out from the crowd.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 px-6 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-emerald-500/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400 transition-all shadow-sm">Return to Dashboard</button>
                  </div >
               } />
               < Route path="settings" element={< Settings user={user} />} />
               < Route path="plans" element={< Plans isPro={isPro} onUpgradeSuccess={requestRefresh} />} />
            </Routes >
         </main >

      </div >
   );
};

// Helper component to resolve resume from URL
const EditorWrapper = ({ resumes, saveResume, onBack }: { resumes: Resume[], saveResume: (r: Resume) => void, onBack: () => void }) => {
   const { id } = useParams();
   const resume = resumes.find(r => r.id === id);

   if (!resume) {
      if (resumes.length === 0) return <div>Loading...</div>; // Simple loading state
      return <div>Resume not found.</div>;
   }

   return (
      <div className="h-full flex flex-col">
         <ResumeBuilder
            initialResume={resume}
            onBack={onBack}
            onSave={saveResume}
         />
      </div>
   );
};

const SidebarItem = ({ icon, label, active, onClick, isExternal, Badge }: any) => (
   <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-1
      ${active
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}
    `}
   >
      <div className="flex items-center gap-3">
         <span className={active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'}>{icon}</span>
         <span>{label}</span>
      </div>
      {Badge}
      {isExternal && <ArrowSquareOut size={14} className="text-gray-400" />}
   </button>
);

const FeatureCard = ({ icon, title, description, onClick, color, hoverColor }: any) => (
   <div
      onClick={onClick}
      className={`relative p-6 rounded-2xl border border-gray-200 dark:border-emerald-500/[0.08] cursor-pointer group flex flex-col items-start overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none dark:backdrop-blur-xl hover:border-emerald-200 dark:hover:border-emerald-500/20`}
   >
      {/* Glass shine on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/10 group-hover:via-transparent group-hover:to-transparent transition-all duration-500 pointer-events-none" />
      {/* Glow blob */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${hoverColor || 'bg-emerald-400'}`} />

      <div className={`relative z-10 w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${color} ring-1 ring-white/10 group-hover:ring-emerald-500/20 transition-all duration-300 group-hover:shadow-lg`}>
         {icon}
      </div>
      <h3 className="relative z-10 text-[15px] font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">{title}</h3>
      <p className="relative z-10 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>

      {/* Subtle arrow indicator */}
      <div className="relative z-10 mt-auto pt-4 flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-all duration-300">
         <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">Open</span>
         <CaretRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 delay-75" />
      </div>
   </div>
);