import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Clock,
  Upload,
} from 'lucide-react'
import api from '../services/api'
import type { Resume } from '../types'
import { Button, Card, Badge, EmptyState, Skeleton, Modal } from '../components/ui'
import { cn } from '../components/ui'

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean two-column layout, great for tech roles',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Classic single-column, trusted by HR professionals',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Ultra-clean design with maximum white space',
  },
]

// Visual layout mockups for each template
function TemplateThumbnail({ id }: { id: string }) {
  if (id === 'modern') {
    return (
      <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="160" fill="#f8fafc" rx="3" />
        <rect width="34" height="160" fill="#0369a1" rx="0" />
        <circle cx="17" cy="22" r="9" fill="#0ea5e9" opacity="0.7" />
        <rect x="5" y="38" width="24" height="2.5" rx="1" fill="white" opacity="0.6" />
        <rect x="5" y="44" width="20" height="2" rx="1" fill="white" opacity="0.4" />
        <rect x="5" y="58" width="14" height="2" rx="1" fill="white" opacity="0.8" />
        <rect x="5" y="63" width="24" height="1.5" rx="1" fill="white" opacity="0.4" />
        <rect x="5" y="67" width="20" height="1.5" rx="1" fill="white" opacity="0.4" />
        <rect x="5" y="71" width="22" height="1.5" rx="1" fill="white" opacity="0.4" />
        <rect x="5" y="85" width="14" height="2" rx="1" fill="white" opacity="0.8" />
        <rect x="5" y="90" width="24" height="1.5" rx="1" fill="white" opacity="0.4" />
        <rect x="5" y="94" width="18" height="1.5" rx="1" fill="white" opacity="0.4" />
        <rect x="40" y="12" width="70" height="4" rx="1.5" fill="#0f172a" opacity="0.8" />
        <rect x="40" y="19" width="50" height="2.5" rx="1" fill="#475569" opacity="0.6" />
        <rect x="40" y="30" width="20" height="2" rx="1" fill="#0369a1" opacity="0.9" />
        <rect x="40" y="34" width="72" height="0.8" rx="0.4" fill="#0369a1" opacity="0.3" />
        <rect x="40" y="39" width="65" height="1.5" rx="0.7" fill="#334155" opacity="0.5" />
        <rect x="40" y="43" width="58" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="40" y="47" width="62" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="40" y="57" width="24" height="2" rx="1" fill="#0369a1" opacity="0.9" />
        <rect x="40" y="61" width="72" height="0.8" rx="0.4" fill="#0369a1" opacity="0.3" />
        <rect x="40" y="66" width="60" height="1.5" rx="0.7" fill="#334155" opacity="0.5" />
        <rect x="40" y="70" width="50" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="40" y="74" width="65" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="40" y="84" width="18" height="2" rx="1" fill="#0369a1" opacity="0.9" />
        <rect x="40" y="88" width="72" height="0.8" rx="0.4" fill="#0369a1" opacity="0.3" />
        <rect x="40" y="93" width="55" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="40" y="97" width="65" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
      </svg>
    )
  }
  if (id === 'professional') {
    return (
      <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="160" fill="#f8fafc" rx="3" />
        <rect width="120" height="32" fill="#1e293b" rx="0" />
        <rect x="10" y="10" width="60" height="4.5" rx="1.5" fill="white" opacity="0.9" />
        <rect x="10" y="17" width="40" height="2.5" rx="1" fill="white" opacity="0.5" />
        <rect x="10" y="23" width="80" height="1.5" rx="0.7" fill="white" opacity="0.3" />
        <rect x="10" y="38" width="100" height="0.8" rx="0.4" fill="#1e293b" opacity="0.2" />
        <rect x="10" y="44" width="28" height="2" rx="1" fill="#1e293b" opacity="0.7" />
        <rect x="10" y="50" width="100" height="1.5" rx="0.7" fill="#334155" opacity="0.45" />
        <rect x="10" y="54" width="90" height="1.5" rx="0.7" fill="#334155" opacity="0.35" />
        <rect x="10" y="58" width="95" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="10" y="67" width="22" height="2" rx="1" fill="#1e293b" opacity="0.7" />
        <rect x="10" y="71" width="100" height="0.6" rx="0.3" fill="#1e293b" opacity="0.15" />
        <rect x="10" y="76" width="55" height="2" rx="1" fill="#1e293b" opacity="0.6" />
        <rect x="75" y="76" width="35" height="1.5" rx="0.7" fill="#64748b" opacity="0.5" />
        <rect x="10" y="80" width="40" height="1.5" rx="0.7" fill="#475569" opacity="0.45" />
        <rect x="10" y="84" width="100" height="1.2" rx="0.6" fill="#334155" opacity="0.35" />
        <rect x="10" y="87" width="90" height="1.2" rx="0.6" fill="#334155" opacity="0.3" />
        <rect x="10" y="95" width="50" height="2" rx="1" fill="#1e293b" opacity="0.6" />
        <rect x="70" y="95" width="35" height="1.5" rx="0.7" fill="#64748b" opacity="0.5" />
        <rect x="10" y="99" width="42" height="1.5" rx="0.7" fill="#475569" opacity="0.45" />
        <rect x="10" y="103" width="100" height="1.2" rx="0.6" fill="#334155" opacity="0.35" />
        <rect x="10" y="106" width="85" height="1.2" rx="0.6" fill="#334155" opacity="0.3" />
        <rect x="10" y="116" width="16" height="2" rx="1" fill="#1e293b" opacity="0.7" />
        <rect x="10" y="120" width="100" height="0.6" rx="0.3" fill="#1e293b" opacity="0.15" />
        <rect x="10" y="125" width="100" height="1.5" rx="0.7" fill="#334155" opacity="0.4" />
        <rect x="10" y="129" width="70" height="1.5" rx="0.7" fill="#334155" opacity="0.3" />
      </svg>
    )
  }
  // minimalist
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="160" fill="white" rx="3" />
      <rect width="120" height="2.5" fill="#0369a1" />
      <rect x="12" y="16" width="70" height="5" rx="1.5" fill="#0f172a" opacity="0.85" />
      <rect x="12" y="24" width="45" height="2.5" rx="1" fill="#475569" opacity="0.5" />
      <rect x="12" y="30" width="85" height="1.2" rx="0.6" fill="#94a3b8" opacity="0.6" />
      <rect x="12" y="38" width="96" height="0.5" rx="0.25" fill="#e2e8f0" />
      <rect x="12" y="46" width="18" height="1.5" rx="0.7" fill="#0369a1" opacity="0.8" />
      <rect x="12" y="52" width="96" height="1.2" rx="0.6" fill="#334155" opacity="0.4" />
      <rect x="12" y="56" width="80" height="1.2" rx="0.6" fill="#334155" opacity="0.35" />
      <rect x="12" y="60" width="88" height="1.2" rx="0.6" fill="#334155" opacity="0.3" />
      <rect x="12" y="70" width="96" height="0.5" rx="0.25" fill="#e2e8f0" />
      <rect x="12" y="77" width="22" height="1.5" rx="0.7" fill="#0369a1" opacity="0.8" />
      <rect x="12" y="83" width="60" height="1.8" rx="0.9" fill="#0f172a" opacity="0.6" />
      <rect x="12" y="87" width="40" height="1.2" rx="0.6" fill="#64748b" opacity="0.5" />
      <rect x="12" y="91" width="96" height="1.2" rx="0.6" fill="#334155" opacity="0.35" />
      <rect x="12" y="95" width="80" height="1.2" rx="0.6" fill="#334155" opacity="0.3" />
      <rect x="12" y="105" width="96" height="0.5" rx="0.25" fill="#e2e8f0" />
      <rect x="12" y="112" width="22" height="1.5" rx="0.7" fill="#0369a1" opacity="0.8" />
      <rect x="12" y="118" width="96" height="1.2" rx="0.6" fill="#334155" opacity="0.4" />
      <rect x="12" y="122" width="70" height="1.2" rx="0.6" fill="#334155" opacity="0.3" />
    </svg>
  )
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: (typeof TEMPLATES)[0]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left border rounded-xl p-3 transition-all duration-150 cursor-pointer',
        selected
          ? 'border-brand-700 ring-2 ring-brand-700 ring-offset-1'
          : 'border-slate-200 dark:border-dark-border-subtle hover:border-brand-300 hover:shadow-sm'
      )}
    >
      <div className={cn(
        'w-full aspect-[3/4] rounded-lg mb-3 overflow-hidden border',
        selected ? 'border-brand-200' : 'border-slate-100 dark:border-dark-border-subtle'
      )}>
        <TemplateThumbnail id={template.id} />
      </div>
      <p className={cn('text-sm font-semibold', selected ? 'text-brand-700' : 'text-slate-900 dark:text-slate-100')}>
        {template.name}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{template.description}</p>
    </button>
  )
}

