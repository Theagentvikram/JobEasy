import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, User, Briefcase, Code, BookOpen, X } from 'lucide-react'
import api from '../services/api'
import type { CareerDesk as CareerDeskType, CareerExperience, CareerProject } from '../types'
import { Button, Input, Textarea, Card, Spinner, Badge } from '../components/ui'

const uid = () => crypto.randomUUID()

const emptyDesk: CareerDeskType = {
  profile: { name: '', role: '', email: '', phone: '', location: '' },
  skills: [],
  experiences: [],
  projects: [],
}

function SectionHeader({ icon: Icon, title, action }: {
  icon: React.ElementType
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-50 dark:bg-brand-950 rounded-lg flex items-center justify-center">
          <Icon size={14} className="text-brand-700" />
        </div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export default function CareerDesk() {
  const [desk, setDesk] = useState<CareerDeskType>(emptyDesk)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    api.get('/user/desk')
      .then((res) => {
        const d = res.data
        if (d) {
          // Defensive merge — API may return null for array fields on new users
          setDesk({
            profile: { ...emptyDesk.profile, ...(d.profile || {}) },
            skills: Array.isArray(d.skills) ? d.skills : [],
            experiences: Array.isArray(d.experiences) ? d.experiences : [],
            projects: Array.isArray(d.projects) ? d.projects : [],
          })
        }
      })
      .catch(() => { /* new user — use emptyDesk */ })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/user/desk', desk)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const patchProfile = (updates: Partial<CareerDeskType['profile']>) => {
    setDesk((d) => ({ ...d, profile: { ...d.profile, ...updates } }))
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s) return
    if (!desk.skills.includes(s)) setDesk((d) => ({ ...d, skills: [...d.skills, s] }))
    setSkillInput('')
  }

  const removeSkill = (s: string) =>
    setDesk((d) => ({ ...d, skills: d.skills.filter((x) => x !== s) }))

  const addExp = () =>
    setDesk((d) => ({
      ...d,
      experiences: [
        ...d.experiences,
        { id: uid(), role: '', company: '', year: '', description: '' },
      ],
    }))

  const patchExp = (id: string, updates: Partial<CareerExperience>) =>
    setDesk((d) => ({
      ...d,
      experiences: d.experiences.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))

  const removeExp = (id: string) =>
    setDesk((d) => ({ ...d, experiences: d.experiences.filter((e) => e.id !== id) }))

  const addProject = () =>
    setDesk((d) => ({
      ...d,
      projects: [
        ...d.projects,
        { id: uid(), name: '', tech: '', description: '', link: '' },
      ],
    }))

  const patchProject = (id: string, updates: Partial<CareerProject>) =>
    setDesk((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))

  const removeProject = (id: string) =>
    setDesk((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }))

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Career Desk</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your master profile — reuse across all your resumes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="success">Saved</Badge>}
          <Button onClick={save} loading={saving}>
            <Save size={14} /> Save all changes
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Card className="p-5">
          <SectionHeader icon={User} title="Profile" />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={desk.profile.name}
              onChange={(e) => patchProfile({ name: e.target.value })}
              placeholder="Jane Doe"
            />
            <Input
              label="Current role"
              value={desk.profile.role}
              onChange={(e) => patchProfile({ role: e.target.value })}
              placeholder="Senior Software Engineer"
            />
            <Input
              label="Email"
              type="email"
              value={desk.profile.email}
              onChange={(e) => patchProfile({ email: e.target.value })}
              placeholder="jane@example.com"
            />
            <Input
              label="Phone"
              value={desk.profile.phone}
              onChange={(e) => patchProfile({ phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Location"
              value={desk.profile.location}
              onChange={(e) => patchProfile({ location: e.target.value })}
              placeholder="Bengaluru, India"
              className="col-span-2"
            />
          </div>
        </Card>

        {/* Skills */}
        <Card className="p-5">
          <SectionHeader
            icon={BookOpen}
            title={`Skills (${desk.skills.length})`}
          />
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Add a skill and press Enter…"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
            <Button size="sm" variant="secondary" onClick={addSkill}>
              <Plus size={13} /> Add
            </Button>
          </div>
          {desk.skills.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No skills added yet. Add skills like React, Python, SQL, Leadership…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {desk.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-full"
                >
                  {s}
                  <button
                    onClick={() => removeSkill(s)}
                    className="text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 cursor-pointer"
                    aria-label={`Remove ${s}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Experiences */}
        <Card className="p-5">
          <SectionHeader
            icon={Briefcase}
            title={`Experiences (${desk.experiences.length})`}
            action={
              <Button size="sm" variant="secondary" onClick={addExp}>
                <Plus size={13} /> Add
              </Button>
            }
          />
          {desk.experiences.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No experiences added. These appear in the Career Desk and can be pulled into any resume.</p>
          ) : (
            <div className="space-y-4">
              {desk.experiences.map((exp) => (
                <div key={exp.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Job title"
                        value={exp.role}
                        onChange={(e) => patchExp(exp.id, { role: e.target.value })}
                      />
                      <Input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => patchExp(exp.id, { company: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        placeholder="Year"
                        value={exp.year}
                        onChange={(e) => patchExp(exp.id, { year: e.target.value })}
                        className="w-24"
                      />
                      <button
                        onClick={() => removeExp(exp.id)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                        aria-label="Remove experience"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Describe what you did, achievements, and technologies used…"
                    value={exp.description}
                    rows={3}
                    onChange={(e) => patchExp(exp.id, { description: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Projects */}
        <Card className="p-5">
          <SectionHeader
            icon={Code}
            title={`Projects (${desk.projects.length})`}
            action={
              <Button size="sm" variant="secondary" onClick={addProject}>
                <Plus size={13} /> Add
              </Button>
            }
          />
          {desk.projects.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Add portfolio projects, side projects, or notable contributions.</p>
          ) : (
            <div className="space-y-4">
              {desk.projects.map((proj) => (
                <div key={proj.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Project name"
                        value={proj.name}
                        onChange={(e) => patchProject(proj.id, { name: e.target.value })}
                      />
                      <Input
                        placeholder="Tech stack (e.g. React, Node.js)"
                        value={proj.tech}
                        onChange={(e) => patchProject(proj.id, { tech: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={() => removeProject(proj.id)}
                      className="mt-0.5 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                      aria-label="Remove project"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <Input
                    placeholder="Link (GitHub, demo URL, etc.)"
                    value={proj.link || ''}
                    onChange={(e) => patchProject(proj.id, { link: e.target.value })}
                  />
                  <Textarea
                    placeholder="What does this project do? What problem does it solve?"
                    value={proj.description}
                    rows={2}
                    onChange={(e) => patchProject(proj.id, { description: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
