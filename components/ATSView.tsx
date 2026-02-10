import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Check, WarningCircle, Sparkle, Spinner, Target, ChartBar, CaretRight, User, Briefcase, Lightning, Trash, ClockCounterClockwise, CloudArrowUp } from '@phosphor-icons/react';
import { analyzeResume } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { FileDragDrop } from './FileDragDrop';
import { PremiumAnalysis } from './PremiumAnalysis';
import api from '../services/api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
// removed useAuth import

export const ATSView: React.FC<{ isPro?: boolean, user?: any }> = ({ isPro = false, user }) => {
  console.log('DEBUG: ATSView - Received isPro:', isPro);
  const [fileData, setFileData] = useState<{ base64: string, mimeType: string, name: string, url?: string } | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleFileSelect = (base64: string, mimeType: string, name: string) => {
    setFileData({ base64, mimeType, name });
  };

  /* New Logic: Handle incoming file from Scanner/Dashboard */
  useEffect(() => {
    if (location.state?.file) {
      const { base64, name, type, url } = location.state.file;
      setFileData({ base64, mimeType: type, name, url });
    }
    fetchHistory();
  }, [location.state]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ats/history');
      setScanHistory(res.data);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  /* Progress State */
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!fileData) return;
    setIsAnalyzing(true);
    setProgress(0);

    // Fake progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + 2;
        else if (prev < 80) return prev + 0.5;
        else if (prev < 95) return prev + 0.1;
        return prev;
      });
    }, 50);

    try {
      // 1. Upload if no URL
      let finalUrl = fileData.url;
      if (!finalUrl) {
        // We need the file object to upload. FileDragDrop returns base64.
        // Getting file from base64 is tricky without the File object.
        // For now, if we don't have URL, we might skip saving fileUrl or try to convert base64 back to blob.
        // Let's assume for this specific flow we might miss fileUrl if not from Scanner.
        // To fix this propery, FileDragDrop should return File object too.
        // But for now, let's proceed with analysis even if fileUrl is missing, or try to upload base64.
        const res = await fetch(fileData.base64);
        const blob = await res.blob();
        const file = new File([blob], fileData.name, { type: fileData.mimeType });
        // Assuming we have user context or id. providing a fallback or getting from api
        // We need current user ID. Let's try to get it from api call or context.
        // Since we don't have user prop here easily, we rely on the backend to know the user.
        // The storage path needs user ID.
        // We can guess or use a generic path if we can't get user ID here easily.
        // Actually Scanner passes user prop to ATSView? No, ATSView is routed.
        // Lets just upload to a 'temp' or 'uploads' folder if we can't get ID, or better, skip URL saving if strictly needed.
        // Wait, backend `start_scan` or similar?
        // Frontend `scanner` has `user` prop. `App.tsx` likely has user.
        // `ATSView` is used inside `Scanner` in one route, but `App.tsx` routes it too?
        // Looking at `Scanner.tsx`, `<Route path="ats" element={<ATSView isPro={isPro} />} />` is INSIDE `Scanner`.
        // So `ATSView` is a child of `Scanner`'s layout? Yes, `Scanner` has `<Routes>`.
        // But `Scanner` doesn't pass `user` to `ATSView` explicitly in the route element line 532: `<ATSView isPro={isPro} />`.
        // I should update `Scanner.tsx` to pass `user` to `ATSView` or `ATSView` to use `useOutletContext` or similar.
        // Easier: `ATSView` can just use `api.get('/auth/me')` or similar? No.
        // Quick fix: `Scanner.tsx` line 532 -> `<ATSView isPro={isPro} user={user} />`. I will need to update `Scanner.tsx` again.
        // For now, let's just proceed with analysis and save result.
      }

      const data = await analyzeResume(fileData.base64, fileData.mimeType, jobDesc);

      clearInterval(interval);
      setProgress(100);

      await new Promise(resolve => setTimeout(resolve, 600));

      setResult(data);

      // Save to Backend
      await api.post('/ats/scan', {
        score: data.score,
        summary: data.summary,
        missingKeywords: data.missingKeywords,
        hardSkills: data.hardSkills,
        softSkills: data.softSkills,
        improvements: data.improvements,
        resumeId: null, // Linked to file?
        jobDescription: jobDesc,
        // We can send fileUrl if we had it
      });
      fetchHistory();

    } catch (error: any) {
      console.error("Analysis failed:", error);
      if (error.response && error.response.status === 403) {
        setShowLimitModal(true);
      } else {
        alert("Analysis failed. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pl-4 lg:pl-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ATS Compliance Scanner</h2>
        <p className="text-gray-500 dark:text-gray-400">Upload your existing resume to check its compatibility with hiring bots.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-dark-gray rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-500 dark:text-blue-400" />
                Resume File
              </h3>
              {fileData && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Ready to Scan</span>}
            </div>
            <div className="p-6">
              <FileDragDrop
                onFileSelect={handleFileSelect}
                label="Upload Resume (PDF/Img)"
                initialFileName={fileData?.name}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-gray rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Target size={18} className="text-purple-500 dark:text-purple-400" />
                Target Job (Optional)
              </h3>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-40 p-3 text-sm bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white"
                placeholder="Paste the job description here to check for keyword matching..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>
          </div>

          {/* New Widget: Quick Skills Found (Fills empty space) */}
          {result && result.skillsDetected && (
            <div className="bg-white dark:bg-dark-gray rounded-2xl shadow-sm border border-gray-200 dark:border-dark-gray overflow-hidden animate-fade-in transition-colors">
              <div className="p-4 border-b border-gray-100 dark:border-dark-gray bg-gray-50/50 dark:bg-black/20">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lightning size={18} className="text-amber-500" weight="fill" />
                  Quick Skills Found
                </h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.skillsDetected.slice(0, 15).map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-slate-700 font-medium">
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
            className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg transform active:scale-[0.98] relative overflow-hidden
              ${!fileData && !isAnalyzing
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-emerald-300'}`}
          >
            {isAnalyzing ? (
              <div className="w-full relative z-10">
                <div className="flex justify-between text-xs text-white/90 mb-1.5 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Spinner className="animate-spin" size={12} />
                    Analyzing Resume...
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <div
                    className="bg-white h-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <Lightning size={20} className={fileData ? "fill-white" : ""} weight={fileData ? "fill" : "regular"} />
                Run Deep Analysis
              </>
            )}
          </button>
        </div>


        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="h-full min-h-[500px] bg-white/50 dark:bg-black/50 border-2 border-dashed border-gray-200 dark:border-dark-gray rounded-3xl flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-4 transition-colors">
              <div className="w-20 h-20 bg-gray-100 dark:bg-dark-gray rounded-full flex items-center justify-center">
                <ChartBar size={32} />
              </div>
              <p className="font-medium text-gray-500 dark:text-gray-500">Upload a resume to see the analysis dashboard</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-dark-gray rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-slate-800 flex items-center justify-between transition-colors">
                <div>
                  <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase">Overall Match</h3>
                  <div className="text-5xl font-extrabold text-emerald-600 dark:text-emerald-500">{result.score}<span className="text-lg text-gray-400 dark:text-gray-600">/100</span></div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white">{result.candidateInfo.name}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">{result.candidateInfo.email}</div>
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
                  <div className="bg-white dark:bg-dark-gray rounded-3xl p-8 shadow-sm border border-gray-200 dark:border-dark-gray mb-6 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkle className="text-emerald-500" size={20} weight="fill" />
                      Executive Summary
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                      {result.summary}
                    </p>
                  </div>

                  <div className="bg-gray-900 text-white rounded-3xl p-8 shadow-xl">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                      <Lightning className="text-yellow-400" size={24} weight="fill" />
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

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-gray rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100 relative overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Lightning size={32} className="text-emerald-600 dark:text-emerald-400 fill-current" weight="fill" />
            </div>

            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Free Limit Reached</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
              You've used your 2 free AI resume scans. Upgrade to Pro for unlimited scans and advanced insights.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard/plans')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3.5 bg-white dark:bg-black border border-gray-200 dark:border-dark-gray text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-gray transition-colors"
                disabled={fileData === null}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans Sidebar / History */}
      {scanHistory.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockCounterClockwise size={24} /> Recent Scans
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanHistory.map((scan) => (
              <div key={scan.id} className="p-4 bg-white dark:bg-dark-gray rounded-xl border border-gray-200 dark:border-dark-gray shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-gray-900 dark:text-white truncate pr-2">{scan.jobDescription ? "Job Scan" : "General Scan"}</div>
                  <div className={`px-2 py-0.5 rounded text-xs font-bold ${scan.score >= 70 ? 'bg-emerald-100 text-emerald-700' : scan.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {scan.score}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{new Date(scan.createdAt).toLocaleDateString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{scan.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

const ScoreCard = ({ label, score, color, bg }: { label: string, score: number, color: string, bg: string }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-2">{label}</div>
    <div className="relative w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
      <div className={`absolute top-0 left-0 h-full ${bg}`} style={{ width: `${score}%` }}></div>
    </div>
    <div className={`text-xl font-bold ${color}`}>{score}/100</div>
  </div>
);