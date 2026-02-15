import React, { useState, useEffect, useRef } from 'react';
import { Resume } from '../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';

interface ResumePreviewProps {
   resume: Resume;
   scale?: number;
   isExport?: boolean;
}

// A4 dimensions in pixels (96 DPI approx) gives lots of room for varying screen densities
// Standard A4 is 210mm x 297mm.
const PAGE_WIDTH = '210mm';
const PAGE_HEIGHT = '297mm';

// Utility to combine main content sections into a linear list for splitting
const getFlattenedContent = (resume: Resume) => {
   const items: any[] = [];
   const { summary, experience, projects, skills, education } = resume;
   const chunk = <T,>(arr: T[], size: number) => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
         chunks.push(arr.slice(i, i + size));
      }
      return chunks;
   };
   const splitDescriptionIntoChunks = (text: string, maxChars: number = 140) => {
      const lines = text
         .split('\n')
         .map((line) => line.trim())
         .filter((line) => line.length > 0);

      const chunks: string[] = [];

      const splitSentenceByWords = (sentence: string, maxLen: number) => {
         const words = sentence.split(/\s+/).filter(Boolean);
         const out: string[] = [];
         let current = "";

         for (const word of words) {
            const next = current ? `${current} ${word}` : word;
            if (next.length > maxLen && current) {
               out.push(current);
               current = word;
            } else {
               current = next;
            }
         }

         if (current) out.push(current);
         return out;
      };

      for (const line of lines) {
         const bulletMatch = line.match(/^([•\-*])\s*/);
         const bulletPrefix = bulletMatch ? `${bulletMatch[1]} ` : "";
         const cleanLine = line.replace(/^([•\-*])\s*/, "");
         const sentencePieces = cleanLine.split(/(?<=[.!?])\s+/).filter(Boolean);
         const sourcePieces = sentencePieces.length > 0 ? sentencePieces : [cleanLine];

         let isFirstPieceForLine = true;
         for (const piece of sourcePieces) {
            const subPieces = piece.length > maxChars
               ? splitSentenceByWords(piece, maxChars)
               : [piece];

            for (const subPiece of subPieces) {
               const normalized = `${isFirstPieceForLine ? bulletPrefix : ""}${subPiece}`.trim();
               if (normalized) chunks.push(normalized);
               isFirstPieceForLine = false;
            }
         }
      }

      return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean);
   };

   // Summary
   if (summary) items.push({ type: 'summary', content: summary, id: 'summary' });

   // Experience
   if (experience.length > 0) {
      items.push({ type: 'section-title', content: 'Experience', id: 'exp-title' });
      experience.forEach(exp => {
         // Header
         items.push({ type: 'experience-header', data: exp, id: `exp-${exp.id}-header` });
         // Description Paragraphs
         if (exp.description) {
            const paras = splitDescriptionIntoChunks(exp.description);
            paras.forEach((para, i) => {
               items.push({
                  type: 'experience-para',
                  content: para,
                  id: `exp-${exp.id}-para-${i}`,
                  parentId: exp.id,
                  isLast: i === paras.length - 1 // useful for spacing
               });
            });
         }
      });
   }

   // Projects
   if (projects && projects.length > 0) {
      items.push({ type: 'section-title', content: 'Projects', id: 'proj-title' });
      projects.forEach(proj => {
         // Header
         items.push({ type: 'project-header', data: proj, id: `proj-${proj.id}-header` });
         // Description Paragraphs
         if (proj.description) {
            const paras = splitDescriptionIntoChunks(proj.description);
            paras.forEach((para, i) => {
               items.push({
                  type: 'project-para',
                  content: para,
                  id: `proj-${proj.id}-para-${i}`,
                  parentId: proj.id,
                  isLast: i === paras.length - 1
               });
            });
         }
      });
   }

   // For templates where Skills/Edu are in main column (Minimalist/Professional)
   if (resume.templateId === 'minimalist' || resume.templateId === 'professional') {
      if (education.length > 0) items.push({ type: 'section-title', content: 'Education', id: 'edu-title' });
      education.forEach(edu => items.push({ type: 'education', data: edu, id: `edu-${edu.id}` }));

      if (skills.length > 0) items.push({ type: 'section-title', content: 'Skills', id: 'skills-title' });
      if (skills.length > 0) {
         chunk(skills, 12).forEach((skillGroup, index) => {
            items.push({ type: 'skills', data: skillGroup, id: `skills-list-${index}` });
         });
      }
   }

   return items;
};

