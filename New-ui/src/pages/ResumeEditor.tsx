import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Wand2,
  Save,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sparkles,
} from 'lucide-react'
import api from '../services/api'
import type { Resume, Experience, Education, Project } from '../types'
import { Button, Input, Textarea, Spinner, Badge } from '../components/ui'
import { cn } from '../components/ui'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID()

function newExp(): Experience {
  return { id: uid(), role: '', company: '', startDate: '', endDate: '', description: '' }
}
function newEdu(): Education {
  return { id: uid(), degree: '', school: '', year: '' }
}
function newProject(): Project {
  return { id: uid(), name: '', description: '', link: '' }
}

// ─── Section accordion ───────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string | number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {title}
          {badge !== undefined && (
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={15} className="text-slate-400 dark:text-slate-500" /> : <ChevronDown size={15} className="text-slate-400 dark:text-slate-500" />}
      </button>
      {open && <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3 bg-white dark:bg-slate-800">{children}</div>}
    </div>
  )
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

import { exportToPdf } from '../lib/exportToPdf'

// ─── Resume Preview ───────────────────────────────────────────────────────────
// NOTE: The preview intentionally stays white — it represents a printable document.

function ResumePreview({ resume }: { resume: Resume }) {
  const { personalInfo: p, summary, experience, education, skills, projects } = resume
  return (
    <div
      className="bg-white shadow-sm border border-slate-200 rounded-lg p-8 font-sans text-slate-900"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', lineHeight: '1.5' }}
    >
      {/* Header */}
      <div className="border-b-2 border-brand-700 pb-3 mb-4">
        <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{p.fullName || 'Your Name'}</h1>
        {p.title && <p style={{ fontSize: '12px', color: '#475569', marginTop: 2 }}>{p.title}</p>}
        <div className="flex flex-wrap gap-3 mt-1" style={{ color: '#64748b' }}>
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4">
          <h2 className="font-bold uppercase tracking-wide mb-1" style={{ fontSize: '10px', color: '#0369a1' }}>
            Professional Summary
          </h2>
          <p style={{ color: '#334155' }}>{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold uppercase tracking-wide mb-2" style={{ fontSize: '10px', color: '#0369a1' }}>
            Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold" style={{ fontSize: '12px' }}>{exp.role}</span>
                  <span style={{ color: '#64748b' }}>{exp.startDate} — {exp.endDate}</span>
                </div>
                <p style={{ color: '#475569' }}>{exp.company}</p>
                {exp.description && (
                  <p className="mt-1" style={{ color: '#334155' }}>{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold uppercase tracking-wide mb-2" style={{ fontSize: '10px', color: '#0369a1' }}>
            Education
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="flex justify-between items-baseline">
              <div>
                <span className="font-bold" style={{ fontSize: '12px' }}>{edu.degree}</span>
                <span style={{ color: '#475569' }}> · {edu.school}</span>
              </div>
              <span style={{ color: '#64748b' }}>{edu.year}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold uppercase tracking-wide mb-1.5" style={{ fontSize: '10px', color: '#0369a1' }}>
            Skills
          </h2>
          <p style={{ color: '#334155' }}>{skills.join(' · ')}</p>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <h2 className="font-bold uppercase tracking-wide mb-2" style={{ fontSize: '10px', color: '#0369a1' }}>
            Projects
          </h2>
          {projects.map((p) => (
            <div key={p.id} className="mb-2">
              <span className="font-bold" style={{ fontSize: '12px' }}>{p.name}</span>
              {p.link && <span style={{ color: '#0369a1' }}> · {p.link}</span>}
              {p.description && <p style={{ color: '#334155', marginTop: 1 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const [tailorJD, setTailorJD] = useState('')
  const [tailoring, setTailoring] = useState(false)
  const [tailorResult, setTailorResult] = useState<{ key_changes: string[]; ats_keywords_added: string[]; summary_statement: string } | null>(null)

  useEffect(() => {
    api.get(`/resumes/${id}`).then((res) => {
      setResume(res.data)
    }).catch(() => navigate('/dashboard/resumes')).finally(() => setLoading(false))
  }, [id, navigate])

  const patch = useCallback((updates: Partial<Resume>) => {
    setResume((prev) => prev ? { ...prev, ...updates } : prev)
  }, [])

  const patchInfo = (updates: Partial<Resume['personalInfo']>) => {
    setResume((prev) => prev ? { ...prev, personalInfo: { ...prev.personalInfo, ...updates } } : prev)
  }

  const save = useCallback(async (r: Resume) => {
    setSaving(true)
    try {
      await api.put(`/resumes/${r.id}`, r)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [])

  // Auto-save every 5s
  useEffect(() => {
    if (!resume) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => save(resume), 5000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [resume, save])

  const generateSummary = async () => {
    if (!resume) return
    setGenerating('summary')
    try {
      const res = await api.post('/ai/generate-summary', { resume_data: resume })
      patch({ summary: res.data.summary })
    } catch { /* ignore */ }
    setGenerating(null)
  }

  const generateBullets = async (expId: string, role: string, company: string) => {
    setGenerating(expId)
    try {
      const res = await api.post('/ai/generate-bullets', { role, company })
      patch({
        experience: resume!.experience.map((e) =>
          e.id === expId ? { ...e, description: res.data.bullets.join('\n') } : e
        ),
      })
    } catch { /* ignore */ }
    setGenerating(null)
  }

  const tailorToJD = async () => {
    if (!resume || !tailorJD.trim()) return
    setTailoring(true)
    setTailorResult(null)
    try {
      const res = await api.post('/ai/tailor-resume', {
        resume_data: resume,
        job_description: tailorJD,
        job_title: resume.personalInfo?.title || '',
        company: '',
      })
      const data = res.data
      const updates: Partial<typeof resume> = {}

      // Apply rewritten experience bullets parsed from resume_markdown
      if (data.resume_markdown) {
        const tailoredExp = parseExperienceFromMarkdown(data.resume_markdown, resume.experience)
        if (tailoredExp.length > 0) updates.experience = tailoredExp
      }

      // Apply tailored summary
      if (data.summary_statement) {
        updates.summary = data.summary_statement
      }

      // Auto-merge all ATS keywords into skills
      if (data.updated_skills?.length) {
        updates.skills = data.updated_skills
      } else if (data.ats_keywords_added?.length) {
        const merged = [...new Set([...resume.skills, ...data.ats_keywords_added])]
        updates.skills = merged
      }

      if (Object.keys(updates).length > 0) patch(updates)

      setTailorResult({
        key_changes: data.key_changes || [],
        ats_keywords_added: data.ats_keywords_added || [],
        summary_statement: data.summary_statement || '',
      })
    } catch { /* ignore */ }
    setTailoring(false)
  }

  /** Parse experience bullets out of the LLM's resume_markdown output */
  function parseExperienceFromMarkdown(
    markdown: string,
    baseExp: typeof resume.experience
  ): typeof resume.experience {
    const expSection = markdown.match(/##\s*(?:Work\s+)?Experience\s*\n([\s\S]*?)(?=\n##\s|$)/i)
    if (!expSection) return []

    const jobBlocks = expSection[1].split(/\n(?=###\s)/)
    const parsed: { role: string; company: string; description: string }[] = []

    for (const block of jobBlocks) {
      const lines = block.trim().split('\n')
      if (!lines.length) continue
      const header = lines[0].replace(/^###\s*/, '').trim()

      // Strip trailing (dates)
      const headerNoDates = header.replace(/\s*\([^)]+\)\s*$/, '').trim()
      const sepMatch = headerNoDates.match(/\s+(?:[—–]|-(?!\d)|at|@)\s+/)
      const role = sepMatch ? headerNoDates.slice(0, sepMatch.index).trim() : headerNoDates
      const company = sepMatch ? headerNoDates.slice(sepMatch.index! + sepMatch[0].length).trim() : ''

      const bullets = lines.slice(1)
        .map(l => l.trim())
        .filter(l => l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* '))
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)

      if (bullets.length) {
        parsed.push({ role, company, description: bullets.map(b => `- ${b}`).join('\n') })
      }
    }

    if (!parsed.length) return []

    const usedIds = new Set<string>()
    return parsed.map(p => {
      const base = baseExp?.find(b => {
        if (usedIds.has(b.id)) return false
        const bc = b.company.toLowerCase()
        const pc = p.company.toLowerCase()
        return bc && pc && (bc.includes(pc) || pc.includes(bc))
      })
      if (base) {
        usedIds.add(base.id)
        return { ...base, description: p.description, role: p.role || base.role }
      }
      return { ...p, id: crypto.randomUUID(), startDate: '', endDate: '' }
    })
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || !resume) return
    if (!resume.skills.includes(s)) {
      patch({ skills: [...resume.skills, s] })
    }
    setSkillInput('')
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950"><Spinner /></div>
  if (!resume) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left editor panel */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => navigate('/dashboard/resumes')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
          >
            <ArrowLeft size={15} /> Resumes
          </button>
          <div className="flex items-center gap-2">
            {saved && <Badge variant="success">Saved</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => save(resume)}
              loading={saving}
            >
              <Save size={13} /> Save
            </Button>
            <Button size="sm" onClick={() => exportToPdf(resume)}>
              <Download size={13} /> Export PDF
            </Button>
          </div>
        </div>

        {/* Edit fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Title */}
          <div>
            <Input
              label="Resume title"
              value={resume.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          {/* Personal info */}
          <Section title="Personal information">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Full name"
                value={resume.personalInfo.fullName}
                onChange={(e) => patchInfo({ fullName: e.target.value })}
                placeholder="Jane Doe"
              />
              <Input
                label="Job title"
                value={resume.personalInfo.title || ''}
                onChange={(e) => patchInfo({ title: e.target.value })}
                placeholder="Frontend Engineer"
              />
              <Input
                label="Email"
                type="email"
                value={resume.personalInfo.email}
                onChange={(e) => patchInfo({ email: e.target.value })}
                placeholder="jane@example.com"
              />
              <Input
                label="Phone"
                value={resume.personalInfo.phone}
                onChange={(e) => patchInfo({ phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Location"
                value={resume.personalInfo.location}
                onChange={(e) => patchInfo({ location: e.target.value })}
                placeholder="Bengaluru, India"
              />
              <Input
                label="LinkedIn"
                value={resume.personalInfo.linkedin || ''}
                onChange={(e) => patchInfo({ linkedin: e.target.value })}
                placeholder="linkedin.com/in/..."
              />
            </div>
          </Section>

          {/* Summary */}
          <Section title="Professional summary">
            <Textarea
              label="Summary"
              value={resume.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              placeholder="Write a 2-4 sentence summary of your experience and goals…"
              rows={4}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={generateSummary}
              loading={generating === 'summary'}
              className="mt-1"
            >
              <Wand2 size={13} /> Generate with AI
            </Button>
          </Section>

          {/* Experience */}
          <Section title="Experience" badge={resume.experience.length}>
            {resume.experience.map((exp) => (
              <div key={exp.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-slate-300 dark:text-slate-600 cursor-grab" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Job title"
                      value={exp.role}
                      onChange={(e) =>
                        patch({
                          experience: resume.experience.map((x) =>
                            x.id === exp.id ? { ...x, role: e.target.value } : x
                          ),
                        })
                      }
                    />
                    <Input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) =>
                        patch({
                          experience: resume.experience.map((x) =>
                            x.id === exp.id ? { ...x, company: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={() =>
                      patch({ experience: resume.experience.filter((x) => x.id !== exp.id) })
                    }
                    className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    aria-label="Remove experience"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Start date"
                    value={exp.startDate}
                    onChange={(e) =>
                      patch({
                        experience: resume.experience.map((x) =>
                          x.id === exp.id ? { ...x, startDate: e.target.value } : x
                        ),
                      })
                    }
                  />
                  <Input
                    placeholder="End date"
                    value={exp.endDate}
                    onChange={(e) =>
                      patch({
                        experience: resume.experience.map((x) =>
                          x.id === exp.id ? { ...x, endDate: e.target.value } : x
                        ),
                      })
                    }
                  />
                </div>
                <Textarea
                  placeholder="Describe your responsibilities and achievements…"
                  value={exp.description}
                  rows={3}
                  onChange={(e) =>
                    patch({
                      experience: resume.experience.map((x) =>
                        x.id === exp.id ? { ...x, description: e.target.value } : x
                      ),
                    })
                  }
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generateBullets(exp.id, exp.role, exp.company)}
                  loading={generating === exp.id}
                  disabled={!exp.role || !exp.company}
                >
                  <Wand2 size={12} /> Generate bullets
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ experience: [...resume.experience, newExp()] })}
            >
              <Plus size={13} /> Add experience
            </Button>
          </Section>

          {/* Education */}
          <Section title="Education" badge={resume.education.length}>
            {resume.education.map((edu) => (
              <div key={edu.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-800">
                <div className="flex gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Degree / qualification"
                      value={edu.degree}
                      onChange={(e) =>
                        patch({
                          education: resume.education.map((x) =>
                            x.id === edu.id ? { ...x, degree: e.target.value } : x
                          ),
                        })
                      }
                    />
                    <Input
                      placeholder="School / university"
                      value={edu.school}
                      onChange={(e) =>
                        patch({
                          education: resume.education.map((x) =>
                            x.id === edu.id ? { ...x, school: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </div>
                  <Input
                    placeholder="Year"
                    value={edu.year}
                    onChange={(e) =>
                      patch({
                        education: resume.education.map((x) =>
                          x.id === edu.id ? { ...x, year: e.target.value } : x
                        ),
                      })
                    }
                    className="w-20"
                  />
                  <button
                    onClick={() =>
                      patch({ education: resume.education.filter((x) => x.id !== edu.id) })
                    }
                    className="self-start mt-0.5 p-1 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    aria-label="Remove education"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ education: [...resume.education, newEdu()] })}
            >
              <Plus size={13} /> Add education
            </Button>
          </Section>

          {/* Skills */}
          <Section title="Skills" badge={resume.skills.length}>
            <div className="flex gap-2">
              <input
                placeholder="e.g. React, Python, Leadership…"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
              <Button size="sm" variant="secondary" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {resume.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2.5 py-1 rounded-full"
                >
                  {s}
                  <button
                    onClick={() => patch({ skills: resume.skills.filter((x) => x !== s) })}
                    className="text-brand-400 hover:text-brand-700 dark:hover:text-brand-200 cursor-pointer"
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </Section>

          {/* Tailor to JD */}
          <Section title="Tailor to Job Description" defaultOpen={false}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Paste a job description below. AI will rewrite your entire resume — summary, experience bullets, and skills — for a near-perfect ATS score.
            </p>
            <Textarea
              placeholder="Paste the job description here…"
              value={tailorJD}
              onChange={(e) => setTailorJD(e.target.value)}
              rows={5}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={tailorToJD}
              loading={tailoring}
              disabled={!tailorJD.trim()}
              className="mt-2 w-full"
            >
              <Sparkles size={13} /> Tailor resume to this JD
            </Button>
            {tailorResult && (
              <div className="mt-3 space-y-2">
                {tailorResult.key_changes.length > 0 && (
                  <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg p-3">
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1.5">Changes applied</p>
                    <ul className="space-y-1">
                      {tailorResult.key_changes.map((c, i) => (
                        <li key={i} className="text-xs text-brand-700 dark:text-brand-300 flex gap-1.5">
                          <span className="mt-0.5 flex-shrink-0">·</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tailorResult.ats_keywords_added.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">ATS keywords applied to skills</p>
                    <div className="flex flex-wrap gap-1">
                      {tailorResult.ats_keywords_added.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Projects */}
          <Section title="Projects" badge={resume.projects.length} defaultOpen={false}>
            {resume.projects.map((proj) => (
              <div key={proj.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-800">
                <div className="flex gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Project name"
                      value={proj.name}
                      onChange={(e) =>
                        patch({
                          projects: resume.projects.map((x) =>
                            x.id === proj.id ? { ...x, name: e.target.value } : x
                          ),
                        })
                      }
                    />
                    <Input
                      placeholder="Link (optional)"
                      value={proj.link || ''}
                      onChange={(e) =>
                        patch({
                          projects: resume.projects.map((x) =>
                            x.id === proj.id ? { ...x, link: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={() =>
                      patch({ projects: resume.projects.filter((x) => x.id !== proj.id) })
                    }
                    className="self-start mt-0.5 p-1 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    aria-label="Remove project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <Textarea
                  placeholder="Describe the project…"
                  value={proj.description}
                  rows={2}
                  onChange={(e) =>
                    patch({
                      projects: resume.projects.map((x) =>
                        x.id === proj.id ? { ...x, description: e.target.value } : x
                      ),
                    })
                  }
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ projects: [...resume.projects, newProject()] })}
            >
              <Plus size={13} /> Add project
            </Button>
          </Section>
        </div>
      </div>

      {/* Right preview panel — bg-slate-200/dark:bg-slate-700 so white resume "paper" pops */}
      <div className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-700 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preview</p>
            <Badge variant="default">{resume.templateId}</Badge>
          </div>
          {/* ResumePreview always stays white — it's a printable document */}
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  )
}
