import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, User, Briefcase, Code, BookOpen, X, GraduationCap, Award } from 'lucide-react'
import api from '../services/api'
import { Button, Input, Textarea, Card, Spinner, Badge } from '../components/ui'

const uid = () => crypto.randomUUID()

interface Profile { name: string; role: string; email: string; phone: string; location: string; linkedin: string; website: string; github: string; summary: string }
interface DeskExp { id: string; role: string; company: string; startDate: string; endDate: string; current: boolean; description: string }
interface DeskEdu { id: string; degree: string; school: string; year: string; gpa: string; description: string }
interface DeskProject { id: string; name: string; tech: string; description: string; link: string }
interface DeskCert { id: string; name: string; issuer: string; date: string }
interface Desk { profile: Profile; skills: string[]; experiences: DeskExp[]; education: DeskEdu[]; projects: DeskProject[]; certifications: DeskCert[] }

const emptyDesk: Desk = {
  profile: { name: '', role: '', email: '', phone: '', location: '', linkedin: '', website: '', github: '', summary: '' },
  skills: [], experiences: [], education: [], projects: [], certifications: [],
}

function SectionHeader({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
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
  const [desk, setDesk] = useState<Desk>(emptyDesk)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    api.get('/user/desk')
      .then((res) => {
        const d = res.data
        if (d) {
          setDesk({
            profile: { ...emptyDesk.profile, ...(d.profile || {}) },
            skills: Array.isArray(d.skills) ? d.skills : [],
            experiences: Array.isArray(d.experiences) ? d.experiences : [],
            education: Array.isArray(d.education) ? d.education : [],
            projects: Array.isArray(d.projects) ? d.projects : [],
            certifications: Array.isArray(d.certifications) ? d.certifications : [],
          })
        }
      })
      .catch(() => {})
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

  const patchProfile = (u: Partial<Profile>) => setDesk((d) => ({ ...d, profile: { ...d.profile, ...u } }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || desk.skills.includes(s)) return
    setDesk((d) => ({ ...d, skills: [...d.skills, s] }))
    setSkillInput('')
  }
  const removeSkill = (s: string) => setDesk((d) => ({ ...d, skills: d.skills.filter((x) => x !== s) }))

  // Experience
  const addExp = () => setDesk((d) => ({ ...d, experiences: [...d.experiences, { id: uid(), role: '', company: '', startDate: '', endDate: '', current: false, description: '' }] }))
  const patchExp = (id: string, u: Partial<DeskExp>) => setDesk((d) => ({ ...d, experiences: d.experiences.map((e) => e.id === id ? { ...e, ...u } : e) }))
  const removeExp = (id: string) => setDesk((d) => ({ ...d, experiences: d.experiences.filter((e) => e.id !== id) }))

  // Education
  const addEdu = () => setDesk((d) => ({ ...d, education: [...d.education, { id: uid(), degree: '', school: '', year: '', gpa: '', description: '' }] }))
  const patchEdu = (id: string, u: Partial<DeskEdu>) => setDesk((d) => ({ ...d, education: d.education.map((e) => e.id === id ? { ...e, ...u } : e) }))
  const removeEdu = (id: string) => setDesk((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) }))

  // Projects
  const addProject = () => setDesk((d) => ({ ...d, projects: [...d.projects, { id: uid(), name: '', tech: '', description: '', link: '' }] }))
  const patchProject = (id: string, u: Partial<DeskProject>) => setDesk((d) => ({ ...d, projects: d.projects.map((p) => p.id === id ? { ...p, ...u } : p) }))
  const removeProject = (id: string) => setDesk((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }))

  // Certifications
  const addCert = () => setDesk((d) => ({ ...d, certifications: [...d.certifications, { id: uid(), name: '', issuer: '', date: '' }] }))
  const patchCert = (id: string, u: Partial<DeskCert>) => setDesk((d) => ({ ...d, certifications: d.certifications.map((c) => c.id === id ? { ...c, ...u } : c) }))
  const removeCert = (id: string) => setDesk((d) => ({ ...d, certifications: d.certifications.filter((c) => c.id !== id) }))

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Career Desk</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your master profile — powers Resume Builder, AutoPilot, and ATS Scanner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="success">Saved</Badge>}
          <Button onClick={save} loading={saving}><Save size={14} /> Save all changes</Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Card className="p-5">
          <SectionHeader icon={User} title="Profile" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name" value={desk.profile.name} onChange={(e) => patchProfile({ name: e.target.value })} placeholder="Jane Doe" />
            <Input label="Current role" value={desk.profile.role} onChange={(e) => patchProfile({ role: e.target.value })} placeholder="Senior Software Engineer" />
            <Input label="Email" type="email" value={desk.profile.email} onChange={(e) => patchProfile({ email: e.target.value })} placeholder="jane@example.com" />
            <Input label="Phone" value={desk.profile.phone} onChange={(e) => patchProfile({ phone: e.target.value })} placeholder="+91 98765 43210" />
            <Input label="Location" value={desk.profile.location} onChange={(e) => patchProfile({ location: e.target.value })} placeholder="Bengaluru, India" />
            <Input label="LinkedIn" value={desk.profile.linkedin} onChange={(e) => patchProfile({ linkedin: e.target.value })} placeholder="linkedin.com/in/janedoe" />
            <Input label="Website / Portfolio" value={desk.profile.website} onChange={(e) => patchProfile({ website: e.target.value })} placeholder="janedoe.dev" />
            <Input label="GitHub" value={desk.profile.github} onChange={(e) => patchProfile({ github: e.target.value })} placeholder="github.com/janedoe" />
            <Textarea label="Professional Summary" value={desk.profile.summary} onChange={(e) => patchProfile({ summary: e.target.value })} placeholder="2-3 sentences about your expertise and what you're looking for…" rows={3} className="col-span-2" />
          </div>
        </Card>

        {/* Skills */}
        <Card className="p-5">
          <SectionHeader icon={BookOpen} title={`Skills (${desk.skills.length})`} />
          <div className="flex gap-2 mb-3">
            <input placeholder="Add a skill and press Enter…" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700" />
            <Button size="sm" variant="secondary" onClick={addSkill}><Plus size={13} /> Add</Button>
          </div>
          {desk.skills.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500">No skills added yet.</p>
            : <div className="flex flex-wrap gap-2">
                {desk.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-full">
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 cursor-pointer"><X size={10} /></button>
                  </span>
                ))}
              </div>
          }
        </Card>

        {/* Experiences */}
        <Card className="p-5">
          <SectionHeader icon={Briefcase} title={`Experience (${desk.experiences.length})`} action={<Button size="sm" variant="secondary" onClick={addExp}><Plus size={13} /> Add</Button>} />
          {desk.experiences.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500">No experiences added.</p>
            : <div className="space-y-4">
                {desk.experiences.map((exp) => (
                  <div key={exp.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input placeholder="Job title" value={exp.role} onChange={(e) => patchExp(exp.id, { role: e.target.value })} />
                        <Input placeholder="Company" value={exp.company} onChange={(e) => patchExp(exp.id, { company: e.target.value })} />
                        <Input placeholder="Start date (e.g. Jan 2022)" value={exp.startDate} onChange={(e) => patchExp(exp.id, { startDate: e.target.value })} />
                        <div className="flex items-center gap-2">
                          <Input placeholder="End date" value={exp.endDate} onChange={(e) => patchExp(exp.id, { endDate: e.target.value })} disabled={exp.current} className="flex-1" />
                          <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap cursor-pointer">
                            <input type="checkbox" checked={exp.current} onChange={(e) => patchExp(exp.id, { current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })} className="rounded" />
                            Current
                          </label>
                        </div>
                      </div>
                      <button onClick={() => removeExp(exp.id)} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                    </div>
                    <Textarea placeholder="Describe what you did, achievements, and technologies…" value={exp.description} rows={3} onChange={(e) => patchExp(exp.id, { description: e.target.value })} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Education */}
        <Card className="p-5">
          <SectionHeader icon={GraduationCap} title={`Education (${desk.education.length})`} action={<Button size="sm" variant="secondary" onClick={addEdu}><Plus size={13} /> Add</Button>} />
          {desk.education.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500">No education added.</p>
            : <div className="space-y-4">
                {desk.education.map((edu) => (
                  <div key={edu.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input placeholder="Degree (e.g. B.Tech Computer Science)" value={edu.degree} onChange={(e) => patchEdu(edu.id, { degree: e.target.value })} />
                        <Input placeholder="School / University" value={edu.school} onChange={(e) => patchEdu(edu.id, { school: e.target.value })} />
                        <Input placeholder="Year (e.g. 2020–2024)" value={edu.year} onChange={(e) => patchEdu(edu.id, { year: e.target.value })} />
                        <Input placeholder="GPA (optional)" value={edu.gpa} onChange={(e) => patchEdu(edu.id, { gpa: e.target.value })} />
                      </div>
                      <button onClick={() => removeEdu(edu.id)} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Projects */}
        <Card className="p-5">
          <SectionHeader icon={Code} title={`Projects (${desk.projects.length})`} action={<Button size="sm" variant="secondary" onClick={addProject}><Plus size={13} /> Add</Button>} />
          {desk.projects.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500">Add portfolio projects, side projects, or notable contributions.</p>
            : <div className="space-y-4">
                {desk.projects.map((proj) => (
                  <div key={proj.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input placeholder="Project name" value={proj.name} onChange={(e) => patchProject(proj.id, { name: e.target.value })} />
                        <Input placeholder="Tech stack (e.g. React, Node.js)" value={proj.tech} onChange={(e) => patchProject(proj.id, { tech: e.target.value })} />
                      </div>
                      <button onClick={() => removeProject(proj.id)} className="mt-0.5 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                    </div>
                    <Input placeholder="Link (GitHub, demo URL, etc.)" value={proj.link || ''} onChange={(e) => patchProject(proj.id, { link: e.target.value })} />
                    <Textarea placeholder="What does this project do? What problem does it solve?" value={proj.description} rows={2} onChange={(e) => patchProject(proj.id, { description: e.target.value })} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Certifications */}
        <Card className="p-5">
          <SectionHeader icon={Award} title={`Certifications (${desk.certifications.length})`} action={<Button size="sm" variant="secondary" onClick={addCert}><Plus size={13} /> Add</Button>} />
          {desk.certifications.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500">Add certifications, courses, or licenses.</p>
            : <div className="space-y-3">
                {desk.certifications.map((cert) => (
                  <div key={cert.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <Input placeholder="Certification name" value={cert.name} onChange={(e) => patchCert(cert.id, { name: e.target.value })} />
                        <Input placeholder="Issuer (e.g. AWS, Google)" value={cert.issuer} onChange={(e) => patchCert(cert.id, { issuer: e.target.value })} />
                        <Input placeholder="Date (e.g. Mar 2024)" value={cert.date} onChange={(e) => patchCert(cert.id, { date: e.target.value })} />
                      </div>
                      <button onClick={() => removeCert(cert.id)} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>
    </div>
  )
}
