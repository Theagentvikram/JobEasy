import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
   LayoutDashboard,
   FileText,
   ScanSearch,
   Settings as SettingsIcon,
   Briefcase,
   Mail,
   Linkedin,
   ChevronRight,
   ChevronDown,
   ExternalLink,
   Zap,
   UploadCloud,
   MessageSquare,
   PlusCircle,
   LogOut
} from 'lucide-react';
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
}

export const Scanner: React.FC<ScannerProps> = ({ user, onLogout }) => {
   const [resumes, setResumes] = useState<Resume[]>([]);
   const [documentsOpen, setDocumentsOpen] = useState(true);
   const [isLoading, setIsLoading] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();

   const fileInputRef = React.useRef<HTMLInputElement>(null);

   // Determine Plan based on Email
   const isPro = user?.email?.toLowerCase() === 'theagentvikram@gmail.com';
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

   const handleCreateNew = () => {
      navigate('/dashboard/resumes/new');
   };

   const handleTemplateSelect = async (templateId: string) => {
      // Initialize a fresh resume with the selected template
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

      // Save immediately to create the record
      try {
         await api.post('/resumes', newResume);
         await fetchResumes();
         navigate(`/dashboard/resumes/${newResume.id}/edit`);
      } catch (e) {
         console.error("Failed to create resume", e);
         alert("Failed to create resume. Please try again.");
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
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
            const base64String = reader.result as string;
            // remove "data:application/pdf;base64," prefix for cleaner backend handling if needed
            // but our backend logic handles both.

            // FIX: Navigate to ATS Scanner instead of Resume Builder
            navigate('/dashboard/ats', {
               state: {
                  file: {
                     base64: base64String,
                     name: file.name,
                     type: file.type
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
      } catch (e) {
         console.error("Failed to create resume", e);
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
      <div className="flex h-screen bg-[#f8fafc] font-sans relative overflow-hidden">
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
            <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col z-20 transition-all duration-300">
               <div className="h-16 flex items-center px-6 border-b border-gray-100/50">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-emerald-200">
                     <Briefcase className="text-white" size={18} />
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">JobEasy</span>
               </div>

               <div className="p-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100/50 mb-6">
                     <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                        JD
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">John Doe</div>
                        <div className="text-xs text-emerald-600 font-medium truncate">Free Plan</div>
                     </div>
                     <SettingsIcon size={16} className="text-gray-400 hover:text-emerald-600 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/settings')} />
                  </div>
               </div>

               <nav className="flex-1 overflow-y-auto px-4 space-y-1">
                  <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
                  <SidebarItem icon={<ScanSearch size={18} />} label="ATS Scanner" active={location.pathname === '/dashboard/ats'} onClick={() => navigate('/dashboard/ats')} />
                  <SidebarItem icon={<FileText size={18} />} label="My Resumes" active={location.pathname === '/dashboard/resumes'} onClick={() => navigate('/dashboard/resumes')} Badge={<span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{resumes.length}</span>} />
                  <SidebarItem icon={<Briefcase size={18} />} label="Career Desk" active={location.pathname === '/dashboard/desk'} onClick={() => navigate('/dashboard/desk')} Badge={<span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">New</span>} />

                  <div className="pt-4 mt-4 border-t border-gray-100">
                     <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</div>
                     <SidebarItem icon={<UploadCloud size={18} />} label="Job Tracker" active={location.pathname === '/dashboard/tracker'} onClick={() => navigate('/dashboard/tracker')} />
                     <SidebarItem icon={<MessageSquare size={18} />} label="AI Assistant" active={location.pathname === '/dashboard/assistant'} onClick={() => navigate('/dashboard/assistant')} />
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100">
                     <SidebarItem
                        icon={<LogOut size={18} />}
                        label="Sign Out"
                        onClick={onLogout}
                        active={false}
                     />
                  </div>
               </nav>

               <div className="p-4 mt-auto">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl shadow-gray-200">
                     <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                           <Zap size={16} className="text-yellow-400" />
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
                              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                                 Welcome back, John! 👋
                              </h1>
                              <p className="text-gray-500 font-medium">You have 2 pending applications and 1 resume draft. What's the goal for today?</p>
                           </div>
                        </div>

                        {/* Hero / Action Center - Bento Grid Style */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* Main Action: ATS Scan */}
                           <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-all">
                              <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                              <div className="relative z-10">
                                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-4">
                                    <ScanSearch size={14} /> Only 2 scans left today
                                 </div>
                                 <h2 className="text-2xl font-bold text-gray-900 mb-3">Optimize your Resume</h2>
                                 <p className="text-gray-500 mb-8 max-w-md">Get an ATS score and tailored keywords for any job application. Our AI ensures you match the job description perfectly.</p>
                                 <div className="flex gap-4">
                                    <button onClick={handleUploadClick} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all">
                                       <UploadCloud size={18} /> Upload Resume
                                    </button>
                                    <input
                                       type="file"
                                       ref={fileInputRef}
                                       className="hidden"
                                       accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                       onChange={handleFileUpload}
                                    />
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                                       <Linkedin size={18} className="text-blue-600" /> Import Profile
                                    </button>
                                 </div>
                              </div>
                           </div>

                           {/* Secondary Action: Resume Builder */}
                           <div onClick={handleCreateNew} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl shadow-gray-200 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                              <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mb-10"></div>
                              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                                 <PlusCircle size={24} className="text-emerald-400" />
                              </div>
                              <h3 className="text-xl font-bold mb-2">Create New</h3>
                              <p className="text-gray-400 text-sm mb-4">Build a professional resume from scratch with AI.</p>
                              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center absolute bottom-8 right-8 group-hover:bg-emerald-400 transition-colors">
                                 <ChevronRight size={18} className="text-white" />
                              </div>
                           </div>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           <FeatureCard
                              icon={<LayoutDashboard className="text-purple-600" />}
                              title="My Resumes"
                              description="Manage your versions."
                              onClick={() => navigate('/dashboard/resumes')}
                           />
                           <FeatureCard
                              icon={<Briefcase className="text-blue-600" />}
                              title="Career Desk"
                              description="Your master profile."
                              onClick={() => navigate('/dashboard/desk')}
                           />
                           <FeatureCard
                              icon={<MessageSquare className="text-emerald-600" />}
                              title="AI Career Assistant"
                              description="Chat with AI."
                              onClick={() => navigate('/dashboard/assistant')}
                           />
                           <FeatureCard
                              icon={<UploadCloud className="text-orange-500" />}
                              title="Job Application Tracker"
                              description="Organize your job search."
                              onClick={() => navigate('/dashboard/tracker')}
                           />
                        </div>

                        {/* My Documents Section */}
                        <div>
                           <div className="flex items-center justify-between mb-6">
                              <div>
                                 <h2 className="text-2xl font-bold text-gray-900">My Documents</h2>
                              </div>
                           </div>

                           <div className="grid md:grid-cols-3 gap-6">
                              {resumes.map(resume => (
                                 <div key={resume.id} onClick={() => handleEditResume(resume.id!)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group overflow-hidden flex flex-col cursor-pointer">
                                    <div className="h-48 bg-gray-100 relative overflow-hidden group-hover:bg-emerald-50/10 transition-colors">
                                       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[210mm] transform scale-[0.45] origin-top shadow-sm select-none pointer-events-none bg-white min-h-[297mm]">
                                          <ResumePreview resume={resume} />
                                       </div>
                                       <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none"></div>
                                       <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm font-bold text-emerald-600 text-[10px] border border-emerald-100 z-10">
                                          {resume.score}
                                       </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col bg-white relative">
                                       <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{resume.title}</h3>
                                       <p className="text-xs text-gray-500 mb-4">{new Date(resume.lastModified).toLocaleDateString()}</p>

                                       <div className="mt-auto flex items-center justify-between">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                             Edit
                                          </span>
                                          <SettingsIcon size={16} className="text-gray-300 group-hover:text-gray-500" />
                                       </div>
                                    </div>
                                 </div>
                              ))}

                              <button
                                 onClick={handleCreateNew}
                                 className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all min-h-[250px]"
                              >
                                 <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                                    <PlusCircle size={24} />
                                 </div>
                                 <span className="font-semibold text-sm">Create New Document</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               } />

               <Route path="resumes/new" element={
                  <TemplateSelector onSelect={handleTemplateSelect} onCancel={() => navigate('/dashboard')} />
               } />

               <Route path="ats" element={
                  <div className="p-8 max-w-7xl mx-auto">
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <ChevronRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <ATSView isPro={isPro} />
                  </div>
               } />

               <Route path="resumes/:id/edit" element={
                  <EditorWrapper resumes={resumes} saveResume={saveResume} onBack={() => navigate('/dashboard')} />
               } />

               <Route path="resumes" element={
                  <div className="p-8 max-w-6xl mx-auto">
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <ChevronRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <h2 className="text-2xl font-bold text-gray-900 mb-6">My Resumes</h2>
                     <div className="grid md:grid-cols-3 gap-6">
                        {resumes.map(resume => (
                           <div key={resume.id} onClick={() => handleEditResume(resume.id!)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group overflow-hidden flex flex-col cursor-pointer">
                              <div className="h-48 bg-gray-100 relative overflow-hidden group-hover:bg-emerald-50/10 transition-colors">
                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[210mm] transform scale-[0.45] origin-top shadow-sm select-none pointer-events-none bg-white min-h-[297mm]">
                                    <ResumePreview resume={resume} />
                                 </div>
                                 <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none"></div>
                              </div>
                              <div className="p-5 flex-1 flex flex-col bg-white relative">
                                 <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{resume.title}</h3>
                                 <p className="text-xs text-gray-500 mb-4">{new Date(resume.lastModified).toLocaleDateString()}</p>
                              </div>
                           </div>
                        ))}
                        <button onClick={handleCreateNew} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all min-h-[250px]">
                           <PlusCircle size={24} className="mb-2" />
                           <span className="font-semibold text-sm">Create New</span>
                        </button>
                     </div>
                  </div>
               } />

               <Route path="tracker" element={
                  <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px] text-gray-400">
                     <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Briefcase size={32} className="opacity-50" />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">Job Tracker</h3>
                     <p className="max-w-md text-center text-gray-500">Track all your applications, interview stages, and offers in one place. Coming soon.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 text-emerald-600 font-semibold hover:underline">Return to Dashboard</button>
                  </div>
               } />

               <Route path="assistant" element={
                  <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px] text-gray-400">
                     <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare size={32} className="text-emerald-500" />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Career Assistant</h3>
                     <p className="max-w-md text-center text-gray-500">Your personal career coach. Chat with AI to get interview tips, negotiation advice, and more. Coming in V2.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 text-emerald-600 font-semibold hover:underline">Return to Dashboard</button>
                  </div>
               } />

               <Route path="desk" element={
                  <div className="p-8 max-w-7xl mx-auto">
                     <button onClick={() => navigate('/dashboard')} className="mb-6 text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
                        <ChevronRight size={16} className="rotate-180" /> Back to Dashboard
                     </button>
                     <CareerDesk />
                  </div>
               } />

               <Route path="desk" element={
                  <CareerDesk />
               } />

               <Route path="cover-letters" element={
                  <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[600px] text-gray-400">
                     <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Mail size={32} className="opacity-50" />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">Cover Letter Generator</h3>
                     <p className="max-w-md text-center text-gray-500">AI-generated cover letters tailored to your resume and the job description. Coming soon.</p>
                     <button onClick={() => navigate('/dashboard')} className="mt-8 text-emerald-600 font-semibold hover:underline">Return to Dashboard</button>
                  </div>
               } />

               <Route path="settings" element={<Settings />} />
               <Route path="plans" element={<Plans />} />
            </Routes>
         </main>

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

const SidebarItem = ({ icon, label, active, onClick, isExternal }: any) => (
   <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-1
      ${active
            ? 'bg-emerald-50 text-emerald-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
    `}
   >
      <div className="flex items-center gap-3">
         <span className={active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}>{icon}</span>
         <span>{label}</span>
      </div>
      {isExternal && <ExternalLink size={14} className="text-gray-400" />}
   </button>
);

const FeatureCard = ({ icon, title, description, onClick, color }: any) => (
   <div
      onClick={onClick}
      className={`p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col items-start hover:border-emerald-100`}
   >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>
         {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
   </div>
);