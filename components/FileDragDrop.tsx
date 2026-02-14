import React, { useCallback, useState } from 'react';
import { CloudArrowUp, FileText, CheckCircle, X, File } from '@phosphor-icons/react';

interface FileDragDropProps {
  onFileSelect: (base64: string, mimeType: string, fileName: string) => void;
  label?: string;
  compact?: boolean;
  initialFileName?: string | null;
}

export const FileDragDrop: React.FC<FileDragDropProps> = ({ onFileSelect, label = "Upload Resume", compact = false, initialFileName = null }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(initialFileName);

  React.useEffect(() => {
    if (initialFileName) {
      setFileName(initialFileName);
    }
  }, [initialFileName]);

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
          ${isDragging
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-gray-200 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700 bg-gray-50 dark:bg-emerald-950/60'}
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
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileText size={16} />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{fileName}</span>
              <button onClick={clearFile} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 z-30 relative">
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <CloudArrowUp className={isDragging ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'} size={20} />
              <span className="text-sm text-gray-500 dark:text-gray-400">{isDragging ? 'Drop it here!' : label}</span>
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
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 scale-[1.02] shadow-xl shadow-emerald-100 dark:shadow-emerald-900/30'
          : 'border-gray-200 dark:border-emerald-500/10 bg-white/60 dark:bg-emerald-950/50 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-white/80 dark:hover:bg-neutral-800/80'}
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
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{fileName}</h3>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Ready for Deep Scan</p>
          <button
            onClick={clearFile}
            className="mt-4 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mx-auto px-3 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X size={12} /> Remove file
          </button>
        </div>
      ) : (
        <div className="pointer-events-none relative z-0">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <CloudArrowUp size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Drag & Drop your Resume</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-xs mx-auto">Supported formats: PDF, PNG, JPG (Max 5MB)</p>
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white dark:bg-neutral-700 border border-gray-200 dark:border-emerald-500/10 text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm">
            or click to browse
          </div>
        </div>
      )}
    </div>
  );
};