// Section Components
const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
   <div className={`break-inside-avoid ${className}`} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>{children}</div>
);

// --- RENDERERS ---
const SummaryItem = ({ content, variant }: { content: string, variant: string }) => {
   if (variant === 'modern') return (
      <Section className="mb-5">
         <h3 className="text-gray-900 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
            <div className="w-5 h-0.5 bg-emerald-500"></div> Profile
         </h3>
         <p className="text-xs leading-relaxed text-gray-600">{content}</p>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className="bg-purple-50 p-3 rounded-xl border border-purple-100 mb-5">
         <p className="text-xs font-medium text-purple-900 leading-relaxed italic">"{content}"</p>
      </Section>
   );
   // Professional/Default
   return (
      <Section className="mb-5">
         <h2 className={`text-xs font-bold ${variant === 'professional' ? 'text-blue-800 border-blue-100' : 'text-gray-900 border-gray-900'} uppercase border-b pb-1 mb-2 tracking-widest`}>
            {variant === 'professional' ? 'Professional Summary' : 'Profile'}
         </h2>
         <p className="text-xs leading-relaxed text-gray-700">{content}</p>
      </Section>
   );
}

const SectionTitle = ({ content, variant }: { content: string, variant: string }) => {
   if (variant === 'modern') return (
      <h3 className="text-gray-900 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 mt-2">
         <div className="w-5 h-0.5 bg-emerald-500"></div> {content}
      </h3>
   );
   if (variant === 'creative') return (
      <h3 className="font-black text-gray-900 text-xs mb-3 flex items-center gap-2 mt-4">
         <span className={`w-1 h-4 rounded-full ${content === 'Experience' ? 'bg-pink-500' : 'bg-purple-500'}`}></span> {content}
      </h3>
   );
   // Professional/Default
   return (
      <h2 className={`text-xs font-bold ${variant === 'professional' ? 'text-blue-800 border-blue-100' : 'text-gray-900 border-gray-200'} uppercase border-b pb-1 mb-3 tracking-widest mt-4`}>
         {content}
      </h2>
   );
}

// --- SPLIT COMPONENTS ---

const ExperienceHeader = ({ data, variant }: { data: any, variant: string }) => {
   if (variant === 'modern') return (
      <Section className="relative pl-3 border-l-2 border-emerald-100 mb-0 pb-1 pt-1 break-inside-avoid">
         <div className="flex justify-between items-baseline mb-1">
            <h4 className="font-bold text-gray-900 text-sm">{data.role}</h4>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{data.startDate} – {data.endDate}</span>
         </div>
         <div className="text-xs font-semibold text-gray-500">{data.company}</div>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className="relative mb-0 pb-1 pt-1 break-inside-avoid">
         <div className="flex justify-between items-center mb-1">
            <h4 className="font-bold text-sm text-gray-900">{data.role}</h4>
            <span className="text-xs font-black text-white bg-gray-900 px-1.5 py-0.5 rounded">{data.startDate} - {data.endDate}</span>
         </div>
         <div className="text-xs font-bold text-pink-500 uppercase tracking-wide">{data.company}</div>
      </Section>
   );
   // Professional
   return (
      <Section className="mb-0 pb-1 pt-1 break-inside-avoid">
         <div className="flex justify-between items-baseline mb-1">
            <h3 className="font-bold text-gray-900 text-sm">{variant === 'professional' ? data.company : data.role}</h3>
            <span className="text-xs text-gray-600 italic">{data.startDate} - {data.endDate}</span>
         </div>
         <div className="text-xs font-semibold text-blue-700">{variant === 'professional' ? data.role : data.company}</div>
      </Section>
   );
}