function MiniResumePreview({ resume }: { resume: Resume }) {
  const { personalInfo: p, summary, experience, skills } = resume
  const hasContent = p.fullName || summary || experience.length > 0 || skills.length > 0

  if (!hasContent) {
    return (
      <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border-b border-slate-100 dark:border-dark-border-subtle">
        <div className="text-center">
          <FileText size={28} className="text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Empty resume</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-36 bg-white border-b border-slate-100 dark:border-dark-border-subtle overflow-hidden relative">
      <div
        className="absolute inset-0 origin-top-left"
        style={{ transform: 'scale(0.38)', width: '263%' }}
      >
        <div className="p-4 font-sans" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div className="border-b-2 border-brand-700 pb-2 mb-2">
            <p className="font-extrabold text-slate-900" style={{ fontSize: 18 }}>
              {p.fullName || 'Untitled'}
            </p>
            {p.title && <p className="text-slate-500" style={{ fontSize: 11, marginTop: 1 }}>{p.title}</p>}
            {(p.email || p.phone) && (
              <p className="text-slate-400" style={{ fontSize: 10, marginTop: 2 }}>
                {[p.email, p.phone, p.location].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
          {summary && (
            <p className="text-slate-600 mb-2" style={{ fontSize: 10, lineHeight: 1.5 }}>
              {summary.slice(0, 160)}
            </p>
          )}
          {experience.length > 0 && (
            <div className="mb-2">
              <p className="font-bold text-brand-700 uppercase tracking-wide mb-1" style={{ fontSize: 8 }}>
                Experience
              </p>
              {experience.slice(0, 2).map((exp) => (
                <div key={exp.id} style={{ fontSize: 10, marginBottom: 4 }}>
                  <p className="font-semibold text-slate-900">{exp.role} · {exp.company}</p>
                </div>
              ))}
            </div>
          )}
          {skills.length > 0 && (
            <div>
              <p className="font-bold text-brand-700 uppercase tracking-wide mb-1" style={{ fontSize: 8 }}>Skills</p>
              <p className="text-slate-600" style={{ fontSize: 10 }}>{skills.slice(0, 8).join(' · ')}</p>
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 dark:to-slate-800/90 pointer-events-none" />
    </div>
  )
}

function ResumeCard({
  resume,
  onDelete,
}: {
  resume: Resume
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <Card className="group overflow-hidden">
      <MiniResumePreview resume={resume} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {resume.title?.replace(/^\[AutoPilot\]\s*/, '') || 'Untitled'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock size={10} />
              {new Date(resume.lastModified).toLocaleDateString()}
            </p>
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover cursor-pointer transition-colors"
              aria-label="Resume options"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border-subtle rounded-xl shadow-lg overflow-hidden w-36">
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`/dashboard/resumes/${resume.id}/edit`) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(resume.id) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {(resume.score ?? 0) > 0 && (
            <Badge
              variant={(resume.score ?? 0) >= 80 ? 'success' : (resume.score ?? 0) >= 60 ? 'warning' : 'danger'}
            >
              ATS {resume.score}
            </Badge>
          )}
          <Badge variant="default">{resume.templateId}</Badge>
        </div>

        <Link to={`/dashboard/resumes/${resume.id}/edit`} className="block mt-3">
          <Button variant="outline" size="sm" className="w-full">
            <Edit size={13} /> Edit resume
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export default function ResumeList() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('modern')
  const [creating, setCreating] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/resumes').then((res) => {
      setResumes(Array.isArray(res.data) ? res.data : res.data?.resumes || [])
    }).finally(() => setLoading(false))
  }, [])

  const createBlank = async () => {
    setCreating(true)
    try {
      const res = await api.post('/resumes', {
        templateId: selectedTemplate,
        title: 'Untitled Resume',
        personalInfo: { fullName: '', email: '', phone: '', location: '' },
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
      })
      navigate(`/dashboard/resumes/${res.data.id}/edit`)
    } finally {
      setCreating(false)
    }
  }

  const uploadResume = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(uploadFile)
      })
      const parsed = await api.post('/resumes/parse', { file_content: fileContent })
      const saved = await api.post('/resumes', {
        ...parsed.data,
        templateId: selectedTemplate,
        title: uploadFile.name.replace(/\.[^/.]+$/, ''),
      })
      navigate(`/dashboard/resumes/${saved.data.id}/edit`)
    } finally {
      setUploading(false)
    }
  }

  const deleteResume = async (id: string) => {
    try {
      await api.delete(`/resumes/${id}`)
      setResumes((prev) => prev.filter((r) => r.id !== id))
    } catch { /* ignore */ }
    setDeleteId(null)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">My Resumes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {resumes.length} resume{resumes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus size={15} /> New resume
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-dark-border-subtle overflow-hidden">
              <Skeleton className="h-36 rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No resumes yet"
          description="Create your first resume or import from a PDF or DOCX file."
          action={
            <Button onClick={() => setShowNewModal(true)}>
              <Plus size={15} /> Create resume
            </Button>
          }
        />
      ) : (() => {
        const manual = resumes.filter(r => !r.title?.startsWith('[AutoPilot]'))
        const autopilot = resumes.filter(r => r.title?.startsWith('[AutoPilot]'))
        return (
          <div className="space-y-8">
            {/* Manual resumes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-brand-700" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">My Resumes</h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">({manual.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {manual.map((r) => (
                  <ResumeCard key={r.id} resume={r} onDelete={setDeleteId} />
                ))}
                <button
                  onClick={() => setShowNewModal(true)}
                  className="border-2 border-dashed border-slate-200 dark:border-dark-border-subtle rounded-xl h-full min-h-48 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all duration-200 cursor-pointer"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">New resume</span>
                </button>
              </div>
            </div>

            {/* AutoPilot tailored resumes */}
            {autopilot.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Upload size={15} className="text-purple-600 dark:text-purple-400" />
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AutoPilot Tailored</h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500">({autopilot.length})</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">· AI-tailored per job application</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {autopilot.map((r) => (
                    <ResumeCard key={r.id} resume={r} onDelete={setDeleteId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <Modal
        open={showNewModal}
        onClose={() => { setShowNewModal(false); setUploadFile(null) }}
        title="Create a new resume"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Choose a template</p>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedTemplate === t.id}
                  onSelect={() => setSelectedTemplate(t.id)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-dark-border-subtle pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={createBlank} loading={creating} className="w-full">
              <FileText size={15} /> Start from scratch
            </Button>

            <div>
              <label
                className="flex items-center justify-center gap-2 w-full h-9 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors px-4"
                aria-label="Import resume from file"
              >
                <Upload size={15} />
                {uploadFile ? uploadFile.name.slice(0, 20) + '…' : 'Import PDF / DOCX'}
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>
              {uploadFile && (
                <Button onClick={uploadResume} loading={uploading} variant="secondary" className="w-full mt-2" size="sm">
                  Parse & import
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete resume?" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          This action cannot be undone. The resume will be permanently deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteResume(deleteId!)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
