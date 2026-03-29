import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  ScanText,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Info,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { ATSScan } from '../types'
import { Button, Badge, ScoreRing, Card, Spinner } from '../components/ui'
import { cn } from '../components/ui'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Converts parsed Resume JSON to plain text that /ai/analyze expects
function formatResumeAsText(resume: Record<string, unknown>): string {
  const lines: string[] = []
  const pi = resume.personalInfo as Record<string, string> | undefined
  if (pi) {
    if (pi.fullName) lines.push(pi.fullName)
    if (pi.title) lines.push(pi.title)
    const contact = [pi.email, pi.phone, pi.location].filter(Boolean).join(' | ')
    if (contact) lines.push(contact)
  }
  if (resume.summary) lines.push('\nSUMMARY\n' + resume.summary)

  const exp = resume.experience as Array<Record<string, string>> | undefined
  if (exp?.length) {
    lines.push('\nEXPERIENCE')
    exp.forEach((e) => {
      lines.push(`${e.role} at ${e.company} (${e.startDate} – ${e.endDate})`)
      if (e.description) lines.push(e.description)
    })
  }

  const edu = resume.education as Array<Record<string, string>> | undefined
  if (edu?.length) {
    lines.push('\nEDUCATION')
    edu.forEach((e) => lines.push(`${e.degree} – ${e.school} (${e.year})`))
  }

  const skills = resume.skills as string[] | undefined
  if (skills?.length) lines.push('\nSKILLS\n' + skills.join(', '))

  const proj = resume.projects as Array<Record<string, string>> | undefined
  if (proj?.length) {
    lines.push('\nPROJECTS')
    proj.forEach((p) => {
      lines.push(p.name)
      if (p.description) lines.push(p.description)
    })
  }

  const certs = resume.certifications as Array<Record<string, string>> | undefined
  if (certs?.length) {
    lines.push('\nCERTIFICATIONS')
    certs.forEach((c) => lines.push(`${c.name} – ${c.issuer} (${c.date})`))
  }

  return lines.join('\n')
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600'
  if (s >= 60) return 'text-amber-600'
  return 'text-red-500'
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
  if (s >= 60) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
  return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

function UploadZone({
  file,
  onFile,
}: {
  file: File | null
  onFile: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)) {
      onFile(f)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
        dragging
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-950'
          : 'border-slate-200 dark:border-dark-border-subtle hover:border-slate-300 dark:hover:border-slate-600',
        file ? '' : 'cursor-pointer'
      )}
    >
      {file ? (
        <div className="flex items-center gap-3 max-w-xs mx-auto">
          <div className="w-10 h-10 bg-brand-50 dark:bg-brand-950 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-brand-700" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null) }}
            className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div>
          <div className="w-12 h-12 bg-slate-100 dark:bg-dark-elevated rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload size={20} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Drop your resume here, or <span className="text-brand-700 dark:text-brand-400">browse</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF or DOCX · Max 10 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        aria-label="Upload resume"
      />
    </div>
  )
}

// ─── Results ──────────────────────────────────────────────────────────────────