const ExperiencePara = ({ content, variant, isLast }: { content: string, variant: string, isLast?: boolean }) => {
   const marginClass = isLast ? 'mb-4' : 'mb-0 pb-1';

   if (variant === 'modern') return (
      <Section className={`relative pl-3 border-l-2 border-emerald-100 ${marginClass}`}>
         <div className="text-xs text-gray-600 leading-relaxed text-justify">{content}</div>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className={`relative pl-2 border-l border-purple-100 ${marginClass}`}>
         <div className="text-xs text-gray-600 leading-relaxed text-justify">{content}</div>
      </Section>
   );
   // Professional
   return (
      <Section className={`${marginClass}`}>
         <div className="text-xs text-gray-700 leading-relaxed text-justify">{content}</div>
      </Section>
   );
}

const ProjectHeader = ({ data, variant }: { data: any, variant: string }) => {
   if (variant === 'modern') return (
      <Section className="relative pl-3 border-l-2 border-emerald-100 mb-0 pb-1 pt-1 break-inside-avoid">
         <h4 className="font-bold text-gray-900 text-sm mb-0.5">{data.name}</h4>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-700 block break-all">{data.link}</a>}
      </Section>
   );
   if (variant === 'creative') return (
      <Section className="relative mb-0 pb-1 pt-1 break-inside-avoid">
         <h4 className="font-bold text-sm text-gray-900 mb-0.5">{data.name}</h4>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className="text-xs text-purple-500 block break-all">{data.link}</a>}
      </Section>
   );
   // Professional
   return (
      <Section className="mb-0 pb-1 pt-1 break-inside-avoid">
         <h3 className="font-bold text-gray-900 text-sm mb-0.5">{data.name}</h3>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className={`text-xs block break-all ${variant === 'professional' ? 'text-blue-600 italic' : 'text-blue-500'}`}>{data.link}</a>}
      </Section>
   );
}

const ProjectPara = ({ content, variant, isLast }: { content: string, variant: string, isLast?: boolean }) => {
   const marginClass = isLast ? 'mb-4' : 'mb-0 pb-1';

   if (variant === 'modern') return (
      <Section className={`relative pl-3 border-l-2 border-emerald-100 ${marginClass}`}>
         <div className="text-xs text-gray-600 leading-relaxed text-justify">{content}</div>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className={`relative pl-2 border-l border-pink-100 ${marginClass}`}>
         <div className="text-xs text-gray-600 leading-relaxed text-justify">{content}</div>
      </Section>
   );
   // Professional
   return (
      <Section className={`${marginClass}`}>
         <div className="text-xs text-gray-700 leading-relaxed text-justify">{content}</div>
      </Section>
   );
}

const ExperienceItem = ({ data, variant }: { data: any, variant: string }) => {
   if (variant === 'modern') return (
      <Section className="relative pl-3 border-l-2 border-emerald-100 mb-4">
         <div className="flex justify-between items-baseline mb-1">
            <h4 className="font-bold text-gray-900 text-sm">{data.role}</h4>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{data.startDate} – {data.endDate}</span>
         </div>
         <div className="text-xs font-semibold text-gray-500 mb-1">{data.company}</div>
         <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{data.description}</div>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className="relative mb-4">
         <div className="flex justify-between items-center mb-1">
            <h4 className="font-bold text-sm text-gray-900">{data.role}</h4>
            <span className="text-xs font-black text-white bg-gray-900 px-1.5 py-0.5 rounded">{data.startDate} - {data.endDate}</span>
         </div>
         <div className="text-xs font-bold text-pink-500 mb-1 uppercase tracking-wide">{data.company}</div>
         <div className="text-xs text-gray-600 leading-relaxed pl-2 border-l border-purple-100 whitespace-pre-wrap">{data.description}</div>
      </Section>
   );
   // Professional/Default
   return (
      <Section className="mb-4">
         <div className="flex justify-between items-baseline mb-1">
            <h3 className="font-bold text-gray-900 text-sm">{variant === 'professional' ? data.company : data.role}</h3>
            <span className="text-xs text-gray-600 italic">{data.startDate} - {data.endDate}</span>
         </div>
         <div className="text-xs font-semibold text-blue-700 mb-1">{variant === 'professional' ? data.role : data.company}</div>
         <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{data.description}</div>
      </Section>
   );
}

