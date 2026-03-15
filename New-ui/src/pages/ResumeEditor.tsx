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

function exportToPdf(resume: Resume) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF.')
    return
  }

  const { personalInfo: p, summary, experience, education, skills, projects } = resume

  const expHtml = experience.map((e) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <strong style="font-size:12px">${e.role}</strong>
        <span style="color:#64748b;font-size:10px">${e.startDate} — ${e.endDate}</span>
      </div>
      <div style="color:#475569;font-size:11px">${e.company}</div>
      ${e.description ? `<div style="margin-top:4px;color:#334155;font-size:10px;white-space:pre-wrap">${e.description}</div>` : ''}
    </div>`).join('')

  const eduHtml = education.map((e) => `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <div><strong style="font-size:12px">${e.degree}</strong><span style="color:#475569"> · ${e.school}</span></div>
      <span style="color:#64748b;font-size:10px">${e.year}</span>
    </div>`).join('')

  const projHtml = projects.map((proj) => `
    <div style="margin-bottom:8px">
      <strong style="font-size:12px">${proj.name}</strong>
      ${proj.link ? `<span style="color:#0369a1;font-size:10px"> · ${proj.link}</span>` : ''}
      ${proj.description ? `<div style="color:#334155;font-size:10px;margin-top:2px">${proj.description}</div>` : ''}
    </div>`).join('')

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${resume.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* Remove ALL browser print headers and footers */
    @page { margin: 0; size: A4; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Plus Jakarta Sans',sans-serif;
      font-size:11px;
      line-height:1.6;
      color:#1e293b;
      padding:28mm 22mm;
    }
    h2{
      font-size:8.5px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.1em;
      color:#0369a1;
      margin-bottom:5px;
      margin-top:14px;
    }
    p{margin:0}
    @media screen{body{max-width:800px;margin:auto;padding:32px}}
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #0369a1;padding-bottom:10px;margin-bottom:14px">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a">${p.fullName || 'Resume'}</h1>
    ${p.title ? `<div style="font-size:12px;color:#475569;margin-top:3px">${p.title}</div>` : ''}
    <div style="font-size:10px;color:#64748b;margin-top:5px">${[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join('  ·  ')}</div>
  </div>
  ${summary ? `<h2>Professional Summary</h2><p style="color:#334155;font-size:11px;margin-top:4px">${summary}</p>` : ''}
  ${experience.length ? `<h2>Experience</h2>${expHtml}` : ''}
  ${education.length ? `<h2>Education</h2>${eduHtml}` : ''}
  ${skills.length ? `<h2>Skills</h2><p style="color:#334155;margin-top:4px">${skills.join(' · ')}</p>` : ''}
  ${projects.length ? `<h2>Projects</h2>${projHtml}` : ''}
  <script>
    document.fonts.ready.then(function(){window.print();setTimeout(function(){window.close()},800)})
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}

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
