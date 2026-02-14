import React, { useState } from 'react';
import { ArrowRight, PlayCircle, Sparkles, Lock, Loader2, CheckCircle, FileCheck } from 'lucide-react';
import { analyzeResume } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { FileDragDrop } from './FileDragDrop';

interface HeroProps {
  onStart: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickResult, setQuickResult] = useState<AnalysisResult | null>(null);
  const [fileData, setFileData] = useState<{ base64: string, mimeType: string } | null>(null);

  const handleFileSelect = (base64: string, mimeType: string, fileName: string) => {
    setFileData({ base64, mimeType });
    setQuickResult(null); // Reset prev result
  };

  const handleQuickScan = async () => {
    if (!fileData) return;
    setIsAnalyzing(true);
    // Analyze without a job description for general feedback
    const data = await analyzeResume(fileData.base64, fileData.mimeType, "");
    setQuickResult(data);
    setIsAnalyzing(false);
  };

  return (
    <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Column: Text */}
          <div className="text-center lg:text-left z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-8 tracking-wide animate-fade-in-up shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AI-POWERED CAREER COPILOT
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
              Beat the ATS.<br />
              <span className="text-emerald-600 dark:text-emerald-400">
                Land the Interview.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
              75% of resumes are rejected by bots before a human ever sees them.
              Upload your resume and get a free AI audit in seconds with JobEasy.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
              <button
                onClick={onStart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-emerald-300 dark:hover:shadow-emerald-900/50 hover:-translate-y-0.5"
              >
                Go to Dashboard
                <ArrowRight size={18} />
              </button>

              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-emerald-950/40 text-gray-700 dark:text-white border border-gray-200 dark:border-emerald-500/10 px-8 py-4 rounded-full font-semibold hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition-all duration-300 shadow-sm">
                <PlayCircle size={18} className="text-gray-400 dark:text-gray-300 group-hover:text-emerald-500" />
                Watch Demo
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Quick Scanner */}
          <div className="relative z-10 mx-auto w-full max-w-lg">
            {/* Decor elements */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400 rounded-full blur-3xl opacity-20"></div>

            <div className="bg-white/80 dark:bg-emerald-950/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-emerald-500/10 overflow-hidden transition-all duration-500 hover:shadow-emerald-900/10 dark:hover:shadow-emerald-900/20">
              <div className="p-6 border-b border-gray-100 dark:border-emerald-500/10 bg-white/50 dark:bg-[#020c07]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-gray-900 dark:text-white">Free Quick Audit</h3>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">AI Model v2.5</span>
                </div>
              </div>

              <div className="p-6">
                {!quickResult ? (
                  <>
                    <div className="mb-6">
                      <FileDragDrop onFileSelect={handleFileSelect} label="Upload Resume PDF" />
                    </div>

                    <button
                      onClick={handleQuickScan}
                      disabled={!fileData || isAnalyzing}
                      className="w-full py-4 rounded-xl font-semibold bg-gray-900 dark:bg-emerald-600 text-white hover:bg-gray-800 dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg dark:shadow-none"
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : 'Scan Resume Now'}
                    </button>
                    {fileData && !isAnalyzing && (
                      <p className="text-center text-xs text-emerald-600 mt-2 font-medium">File loaded! Click scan to proceed.</p>
                    )}
                  </>
                ) : (
                  <div className="text-center animate-fade-in">
                    <div className="mb-6">
                      <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider font-semibold">ATS Compatibility</div>
                      <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                        {quickResult.score}
                        <span className="text-2xl text-gray-300 font-medium ml-1">/100</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-emerald-950/80 rounded-xl p-5 mb-6 text-left shadow-sm border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden group cursor-pointer" onClick={onStart}>
                      <div className="flex items-center gap-3 mb-3 border-b border-gray-50 dark:border-emerald-500/10 pb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-emerald-950/40 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <FileCheck size={16} />
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 uppercase">Analysis for</div>
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{quickResult.candidateInfo?.name || "Candidate"}</div>
                        </div>
                      </div>

                      {/* Blurred Content */}
                      <div className="space-y-2 blur-[3px] opacity-70">
                        <p className="text-sm text-gray-600">Found {quickResult.skillsDetected?.length || 5} major skills...</p>
                        <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded w-1/2"></div>
                      </div>

                      {/* Unlock overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-[#020c07]/70 backdrop-blur-[2px] transition-all group-hover:bg-white/40 dark:group-hover:bg-black/40">
                        <Lock className="text-gray-900 dark:text-white mb-2" size={20} />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Login to view report</span>
                      </div>
                    </div>

                    <button
                      onClick={onStart}
                      className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                      Unlock Detailed Report
                    </button>
                    <button
                      onClick={() => { setQuickResult(null); setFileData(null); }}
                      className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Scan another resume
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Micro-trust */}
            <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-sm font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> PDF, DOCX, PNG</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> Private & Secure</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};