const ProjectItem = ({ data, variant }: { data: any, variant: string }) => {
   if (variant === 'modern') return (
      <Section className="relative pl-3 border-l-2 border-emerald-100 mb-4">
         <h4 className="font-bold text-gray-900 text-sm mb-0.5">{data.name}</h4>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-700 block mb-1">{data.link}</a>}
         <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{data.description}</div>
      </Section>
   );
   if (variant === 'creative') return (
      <Section className="relative mb-4">
         <h4 className="font-bold text-sm text-gray-900 mb-0.5">{data.name}</h4>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className="text-xs text-purple-500 mb-1 block">{data.link}</a>}
         <div className="text-xs text-gray-600 leading-relaxed pl-2 border-l border-pink-100 whitespace-pre-wrap">{data.description}</div>
      </Section>
   );
   // Professional/Default
   return (
      <Section className="mb-4">
         <h3 className="font-bold text-gray-900 text-sm mb-0.5">{data.name}</h3>
         {data.link && <a href={data.link} target="_blank" rel="noreferrer" className={`text-xs block mb-1 ${variant === 'professional' ? 'text-blue-600 italic' : 'text-blue-500'}`}>{data.link}</a>}
         <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{data.description}</div>
      </Section>
   );
}

const EducationEntry = ({ data, variant }: { data: any, variant: string }) => {
   if (variant === 'modern') {
      return (
         <Section className="relative pl-3 border-l-2 border-emerald-100 mb-3">
            <div className="flex justify-between items-baseline gap-2 mb-0.5">
               <div className="font-bold text-gray-900 text-sm">{data.school}</div>
               <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">{data.year}</div>
            </div>
            <div className="text-xs text-gray-600">{data.degree}</div>
         </Section>
      );
   }

   if (variant === 'creative') {
      return (
         <Section className="mb-3 p-2 rounded-lg border border-purple-100 bg-purple-50/40">
            <div className="font-bold text-gray-900 text-xs">{data.school}</div>
            <div className="text-[11px] text-purple-700 font-semibold">{data.degree}</div>
            <div className="text-[10px] text-gray-500">{data.year}</div>
         </Section>
      );
   }

   return (
      <Section className="mb-3 flex justify-between items-start gap-3">
         <div>
            <div className="font-bold text-gray-900 text-sm">{data.school}</div>
            <div className="text-xs text-gray-700">{data.degree}</div>
         </div>
         <div className="text-xs text-gray-600 whitespace-nowrap">{data.year}</div>
      </Section>
   );
}

const SkillsList = ({ data, variant }: { data: string[], variant: string }) => {
   if (variant === 'professional') {
      return (
         <Section className="grid grid-cols-3 gap-y-1 gap-x-3 text-xs text-gray-700">
            {data.map((skill, i) => (
               <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-800 rounded-full"></div>
                  {skill}
               </div>
            ))}
         </Section>
      )
   }
   return (
      <Section className="flex flex-wrap gap-x-4 gap-y-1">
         {data.map((skill, i) => (
            <span key={i} className="text-xs text-gray-600">{skill}</span>
         ))}
      </Section>
   )
}

