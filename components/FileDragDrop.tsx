import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, FileType } from 'lucide-react';

interface FileDragDropProps {
  onFileSelect: (base64: string, mimeType: string, fileName: string) => void;
  label?: string;
  compact?: boolean;
}

export const FileDragDrop: React.FC<FileDragDropProps> = ({ onFileSelect, label = "Upload Resume", compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file) return;
    
    // Validate type (PDF or Image)
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or Image file.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // result is "data:application/pdf;base64,....."
      // We need to extract the base64 part and the mime type
      const base64Data = result.split(',')[1];
      onFileSelect(base64Data, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
  };

  if (compact) {
    return (
      <div 
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer overflow-hidden
          ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 bg-gray-50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
          onChange={handleChange}
          accept=".pdf,.png,.jpg,.jpeg"
        />
        
        <div className="p-4 flex items-center justify-center gap-3">
          {fileName ? (
             <>
               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                 <FileText size={16} />
               </div>
               <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{fileName}</span>
               <button onClick={clearFile} className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 z-30 relative">
                 <X size={14} />
               </button>
             </>
          ) : (
             <>
               <UploadCloud className={isDragging ? 'text-emerald-500' : 'text-gray-400'} size={20} />
               <span className="text-sm text-gray-500">{isDragging ? 'Drop it here!' : label}</span>
             </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-64 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center group cursor-pointer
        ${isDragging 
          ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02] shadow-xl shadow-emerald-100' 
          : 'border-gray-200 bg-white/60 hover:border-emerald-400 hover:bg-white/80'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        onChange={handleChange}
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {fileName ? (
        <div className="animate-fade-in relative z-20">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{fileName}</h3>
          <p className="text-emerald-600 text-sm font-medium">Ready for Deep Scan</p>
          <button 
            onClick={clearFile}
            className="mt-4 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mx-auto px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
          >
            <X size={12} /> Remove file
          </button>
        </div>
      ) : (
        <div className="pointer-events-none relative z-0">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Drag & Drop your Resume</h3>
          <p className="text-gray-500 text-sm mb-4 max-w-xs mx-auto">Supported formats: PDF, PNG, JPG (Max 5MB)</p>
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 shadow-sm">
            or click to browse
          </div>
        </div>
      )}
    </div>
  );
};