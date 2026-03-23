import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Save, User, Briefcase, Code, BookOpen, X, GraduationCap, Award, RefreshCw, ChevronDown, Pencil, UserPlus, FileText, Clock } from 'lucide-react'
import api from '../services/api'
import { Button, Input, Textarea, Card, Skeleton, Badge } from '../components/ui'

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

interface DeskProfile { id: string; name: string }

function parseDesk(d: Record<string, unknown>): Desk {
  return {
    profile: { ...emptyDesk.profile, ...((d.profile as Record<string, string>) || {}) },
    skills: Array.isArray(d.skills) ? d.skills as string[] : [],
    experiences: Array.isArray(d.experiences) ? d.experiences as DeskExp[] : [],
    education: Array.isArray(d.education) ? d.education as DeskEdu[] : [],
    projects: Array.isArray(d.projects) ? d.projects as DeskProject[] : [],
    certifications: Array.isArray(d.certifications) ? d.certifications as DeskCert[] : [],
  }
}

export default function CareerDesk() {
  const [desk, setDesk] = useState<Desk>(emptyDesk)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  // ── Resume picker state ──────────────────────────────────────
  const [showResumePicker, setShowResumePicker] = useState(false)
  const [resumeList, setResumeList] = useState<{ id: string; name: string; lastModified: string; role: string }[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false)

  // ── Multi-profile state ──────────────────────────────────────
  const [profiles, setProfiles] = useState<DeskProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>('default')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load profiles + active desk
  const loadProfiles = async () => {
    const res = await api.get('/user/desk/profiles')
    const { profiles: pl, activeProfileId: aid } = res.data
    setProfiles(pl)
    setActiveProfileId(aid)
    return { profiles: pl, activeProfileId: aid }
  }

  const loadDeskForProfile = async (profileId: string) => {
    const res = await api.get(`/user/desk/profiles/${profileId}`)
    setDesk(parseDesk(res.data))
  }

  useEffect(() => {
    setLoading(true)
    loadProfiles()
      .then(({ activeProfileId: aid }) => loadDeskForProfile(aid))
      .catch(() => {
        // Fallback: load legacy desk endpoint
        return api.get('/user/desk').then(res => { if (res.data) setDesk(parseDesk(res.data)) })
      })
      .finally(() => setLoading(false))
  }, [])

  const switchProfile = async (profileId: string) => {
    setProfileMenuOpen(false)
    setLoading(true)
    try {
      const res = await api.post(`/user/desk/profiles/${profileId}/activate`)
      setActiveProfileId(profileId)
      setDesk(parseDesk(res.data))
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    const name = newProfileName.trim() || 'New Profile'
    const res = await api.post('/user/desk/profiles', { name })
    const newId = res.data.id
    await loadProfiles()
    await loadDeskForProfile(newId)
    setActiveProfileId(newId)
    setCreatingProfile(false)
    setNewProfileName('')
  }

  const renameProfile = async (profileId: string) => {
    if (!renameValue.trim()) return
    await api.patch(`/user/desk/profiles/${profileId}/rename`, { name: renameValue.trim() })
    setProfiles(ps => ps.map(p => p.id === profileId ? { ...p, name: renameValue.trim() } : p))
    setRenamingId(null)
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Delete this profile? This cannot be undone.')) return
    const res = await api.delete(`/user/desk/profiles/${profileId}`)
    await loadProfiles()
    if (res.data.activeProfileId) {
      setActiveProfileId(res.data.activeProfileId)
      await loadDeskForProfile(res.data.activeProfileId)
    }
  }

  const activeProfileName = profiles.find(p => p.id === activeProfileId)?.name ?? 'My Profile'

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/user/desk/profiles/${activeProfileId}`, desk)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const openResumePicker = async () => {
    setShowResumePicker(true)
    setLoadingResumes(true)
    try {
      const res = await api.get('/user/desk/resumes')
      setResumeList(res.data || [])
    } catch {
      setResumeList([])
    } finally {
      setLoadingResumes(false)
    }
  }

  const syncFromResume = async (resumeId?: string) => {
    setShowResumePicker(false)
    setSyncing(true)
    try {
      const url = resumeId
        ? `/user/desk/sync-from-resume?resume_id=${resumeId}`
        : '/user/desk/sync-from-resume'
      await api.post(url)
      await loadDeskForProfile(activeProfileId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSyncing(false)
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

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-9 w-40" />
      </div>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  )

  return (
    <>
    {/* ── Resume picker modal ───────────────────────────────── */}
    {showResumePicker && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResumePicker(false)} />
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Pick a Resume to Import</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The selected resume's data will fill your Career Desk profile.
              </p>
            </div>
            <button onClick={() => setShowResumePicker(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto">
            {loadingResumes ? (
              <div className="space-y-2 p-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : resumeList.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">No resumes uploaded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Upload a resume first from My Resumes.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {resumeList.map(r => (
                  <button
                    key={r.id}
                    onClick={() => syncFromResume(r.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand-100 dark:group-hover:bg-brand-900 transition-colors">
                      <FileText size={14} className="text-brand-700 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.name}</p>
                      {r.role && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.role}</p>}
                      {r.lastModified && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {new Date(r.lastModified).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity self-center font-medium">
                      Import →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Career Desk</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your master profile — powers Resume Builder, AutoPilot, and ATS Scanner.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && <Badge variant="success">Saved</Badge>}

          {/* Profile switcher */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileMenuOpen(v => !v)}
              className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <User size={13} />
              <span className="max-w-[120px] truncate">{activeProfileName}</span>
              <ChevronDown size={13} className={`transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Switch Profile</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {profiles.map(p => (
                    <div key={p.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${p.id === activeProfileId ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}>
                      {renamingId === p.id ? (
                        <input
                          className="flex-1 text-sm border border-brand-400 rounded px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none"
                          value={renameValue}
                          autoFocus
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameProfile(p.id); if (e.key === 'Escape') setRenamingId(null) }}
                          onBlur={() => renameProfile(p.id)}
                        />
                      ) : (
                        <button
                          className={`flex-1 text-left text-sm truncate ${p.id === activeProfileId ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                          onClick={() => switchProfile(p.id)}
                        >
                          {p.name}
                          {p.id === activeProfileId && <span className="ml-1.5 text-[10px] text-brand-500">Active</span>}
                        </button>
                      )}
                      <button
                        onClick={() => { setRenamingId(p.id); setRenameValue(p.name) }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Rename"
                      >
                        <Pencil size={11} />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={() => deleteProfile(p.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 p-2">
                  {creatingProfile ? (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
                        placeholder="Profile name (e.g. 'Mom', 'Dev Role')"
                        value={newProfileName}
                        autoFocus
                        onChange={e => setNewProfileName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') createProfile(); if (e.key === 'Escape') setCreatingProfile(false) }}
                      />
                      <button onClick={createProfile} className="px-2 py-1 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-800 transition-colors">Add</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreatingProfile(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors"
                    >
                      <UserPlus size={13} /> New profile (family member / different role)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={openResumePicker} loading={syncing}>
            <RefreshCw size={14} /> Import from resume
          </Button>
          <Button onClick={save} loading={saving}><Save size={14} /> Save</Button>
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
    </>
  )
}
