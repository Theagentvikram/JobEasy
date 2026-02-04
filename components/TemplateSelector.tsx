import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, onCancel }) => {
  const templates = [
    {
      id: 'modern',
      name: 'Modern Emerald',
      description: 'Clean sidebar layout perfect for tech and startups.',
      color: 'bg-emerald-900',
      preview: (
         <div className="w-full h-full bg-white flex text-[4px]">
            <div className="w-1/3 bg-emerald-900 h-full p-2 space-y-2">
               <div className="w-8 h-8 rounded-full bg-emerald-700/50 mb-4"></div>
               <div className="h-1 bg-emerald-700 w-full rounded"></div>
               <div className="h-1 bg-emerald-700 w-2/3 rounded"></div>
               <div className="h-1 bg-emerald-700 w-3/4 rounded"></div>
            </div>
            <div className="w-2/3 p-2 space-y-2">
               <div className="h-2 bg-gray-800 w-1/2 rounded mb-2"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
            </div>
         </div>
      )
    },
    {
      id: 'professional',
      name: 'Classic Professional',
      description: 'Traditional layout for corporate, law, and finance.',
      color: 'bg-blue-900',
       preview: (
         <div className="w-full h-full bg-white flex flex-col items-center pt-4 px-4 text-[4px]">
            <div className="h-2 bg-gray-900 w-1/3 rounded mb-1"></div>
            <div className="h-1 bg-gray-400 w-1/4 rounded mb-3"></div>
            <div className="w-full h-px bg-gray-200 mb-2"></div>
            <div className="w-full space-y-1 mb-2">
               <div className="h-1 bg-gray-200 w-full rounded"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
            </div>
            <div className="w-full space-y-2 text-left">
               <div className="h-1.5 bg-blue-900 w-1/4 rounded"></div>
               <div className="h-1 bg-gray-200 w-full rounded"></div>
            </div>
         </div>
      )
    },
    {
      id: 'creative',
      name: 'Creative Studio',
      description: 'Bold colors and header for designers and marketers.',
      color: 'bg-purple-600',
       preview: (
         <div className="w-full h-full bg-white flex flex-col text-[4px]">
            <div className="h-1/4 bg-gradient-to-r from-purple-500 to-pink-500 w-full mb-2"></div>
            <div className="flex px-2 gap-2">
               <div className="w-1/3 space-y-1">
                  <div className="h-1 bg-pink-100 w-full rounded"></div>
                  <div className="h-1 bg-pink-100 w-full rounded"></div>
               </div>
               <div className="w-2/3 space-y-1">
                  <div className="h-1.5 bg-gray-800 w-1/2 rounded"></div>
                  <div className="h-1 bg-gray-200 w-full rounded"></div>
                  <div className="h-1 bg-gray-200 w-full rounded"></div>
                  <div className="h-1 bg-gray-200 w-full rounded"></div>
               </div>
            </div>
         </div>
      )
    },
    {
      id: 'minimalist',
      name: 'Minimalist Clean',
      description: 'Simple, elegant, and perfectly readable.',
      color: 'bg-gray-800',
       preview: (
         <div className="w-full h-full bg-white p-4 text-[4px]">
            <div className="h-2 bg-gray-900 w-1/3 rounded mb-4"></div>
            <div className="w-full border-t border-gray-900 pt-2 grid grid-cols-4 gap-2">
               <div className="col-span-1 h-1 bg-gray-400 rounded"></div>
               <div className="col-span-3 h-1 bg-gray-200 rounded"></div>
            </div>
            <div className="w-full border-t border-gray-200 pt-2 grid grid-cols-4 gap-2 mt-2">
               <div className="col-span-1 h-1 bg-gray-400 rounded"></div>
               <div className="col-span-3 space-y-1">
                  <div className="h-1 bg-gray-200 rounded w-full"></div>
                  <div className="h-1 bg-gray-200 rounded w-full"></div>
               </div>
            </div>
         </div>
      )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-fade-in">
      <button 
         onClick={onCancel}
         className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium w-fit"
      >
         <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="text-center mb-10">
         <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose your template</h2>
         <p className="text-gray-500">Select a design to start building. You can change this later.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
         {templates.map((t) => (
            <div 
               key={t.id}
               onClick={() => onSelect(t.id)}
               className="group relative cursor-pointer bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-emerald-500 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
               {/* Preview Area */}
               <div className="aspect-[210/297] bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-2 shadow-sm transform group-hover:scale-[1.02] transition-transform duration-500 origin-top">
                     {t.preview}
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                     <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">Use Template</div>
                  </div>
               </div>

               <div className="p-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                     <h3 className="font-bold text-gray-900">{t.name}</h3>
                     <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                  </div>
                  <p className="text-xs text-gray-500">{t.description}</p>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};