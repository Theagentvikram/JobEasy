import React from 'react';
import { Resume } from '../types';
import { Mail, Phone, MapPin, Linkedin, Globe, ExternalLink } from 'lucide-react';

interface ResumePreviewProps {
   resume: Resume;
   scale?: number;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ resume, scale = 1 }) => {
   const { personalInfo, summary, experience, education, skills, projects } = resume;

   // --- TEMPLATE 1: MODERN (Emerald Sidebar) ---
   if (resume.templateId === 'modern') {
      return (
         <div
            className="bg-white w-[210mm] shadow-2xl print:shadow-none print:w-full print:h-auto print:min-h-0 print:!transform-none print:!m-0 origin-top transition-all duration-300 text-gray-800 grid grid-cols-12 relative overflow-hidden"
            style={{
               transform: `scale(${scale})`,
               minHeight: '297mm',
               // Draws a dashed red line every 297mm to indicate page breaks in preview (hidden in print)
               backgroundImage: 'linear-gradient(to bottom, transparent 99.5%, #cbd5e1 99.5%, transparent 100%)',
               backgroundSize: '100% 297mm'
            }}
         >
            {/* Visual Page Number Indicator (Optional) */}
            <div className="absolute top-[297mm] left-0 w-full border-b-2 border-dashed border-red-300 opacity-50 pointer-events-none print:hidden flex justify-end pr-2 text-xs text-red-400 font-mono">Page 2 Start</div>

            {/* Left Sidebar - Stretches fully */}
            <div className="col-span-4 bg-emerald-900 text-white p-8 space-y-8 min-h-full">
               <div className="space-y-4">
                  <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs border-b border-emerald-800 pb-2">Contact</h3>
                  <div className="space-y-3 text-sm font-light text-emerald-50">
                     {personalInfo.email && <div className="flex items-center gap-2"><Mail size={12} /> <span className="truncate">{personalInfo.email}</span></div>}
                     {personalInfo.phone && <div className="flex items-center gap-2"><Phone size={12} /> <span>{personalInfo.phone}</span></div>}
                     {personalInfo.location && <div className="flex items-center gap-2"><MapPin size={12} /> <span>{personalInfo.location}</span></div>}
                     {personalInfo.linkedin && <div className="flex items-center gap-2"><Linkedin size={12} /> <span className="truncate">{personalInfo.linkedin.replace(/^https?:\/\//, '')}</span></div>}
                     {personalInfo.website && <div className="flex items-center gap-2"><Globe size={12} /> <span className="truncate">{personalInfo.website.replace(/^https?:\/\//, '')}</span></div>}
                  </div>
               </div>

               {skills.length > 0 && (
                  <div className="space-y-4">
                     <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs border-b border-emerald-800 pb-2">Skills</h3>
                     <div className="flex flex-wrap gap-2">
                        {skills.map((skill, i) => (
                           <span key={i} className="bg-emerald-800 px-2 py-1 rounded text-xs text-emerald-100">{skill}</span>
                        ))}
                     </div>
                  </div>
               )}

               {education.length > 0 && (
                  <div className="space-y-4">
                     <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs border-b border-emerald-800 pb-2">Education</h3>
                     <div className="space-y-4">
                        {education.map(edu => (
                           <div key={edu.id}>
                              <div className="font-bold text-white text-sm">{edu.school}</div>
                              <div className="text-emerald-200 text-xs">{edu.degree}</div>
                              <div className="text-emerald-400 text-xs mt-0.5">{edu.year}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* Main Content */}
            <div className="col-span-8 p-10 space-y-8">
               <div className="border-b-4 border-emerald-500 pb-6">
                  <h1 className="text-4xl font-extrabold text-gray-900 uppercase tracking-tight leading-none mb-2">{personalInfo.fullName || 'Your Name'}</h1>
                  <p className="text-xl text-emerald-600 font-medium tracking-wide">{personalInfo.title || 'Job Title'}</p>
               </div>

               {summary && (
                  <div>
                     <h3 className="text-gray-900 font-bold uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                        <div className="w-8 h-1 bg-emerald-500"></div> Profile
                     </h3>
                     <p className="text-sm leading-relaxed text-gray-600 text-justify">{summary}</p>
                  </div>
               )}

               {experience.length > 0 && (
                  <div className="print:break-inside-avoid">
                     <h3 className="text-gray-900 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                        <div className="w-8 h-1 bg-emerald-500"></div> Experience
                     </h3>
                     <div className="space-y-6">
                        {experience.map(exp => (
                           <div key={exp.id} className="relative pl-4 border-l-2 border-emerald-100">
                              <div className="flex justify-between items-baseline mb-1">
                                 <h4 className="font-bold text-gray-900 text-lg">{exp.role}</h4>
                                 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{exp.startDate} – {exp.endDate}</span>
                              </div>
                              <div className="text-sm font-semibold text-gray-500 mb-2">{exp.company}</div>
                              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{exp.description}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {projects && projects.length > 0 && (
                  <div className="print:break-inside-avoid">
                     <h3 className="text-gray-900 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                        <div className="w-8 h-1 bg-emerald-500"></div> Projects
                     </h3>
                     <div className="space-y-6">
                        {projects.map(proj => (
                           <div key={proj.id} className="relative pl-4 border-l-2 border-emerald-100">
                              <div className="flex justify-between items-baseline mb-1">
                                 <h4 className="font-bold text-gray-900 text-lg">{proj.name}</h4>
                                 {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-700">{proj.link}</a>}
                              </div>
                              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{proj.description}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   // --- TEMPLATE 2: PROFESSIONAL (Classic Blue) ---
   if (resume.templateId === 'professional') {
      return (
         <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:h-auto print:min-h-0 print:!transform-none print:!m-0 origin-top transition-all duration-300 text-gray-800 p-12" style={{ transform: `scale(${scale})` }}>
            <header className="border-b-2 border-gray-800 pb-6 mb-8 text-center">
               <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2 tracking-wide uppercase">{personalInfo.fullName || 'Your Name'}</h1>
               <p className="text-md text-gray-600 font-serif italic mb-4">{personalInfo.title}</p>
               <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {personalInfo.email && <span>{personalInfo.email}</span>}
                  {personalInfo.phone && <span className="border-l border-gray-300 pl-4">{personalInfo.phone}</span>}
                  {personalInfo.location && <span className="border-l border-gray-300 pl-4">{personalInfo.location}</span>}
                  {personalInfo.linkedin && <span className="border-l border-gray-300 pl-4">LinkedIn</span>}
               </div>
            </header>

            <div className="space-y-6">
               {summary && (
                  <section>
                     <h2 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-100 pb-1 mb-3 tracking-widest">Professional Summary</h2>
                     <p className="text-sm leading-relaxed text-gray-700 text-justify font-serif">{summary}</p>
                  </section>
               )}

               {skills.length > 0 && (
                  <section>
                     <h2 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-100 pb-1 mb-3 tracking-widest">Core Competencies</h2>
                     <div className="grid grid-cols-3 gap-y-1 gap-x-4 text-sm text-gray-700 font-serif">
                        {skills.map((skill, i) => (
                           <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-800 rounded-full"></div>
                              {skill}
                           </div>
                        ))}
                     </div>
                  </section>
               )}

               {experience.length > 0 && (
                  <section className="print:break-inside-avoid">
                     <h2 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-100 pb-1 mb-4 tracking-widest">Experience</h2>
                     <div className="space-y-5">
                        {experience.map(exp => (
                           <div key={exp.id}>
                              <div className="flex justify-between items-baseline mb-0.5">
                                 <h3 className="font-bold text-gray-900 font-serif text-md">{exp.company}</h3>
                                 <span className="text-sm text-gray-600 italic font-serif">{exp.startDate} - {exp.endDate}</span>
                              </div>
                              <div className="text-sm font-semibold text-blue-700 mb-2">{exp.role}</div>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-serif pl-1">{exp.description}</div>
                           </div>
                        ))}
                     </div>
                  </section>
               )}

               {projects && projects.length > 0 && (
                  <section className="print:break-inside-avoid">
                     <h2 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-100 pb-1 mb-4 tracking-widest">Projects</h2>
                     <div className="space-y-5">
                        {projects.map(proj => (
                           <div key={proj.id}>
                              <div className="flex justify-between items-baseline mb-0.5">
                                 <h3 className="font-bold text-gray-900 font-serif text-md">{proj.name}</h3>
                                 {proj.link && <span className="text-sm text-blue-600 italic font-serif truncate max-w-[200px]">{proj.link}</span>}
                              </div>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-serif pl-1">{proj.description}</div>
                           </div>
                        ))}
                     </div>
                  </section>
               )}

               {education.length > 0 && (
                  <section>
                     <h2 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-100 pb-1 mb-3 tracking-widest">Education</h2>
                     <div className="space-y-3">
                        {education.map(edu => (
                           <div key={edu.id} className="flex justify-between items-start">
                              <div>
                                 <div className="font-bold text-gray-900 font-serif">{edu.school}</div>
                                 <div className="text-sm text-gray-700">{edu.degree}</div>
                              </div>
                              <div className="text-sm text-gray-600 font-serif">{edu.year}</div>
                           </div>
                        ))}
                     </div>
                  </section>
               )}
            </div>
         </div>
      );
   }

   // --- TEMPLATE 3: CREATIVE (Pink/Purple) ---
   if (resume.templateId === 'creative') {
      return (
         <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:h-auto print:min-h-0 print:!transform-none print:!m-0 origin-top transition-all duration-300 text-gray-800 grid grid-cols-12" style={{ transform: `scale(${scale})` }}>
            <div className="col-span-12 h-32 bg-gradient-to-r from-purple-600 to-pink-500 p-8 flex items-end justify-between text-white">
               <div>
                  <h1 className="text-5xl font-black mb-1 tracking-tighter">{personalInfo.fullName || 'Your Name'}</h1>
                  <p className="text-xl font-medium opacity-90">{personalInfo.title}</p>
               </div>
               <div className="text-right text-xs opacity-80 font-mono space-y-1">
                  <div>{personalInfo.email}</div>
                  <div>{personalInfo.phone}</div>
                  <div>{personalInfo.location}</div>
               </div>
            </div>

            <div className="col-span-4 bg-gray-50 p-8 space-y-8 border-r border-gray-100">
               {education.length > 0 && (
                  <div>
                     <h3 className="font-black text-gray-900 text-lg mb-4">Education</h3>
                     <div className="space-y-4">
                        {education.map(edu => (
                           <div key={edu.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                              <div className="font-bold text-purple-600 text-sm">{edu.school}</div>
                              <div className="text-xs font-bold text-gray-700">{edu.degree}</div>
                              <div className="text-xs text-gray-400">{edu.year}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {skills.length > 0 && (
                  <div>
                     <h3 className="font-black text-gray-900 text-lg mb-4">Skills</h3>
                     <div className="flex flex-wrap gap-2">
                        {skills.map((skill, i) => (
                           <span key={i} className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-bold rounded-full border border-pink-100">{skill}</span>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <div className="col-span-8 p-8 space-y-8">
               {summary && (
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                     <p className="text-sm font-medium text-purple-900 leading-relaxed italic">"{summary}"</p>
                  </div>
               )}

               {experience.length > 0 && (
                  <div className="print:break-inside-avoid">
                     <h3 className="font-black text-gray-900 text-2xl mb-6 flex items-center gap-3">
                        <span className="w-2 h-8 bg-pink-500 rounded-full"></span> Experience
                     </h3>
                     <div className="space-y-8">
                        {experience.map(exp => (
                           <div key={exp.id} className="relative">
                              <div className="absolute left-0 top-1.5 w-2 h-2 bg-purple-200 rounded-full -ml-1.5"></div>
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-bold text-xl text-gray-900">{exp.role}</h4>
                                 <span className="text-xs font-black text-white bg-gray-900 px-2 py-1 rounded">{exp.startDate} - {exp.endDate}</span>
                              </div>
                              <div className="text-sm font-bold text-pink-500 mb-3 uppercase tracking-wide">{exp.company}</div>
                              <div className="text-sm text-gray-600 leading-relaxed pl-4 border-l-2 border-purple-100">{exp.description}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {projects && projects.length > 0 && (
                  <div className="print:break-inside-avoid">
                     <h3 className="font-black text-gray-900 text-2xl mb-6 flex items-center gap-3">
                        <span className="w-2 h-8 bg-purple-500 rounded-full"></span> Projects
                     </h3>
                     <div className="space-y-8">
                        {projects.map(proj => (
                           <div key={proj.id} className="relative">
                              <div className="absolute left-0 top-1.5 w-2 h-2 bg-pink-200 rounded-full -ml-1.5"></div>
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-bold text-xl text-gray-900">{proj.name}</h4>
                              </div>
                              {proj.link && <div className="text-xs text-purple-400 mb-2 truncate">{proj.link}</div>}
                              <div className="text-sm text-gray-600 leading-relaxed pl-4 border-l-2 border-pink-100">{proj.description}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   // --- DEFAULT / MINIMALIST ---
   return (
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:h-auto print:min-h-0 print:!transform-none print:!m-0 origin-top transition-all duration-300 text-gray-900 p-16 print:p-12" style={{ transform: `scale(${scale})` }}>
         <div className="text-center mb-12">
            <h1 className="text-4xl font-light uppercase tracking-[0.2em] mb-3 text-gray-900">{personalInfo.fullName || 'Your Name'}</h1>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">{personalInfo.title}</p>
            <div className="flex justify-center gap-6 text-xs text-gray-500 font-medium">
               {personalInfo.email && <span>{personalInfo.email}</span>}
               {personalInfo.phone && <span>{personalInfo.phone}</span>}
               {personalInfo.location && <span>{personalInfo.location}</span>}
            </div>
         </div>

         <div className="grid grid-cols-1 gap-10">
            {summary && (
               <div className="border-t border-gray-900 pt-6">
                  <div className="grid grid-cols-12">
                     <div className="col-span-3 text-xs font-bold uppercase tracking-widest pt-1">Profile</div>
                     <div className="col-span-9 text-sm leading-relaxed text-gray-600">{summary}</div>
                  </div>
               </div>
            )}

            {experience.length > 0 && (
               <div className="border-t border-gray-200 pt-6 print:break-inside-avoid">
                  <div className="grid grid-cols-12">
                     <div className="col-span-3 text-xs font-bold uppercase tracking-widest pt-1">Experience</div>
                     <div className="col-span-9 space-y-8">
                        {experience.map(exp => (
                           <div key={exp.id}>
                              <div className="flex justify-between mb-1">
                                 <h3 className="font-bold text-gray-900">{exp.role}</h3>
                                 <span className="text-xs text-gray-400">{exp.startDate} – {exp.endDate}</span>
                              </div>
                              <div className="text-xs font-bold uppercase text-gray-400 mb-2">{exp.company}</div>
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {projects && projects.length > 0 && (
               <div className="border-t border-gray-200 pt-6 print:break-inside-avoid">
                  <div className="grid grid-cols-12">
                     <div className="col-span-3 text-xs font-bold uppercase tracking-widest pt-1">Projects</div>
                     <div className="col-span-9 space-y-8">
                        {projects.map(proj => (
                           <div key={proj.id}>
                              <div className="flex justify-between mb-1">
                                 <h3 className="font-bold text-gray-900">{proj.name}</h3>
                                 {proj.link && <span className="text-xs text-blue-400 truncate max-w-[200px]">{proj.link}</span>}
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{proj.description}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {education.length > 0 && (
               <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-12">
                     <div className="col-span-3 text-xs font-bold uppercase tracking-widest pt-1">Education</div>
                     <div className="col-span-9 space-y-4">
                        {education.map(edu => (
                           <div key={edu.id} className="flex justify-between">
                              <div>
                                 <div className="font-bold text-gray-900">{edu.school}</div>
                                 <div className="text-sm text-gray-600">{edu.degree}</div>
                              </div>
                              <div className="text-sm text-gray-400">{edu.year}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {skills.length > 0 && (
               <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-12">
                     <div className="col-span-3 text-xs font-bold uppercase tracking-widest pt-1">Skills</div>
                     <div className="col-span-9 flex flex-wrap gap-x-6 gap-y-2">
                        {skills.map((skill, i) => (
                           <span key={i} className="text-sm text-gray-600">{skill}</span>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};