function SectionScore({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-600 dark:text-slate-400 capitalize">{label}</span>
        <span className={cn('font-bold', scoreColor(score))}>{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-dark-elevated rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function ResultPanel({ scan }: { scan: ATSScan }) {
  const [showAll, setShowAll] = useState(false)

  // Null-safe aliases — backend arrays can arrive as null/undefined
  const skillsDetected = scan.skillsDetected ?? []
  const missingKeywords = scan.missingKeywords ?? []
  const hardSkills = scan.hardSkills ?? []
  const softSkills = scan.softSkills ?? []
  const improvements = scan.improvements ?? []
  const formattingIssues = scan.formattingIssues ?? []

  const scoreLabel = scan.score >= 80 ? 'Excellent' : scan.score >= 60 ? 'Good' : 'Needs work'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score header */}
      <Card className={cn('p-5 border', scoreBg(scan.score))}>
        <div className="flex items-center gap-5">
          <ScoreRing score={scan.score} size={80} />
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">ATS Compatibility Score</p>
            <h2 className={cn('text-2xl font-bold', scoreColor(scan.score))}>
              {scan.score}/100 · {scoreLabel}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-xl">{scan.summary}</p>
          </div>
        </div>
      </Card>

      {/* Section scores (Pro) */}
      {scan.sectionScores && Object.keys(scan.sectionScores).length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Section breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(scan.sectionScores).map(([k, v]) => (
              <SectionScore key={k} label={k} score={v} />
            ))}
          </div>
        </Card>
      )}

      {/* Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" />
            Detected keywords
            <Badge variant="success">{skillsDetected.length}</Badge>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skillsDetected.map((k) => (
              <span key={k} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                {k}
              </span>
            ))}
            {skillsDetected.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500">No skills detected.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <XCircle size={14} className="text-red-500" />
            Missing keywords
            <Badge variant="danger">{missingKeywords.length}</Badge>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.map((k) => (
              <span key={k} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                {k}
              </span>
            ))}
            {missingKeywords.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">All key terms found.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Hard / Soft skills */}
      {(hardSkills.length > 0 || softSkills.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hardSkills.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Hard skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {hardSkills.map((k) => (
                  <Badge key={k} variant="brand">{k}</Badge>
                ))}
              </div>
            </Card>
          )}
          {softSkills.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Soft skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {softSkills.map((k) => (
                  <Badge key={k} variant="accent">{k}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" />
              Improvement suggestions
            </h3>
            {improvements.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-brand-700 dark:text-brand-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? 'Show less' : `+${improvements.length - 3} more`}
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {(showAll ? improvements : improvements.slice(0, 3)).map((imp, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  {i + 1}
                </span>
                {imp}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Formatting issues */}
      {formattingIssues.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            Formatting issues
          </h3>
          <ul className="space-y-1.5">
            {formattingIssues.map((f, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
                <span className="text-blue-400 mt-0.5">·</span>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// ─── Scan History ─────────────────────────────────────────────────────────────

function HistoryItem({ scan, onSelect }: { scan: ATSScan; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors cursor-pointer text-left"
    >
      <ScoreRing score={scan.score} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{scan.fileName || 'Resume'}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
          <Clock size={10} />
          {new Date(scan.createdAt).toLocaleDateString()}
        </p>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ATSScanner() {
  const { user } = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ATSScan | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ATSScan[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const loadHistory = async () => {
    if (historyLoaded) return
    try {
      const res = await api.get('/ats/history')
      setHistory(res.data?.scans || [])
    } catch {
      // ignore
    } finally {
      setHistoryLoaded(true)
    }
  }

  const scan = async () => {
    if (!file) { setError('Please upload a resume first.'); return }
    setError('')
    setScanning(true)
    try {
      // Step 1: parse file → structured Resume JSON
      const dataUri = await fileToDataUri(file)
      const parseRes = await api.post('/resumes/parse', { file_content: dataUri })
      const resumeText = formatResumeAsText(parseRes.data)

      // Step 2: ATS analysis with plain text (what /ai/analyze expects)
      const payload: Record<string, unknown> = { resume_text: resumeText }
      if (jobDesc.trim()) payload.job_description = jobDesc.trim()

      const res = await api.post('/ai/analyze', payload)
      // Normalize API response: Python backend returns keywordsMissing (not missingKeywords)
      const raw = res.data
      const scanData: ATSScan = {
        score: raw.score ?? 0,
        summary: raw.summary ?? '',
        skillsDetected: raw.skillsDetected ?? [],
        missingKeywords: raw.keywordsMissing ?? raw.missingKeywords ?? [],
        hardSkills: raw.hardSkills ?? [],
        softSkills: raw.softSkills ?? [],
        improvements: raw.improvements ?? [],
        formattingIssues: raw.formattingIssues ?? [],
        sectionScores: raw.sectionScores ?? null,
        candidateInfo: raw.candidateInfo ?? null,
        jobDescription: raw.jobDescription ?? '',
        fileName: file.name,
        createdAt: new Date().toISOString(),
      }

      // Save to history
      try {
        await api.post('/ats/scan', scanData)
      } catch { /* ignore */ }

      setResult(scanData)
      setHistory((prev) => [scanData, ...prev.slice(0, 19)])
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-slate-100 dark:border-dark-border flex flex-col bg-white dark:bg-dark-surface">
        <div className="p-5 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-1">
            <ScanText size={16} className="text-brand-700" />
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-50">ATS Scanner</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Score your resume against any job description in seconds.
          </p>
        </div>

        {/* Input area */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Limits */}
          {user && (
            <div className="bg-slate-50 dark:bg-dark-card rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {user.plan === 'pro' ? '20' : '1'}
              </span>{' '}
              scans/day · {user.scan_count} total scans done
            </div>
          )}

          {/* Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Resume *
            </label>
            <UploadZone file={file} onFile={setFile} />
          </div>

          {/* JD */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Job description <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Paste the full job description here to get keyword gap analysis…"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={8}
              className="w-full border border-slate-200 dark:border-dark-border-subtle rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={scan}
            loading={scanning}
            className="w-full"
            disabled={!file}
          >
            <ScanText size={15} />
            Scan resume
          </Button>
        </div>

        {/* History */}
        <div className="border-t border-slate-100 dark:border-dark-border">
          <button
            onClick={loadHistory}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
          >
            Scan history
            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
          </button>
          {historyLoaded && (
            <div className="px-2 pb-3 max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No history yet</p>
              ) : (
                history.map((s) => (
                  <HistoryItem key={s.id || s.createdAt} scan={s} onSelect={() => setResult(s)} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-dark-bg">
        {scanning ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Spinner size={28} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing your resume…</p>
          </div>
        ) : result ? (
          <ResultPanel scan={result} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanText size={28} className="text-brand-700" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Upload a resume to get started
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Your ATS compatibility score, keyword gaps, and improvement suggestions will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