// Utility for Sidebar content (Modern layout)
const getFlattenedSidebar = (resume: Resume) => {
   const items: any[] = [];
   const { personalInfo, skills, education } = resume;
   const chunk = <T,>(arr: T[], size: number) => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
         chunks.push(arr.slice(i, i + size));
      }
      return chunks;
   };

   // Contact (Always first, usually fits)
   items.push({ type: 'contact', data: personalInfo, id: 'sidebar-contact' });

   // Skills
   if (skills.length > 0) {
      items.push({ type: 'sidebar-title', content: 'Skills', id: 'sidebar-skills-title' });
      chunk(skills, 14).forEach((skillGroup, index) => {
         items.push({ type: 'sidebar-skills-list', data: skillGroup, id: `sidebar-skills-list-${index}` });
      });
   }

   // Education
   if (education.length > 0) {
      items.push({ type: 'sidebar-title', content: 'Education', id: 'sidebar-edu-title' });
      education.forEach(edu => items.push({ type: 'sidebar-edu-item', data: edu, id: `sidebar-edu-${edu.id}` }));
   }

   return items;
};

// Component helper for Sidebar Items
const SidebarItem: React.FC<{ item: any }> = ({ item }) => {
   switch (item.type) {
      case 'contact':
         return (
            <div className="space-y-3 mb-5">
               <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] border-b border-emerald-800 pb-2">Contact</h3>
               <div className="space-y-2 text-xs font-light text-emerald-50">
                  {item.data.email && <div className="flex items-center gap-2"><Mail size={11} /> <span className="truncate">{item.data.email}</span></div>}
                  {item.data.phone && <div className="flex items-center gap-2"><Phone size={11} /> <span>{item.data.phone}</span></div>}
                  {item.data.location && <div className="flex items-center gap-2"><MapPin size={11} /> <span>{item.data.location}</span></div>}
               </div>
            </div>
         );
      case 'sidebar-title':
         return <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] border-b border-emerald-800 pb-2 mb-3 mt-4">{item.content}</h3>;
      case 'sidebar-skills-list':
         return (
            <div className="flex flex-wrap gap-1.5 mb-5">
               {item.data.map((skill: string, i: number) => <span key={i} className="bg-emerald-800 px-2 py-0.5 rounded text-[10px] text-emerald-100">{skill}</span>)}
            </div>
         );
      case 'sidebar-edu-item':
         return (
            <div className="mb-3">
               <div className="font-bold text-white text-xs">{item.data.school}</div>
               <div className="text-emerald-200 text-[10px] bg-transparent">{item.data.degree}</div>
               <div className="text-emerald-400 text-[10px] mt-0.5">{item.data.year}</div>
            </div>
         );
      default: return null;
   }
}

