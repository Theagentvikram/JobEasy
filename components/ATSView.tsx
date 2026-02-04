import React, { useState } from 'react';
import { FileText, Check, AlertCircle, Sparkles, Loader2, Target, BarChart, ChevronRight, User, Briefcase, Zap } from 'lucide-react';
import { analyzeResume } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { FileDragDrop } from './FileDragDrop';
import { PremiumAnalysis } from './PremiumAnalysis';

export const ATSView: React.FC<{ isPro?: boolean }> = ({ isPro = false }) => {
  console.log('DEBUG: ATSView - Received isPro:', isPro);
  const [fileData, setFileData] = useState<{ base64: string, mimeType: string, name: string } | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (base64: string, mimeType: string, name: string) => {
    setFileData({ base64, mimeType, name });
  };

  const handleAnalyze = async () => {
    if (!fileData) return;
    setIsAnalyzing(true);
    const data = await analyzeResume(fileData.base64, fileData.mimeType, jobDesc);
    setResult(data);
    setIsAnalyzing(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">ATS Compliance Scanner</h2>
        <p className="text-gray-500">Upload your existing resume to check its compatibility with hiring bots.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                Resume File
              </h3>
              {fileData && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Loaded</span>}
            </div>
            <div className="p-6">
              <FileDragDrop onFileSelect={handleFileSelect} label="Upload Resume (PDF/Img)" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-purple-500" />
                Target Job (Optional)
              </h3>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-40 p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400"
                placeholder="Paste the job description here to check for keyword matching..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>
          </div>

          {/* New Widget: Quick Skills Found (Fills empty space) */}
          {result && result.skillsDetected && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  Quick Skills Found
                </h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.skillsDetected.slice(0, 15).map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg border border-gray-200 font-medium">
                    {skill}
                  </span>
                ))}
                {result.skillsDetected.length > 15 && (
                  <span className="px-2 py-1 text-gray-400 text-xs font-medium">
                    +{result.skillsDetected.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!fileData || isAnalyzing}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg transform active:scale-[0.98]
              ${!fileData || isAnalyzing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 hover:shadow-emerald-300'}`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing Deeply...
              </>
            ) : (
              <>
                <Zap size={20} className={fileData ? "fill-white" : ""} />
                Run Deep Analysis
              </>
            )}
          </button>
        </div>


        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="h-full min-h-[500px] bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart size={32} />
              </div>
              <p className="font-medium">Upload a resume to see the analysis dashboard</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm font-bold uppercase">Overall Match</h3>
                  <div className="text-5xl font-extrabold text-emerald-600">{result.score}<span className="text-lg text-gray-400">/100</span></div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{result.candidateInfo.name}</div>
                  <div className="text-gray-500 text-sm">{result.candidateInfo.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Impact" score={result.sectionScores.impact} color="text-blue-600" bg="bg-blue-600" />
                <ScoreCard label="Brevity" score={result.sectionScores.brevity} color="text-purple-600" bg="bg-purple-600" />
                <ScoreCard label="Style" score={result.sectionScores.style} color="text-amber-600" bg="bg-amber-600" />
                <ScoreCard label="Structure" score={result.sectionScores.structure} color="text-emerald-600" bg="bg-emerald-600" />
              </div>

              {/* FREE TIER VISIBLE: Scores & basic metrics above */}

              {/* DEEP INSIGHTS (Now Free for All) */}
              <div className="relative">
                <div>
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="text-emerald-500" size={20} />
                      Executive Summary
                    </h3>
                    <p className="text-gray-600 leading-relaxed bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50">
                      {result.summary}
                    </p>
                  </div>

                  <div className="bg-gray-900 text-white rounded-3xl p-8 shadow-xl">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                      <Zap className="text-yellow-400" size={24} />
                      High Priority Improvements
                    </h3>
                    <div className="space-y-4">
                      {result.improvements.map((imp, i) => (
                        <div key={i} className="flex gap-4 items-start bg-white/10 p-4 rounded-xl border border-white/5">
                          <div className="w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-gray-200 text-sm leading-relaxed">{imp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <PremiumAnalysis result={result} isPremium={isPro} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScoreCard = ({ label, score, color, bg }: { label: string, score: number, color: string, bg: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
    <div className="text-xs text-gray-500 font-semibold uppercase mb-2">{label}</div>
    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
      <div className={`absolute top-0 left-0 h-full ${bg}`} style={{ width: `${score}%` }}></div>
    </div>
    <div className={`text-xl font-bold ${color}`}>{score}/100</div>
  </div>
);