// MAIN COMPONENT
export const ResumePreview: React.FC<ResumePreviewProps> = ({ resume, scale = 1, isExport = false }) => {
   const { personalInfo, skills, education } = resume;

   // Main Content Pagination
   const [mainPages, setMainPages] = useState<any[][]>([[]]);
   const measureRef = useRef<HTMLDivElement>(null);

   // Sidebar Pagination
   const [sidebarPages, setSidebarPages] = useState<any[][]>([[]]);
   const sidebarMeasureRef = useRef<HTMLDivElement>(null);

   // Extract all main content items
   const allItems = getFlattenedContent(resume);
   const sidebarItems = getFlattenedSidebar(resume);

   const getMainPageLimits = (templateId: string) => {
      if (templateId === 'modern') return { first: 930, next: 1000 };
      if (templateId === 'creative') return { first: 900, next: 1010 };
      // professional, minimalist, and default templates have larger header on page 1
      return { first: 860, next: 1000 };
   };

   const getMeasurementWidth = (templateId: string) => {
      // Main content column for templates with side structure.
      if (templateId === 'modern' || templateId === 'creative') return '135mm';
      // Full-width content templates.
      return '180mm';
   };

   const adjustMainSplit = (items: any[], start: number, splitIndex: number) => {
      // Greedy split: use maximum content that fits on page to avoid large visual gaps.
      return splitIndex;
   };

   const adjustSidebarSplit = (items: any[], start: number, splitIndex: number) => {
      let adjusted = splitIndex;
      if (adjusted >= items.length) return adjusted;
      if (adjusted > start && items[adjusted - 1]?.type === 'sidebar-title') {
         adjusted -= 1;
      }
      return adjusted;
   };

   const splitItemsIntoPages = (
      items: any[],
      heights: number[],
      firstLimit: number,
      nextLimit: number,
      margin: number,
      adjustSplit: (items: any[], start: number, splitIndex: number) => number
   ) => {
      if (items.length === 0) return [[]];

      const pages: any[][] = [];
      let cursor = 0;
      let pageNumber = 0;

      while (cursor < items.length) {
         const limit = pageNumber === 0 ? firstLimit : nextLimit;
         let usedHeight = 0;
         let splitIndex = cursor;

         for (let i = cursor; i < items.length; i += 1) {
            const itemHeight = heights[i] ?? 0;
            const extra = itemHeight + (i > cursor ? margin : 0);
            if (usedHeight + extra > limit) {
               break;
            }
            usedHeight += extra;
            splitIndex = i + 1;
         }

         // Ensure progress even if one item is taller than a page.
         if (splitIndex === cursor) {
            splitIndex = cursor + 1;
         }

         let adjusted = adjustSplit(items, cursor, splitIndex);
         if (adjusted <= cursor) {
            adjusted = cursor + 1;
         }

         pages.push(items.slice(cursor, adjusted));
         cursor = adjusted;
         pageNumber += 1;
      }

      return pages;
   };

   const getMeasuredItemHeights = (elements: HTMLElement[]) => {
      if (elements.length === 0) return [];

      const heights: number[] = [];
      for (let i = 0; i < elements.length; i += 1) {
         const current = elements[i];
         const next = elements[i + 1];

         if (next) {
            const laidOut = next.offsetTop - current.offsetTop;
            heights.push(laidOut > 0 ? laidOut : current.offsetHeight);
         } else {
            heights.push(current.offsetHeight);
         }
      }

      return heights;
   };

   // Measurement Effect - MAIN
   useEffect(() => {
      if (!measureRef.current) return;

      const container = measureRef.current;
      const children = Array.from(container.children);

      if (children.length === 0 || allItems.length === 0) {
         setMainPages([allItems]);
         return;
      }

      const heights = getMeasuredItemHeights(children as HTMLElement[]);
      const limits = getMainPageLimits(resume.templateId || 'modern');
      const pages = splitItemsIntoPages(allItems, heights, limits.first, limits.next, 0, adjustMainSplit);
      setMainPages(pages);
   }, [resume, scale, allItems.length]);

   // Measurement Effect - SIDEBAR
   useEffect(() => {
      if (!sidebarMeasureRef.current || resume.templateId !== 'modern') {
         setSidebarPages([sidebarItems]);
         return;
      }

      const container = sidebarMeasureRef.current;
      const children = Array.from(container.children);

      if (children.length === 0 || sidebarItems.length === 0) {
         setSidebarPages([sidebarItems]);
         return;
      }

      const heights = getMeasuredItemHeights(children as HTMLElement[]);
      const pages = splitItemsIntoPages(sidebarItems, heights, 980, 980, 0, adjustSidebarSplit);
      setSidebarPages(pages);
   }, [resume, scale, sidebarItems.length, resume.templateId]);

   // Common styles
   const pageWrapperClass = "resume-page bg-white shadow-2xl print:shadow-none relative transition-all duration-300 ease-in-out print:w-[210mm] print:h-[297mm] print:overflow-hidden animate-expand-in overflow-hidden";
   const pageDims = { width: PAGE_WIDTH, height: PAGE_HEIGHT };
   const pageGapClass = isExport ? "gap-0" : "gap-2";
   // Reset transform in print mode to avoid scaling issues
   const containerStyles = { transformOrigin: 'top center', animationFillMode: 'both' };
   const printStyles = `
      @media print {
         .print-container {
            transform: none !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
         }
         .resume-page {
            page-break-after: always;
            break-after: page;
         }
         .resume-page:last-child {
            page-break-after: auto;
            break-after: auto;
         }
         .print-break-before {
            break-before: page;
            page-break-before: always;
            margin-top: 0 !important;
         }
      }
   `;

   const renderItem = (item: any, variant?: string, index: number = 0, animate: boolean = false) => {
      const v = variant || resume.templateId || 'modern';
      let content = null;

      switch (item.type) {
         case 'summary': content = <SummaryItem content={item.content} variant={v} />; break;
         case 'section-title': content = <SectionTitle content={item.content} variant={v} />; break;

         // Split Experience
         case 'experience-header': content = <ExperienceHeader data={item.data} variant={v} />; break;
         case 'experience-para': content = <ExperiencePara content={item.content} variant={v} isLast={item.isLast} />; break;

         // Split Projects
         case 'project-header': content = <ProjectHeader data={item.data} variant={v} />; break;
         case 'project-para': content = <ProjectPara content={item.content} variant={v} isLast={item.isLast} />; break;

         case 'education': content = <EducationEntry data={item.data} variant={v} />; break;
         case 'skills': content = <SkillsList data={item.data} variant={v} />; break;
         default: content = null;
      }

      if (!content) return null;

      if (animate) {
         return (
            <div
               key={`${item.id}-${v}`}
               className="animate-fade-in"
               style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'both' }}
            >
               {content}
            </div>
         );
      }

      return <React.Fragment key={item.id}>{content}</React.Fragment>;
   };

   return (
      <>
         <style>{printStyles}</style>
         <div
            className={`flex flex-col ${pageGapClass} origin-top transition-all duration-300 print-container print:gap-0`}
            style={{ ...containerStyles, transform: `scale(${scale})` }}
         >

            {/* HIDDEN MEASUREMENT CONTAINER - MAIN */}
            <div
               ref={measureRef}
               className="absolute invisible pointer-events-none text-gray-900"
               style={{ left: '-9999px', width: getMeasurementWidth(resume.templateId || 'modern') }}
            >
               {allItems.map(item => renderItem(item, resume.templateId))}
            </div>

            {/* HIDDEN MEASUREMENT CONTAINER - SIDEBAR */}
            <div ref={sidebarMeasureRef} className="absolute invisible w-[70mm] pointer-events-none" style={{ left: '-9999px' }}>
               {sidebarItems.map((item, i) => <SidebarItem key={i} item={item} />)}
            </div>

            {Array.from({
               length: Math.max(
                  mainPages.length,
                  resume.templateId === 'modern' ? sidebarPages.length : mainPages.length
               )
            }).map((_, pageIndex) => {
               const pageItems = mainPages[pageIndex] || [];
               const pageSidebar = sidebarPages[pageIndex] || [];
               const isFirstPage = pageIndex === 0;
               const pageLabel = `Page ${pageIndex + 1}`;

               return (
                  <div
                     key={`page-${resume.templateId}-${pageIndex}`}
                     className={`${pageWrapperClass} ${isFirstPage ? '' : 'print-break-before'}`.trim()}
                     style={pageDims}
                  >
                     <div className="absolute top-2 right-2 text-[10px] text-gray-300 font-mono print:hidden">{pageLabel}</div>

                     {resume.templateId === 'modern' && (
                        <div className="grid grid-cols-12 min-h-[297mm]">
                           <div className="col-span-4 bg-emerald-900 text-white p-8 space-y-5">
                              {pageSidebar.map((item, i) => <SidebarItem key={`${pageIndex}-sidebar-${i}`} item={item} />)}
                           </div>
                           <div className={`col-span-8 ${isFirstPage ? 'p-10' : 'p-10 pt-10'}`}>
                              {isFirstPage && (
                                 <div className="border-b-4 border-emerald-500 pb-4 mb-5">
                                    <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight leading-none mb-1">{personalInfo.fullName}</h1>
                                    <p className="text-sm text-emerald-600 font-medium tracking-wide">{personalInfo.title}</p>
                                 </div>
                              )}
                              {pageItems.map((item, i) => renderItem(item, 'modern', i, true))}
                           </div>
                        </div>
                     )}

                     {(resume.templateId === 'professional' || resume.templateId === 'minimalist' || !resume.templateId) && (
                        <div className={isFirstPage ? "p-12 h-full" : "p-10 pt-16"}>
                           {isFirstPage && (
                              <header className="border-b-2 border-gray-800 pb-4 mb-6 text-center">
                                 <h1 className="text-2xl font-serif font-bold text-gray-900 mb-1 tracking-wide uppercase">{personalInfo.fullName}</h1>
                                 <p className="text-sm text-gray-600 font-serif italic mb-3">{personalInfo.title}</p>
                                 <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 font-medium uppercase tracking-wider">
                                    {personalInfo.email && <span>{personalInfo.email}</span>}
                                    {personalInfo.phone && <span className="border-l border-gray-300 pl-4">{personalInfo.phone}</span>}
                                 </div>
                              </header>
                           )}
                           <div>
                              {pageItems.map((item, i) => renderItem(item, resume.templateId || 'professional', i, true))}
                           </div>
                        </div>
                     )}

                     {resume.templateId === 'creative' && (
                        <div className="h-full">
                           {isFirstPage && (
                              <div className="h-20 bg-gradient-to-r from-purple-600 to-pink-500 p-5 flex items-end justify-between text-white">
                                 <div>
                                    <h1 className="text-2xl font-black mb-0.5 tracking-tighter">{personalInfo.fullName}</h1>
                                    <p className="text-sm font-medium opacity-90">{personalInfo.title}</p>
                                 </div>
                                 <div className="text-right text-xs opacity-80 font-mono space-y-0.5">
                                    <div>{personalInfo.email}</div>
                                    <div>{personalInfo.phone}</div>
                                 </div>
                              </div>
                           )}
                           <div className="grid grid-cols-12 h-full">
                              <div className={`col-span-4 bg-gray-50 border-r border-gray-100 ${isFirstPage ? 'p-5 space-y-5' : ''}`}>
                                 {isFirstPage && (
                                    <>
                                       {education.length > 0 && (
                                          <Section>
                                             <h3 className="font-black text-gray-900 text-xs mb-2">Education</h3>
                                             <div className="space-y-2">
                                                {education.map(edu => (
                                                   <div key={edu.id} className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                                      <div className="font-bold text-purple-600 text-xs">{edu.school}</div>
                                                      <div className="text-[10px] font-bold text-gray-700">{edu.degree}</div>
                                                      <div className="text-[9px] text-gray-400">{edu.year}</div>
                                                   </div>
                                                ))}
                                             </div>
                                          </Section>
                                       )}
                                       {skills.length > 0 && (
                                          <Section>
                                             <h3 className="font-black text-gray-900 text-xs mb-2">Skills</h3>
                                             <div className="flex flex-wrap gap-1">
                                                {skills.map((skill, i) => <span key={i} className="px-1.5 py-0.5 bg-pink-50 text-pink-600 text-[9px] font-bold rounded-full border border-pink-100">{skill}</span>)}
                                             </div>
                                          </Section>
                                       )}
                                    </>
                                 )}
                              </div>
                              <div className={`col-span-8 ${isFirstPage ? 'p-5' : 'p-5 pt-10'}`}>
                                 {pageItems.map((item, i) => renderItem(item, 'creative', i, true))}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </>
   );
};
