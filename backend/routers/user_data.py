from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from services.auth import get_current_user
from services.firebase import get_db

router = APIRouter(prefix="/user", tags=["User Data"])


# ── Desk Models ───────────────────────────────────────────────

class UserProfile(BaseModel):
    name: str = ""
    role: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str = ""
    github: str = ""
    summary: str = ""

class DeskExperience(BaseModel):
    id: str
    role: str = ""
    company: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    description: str = ""

class DeskEducation(BaseModel):
    id: str
    degree: str = ""
    school: str = ""
    year: str = ""
    gpa: str = ""
    description: str = ""

class DeskProject(BaseModel):
    id: str
    name: str = ""
    tech: str = ""
    description: str = ""
    link: str = ""

class DeskCertification(BaseModel):
    id: str
    name: str = ""
    issuer: str = ""
    date: str = ""

class CareerDeskData(BaseModel):
    profile: Optional[UserProfile] = None
    skills: Optional[List[str]] = None
    experiences: Optional[List[DeskExperience]] = None
    education: Optional[List[DeskEducation]] = None
    projects: Optional[List[DeskProject]] = None
    certifications: Optional[List[DeskCertification]] = None


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/desk")
async def get_career_desk(user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    doc = db.collection('users').document(user_id).collection('data').document('career_desk').get()
    if doc.exists:
        return doc.to_dict()
    return {"profile": None, "skills": [], "experiences": [], "education": [], "projects": [], "certifications": []}


@router.put("/desk")
async def update_career_desk(data: CareerDeskData, user=Depends(get_current_user)):
    user_id = user['uid']
    db = get_db()
    doc_ref = db.collection('users').document(user_id).collection('data').document('career_desk')
    doc_ref.set(data.model_dump(exclude_unset=True), merge=True)
    return {"status": "success"}


@router.get("/desk/text")
async def get_desk_as_text(user=Depends(get_current_user)):
    """Return Desk as plain text for AutoPilot / AI features."""
    user_id = user['uid']
    db = get_db()
    doc = db.collection('users').document(user_id).collection('data').document('career_desk').get()
    if not doc.exists:
        raise HTTPException(404, "Career Desk is empty. Add your details first.")
    d = doc.to_dict()
    return {"text": _desk_to_text(d), "desk": d}


# ── Internal helper (called by resumes router) ────────────────

def sync_resume_to_desk(user_id: str, parsed: dict):
    """Merge parsed resume data into Career Desk without overwriting existing data."""
    import uuid
    db = get_db()
    doc_ref = db.collection('users').document(user_id).collection('data').document('career_desk')
    doc = doc_ref.get()
    existing = doc.to_dict() if doc.exists else {}
    pi = parsed.get('personalInfo', {})
    ep = existing.get('profile') or {}

    updates = {
        'profile': {
            'name':     ep.get('name')     or pi.get('fullName', ''),
            'role':     ep.get('role')     or pi.get('title', ''),
            'email':    ep.get('email')    or pi.get('email', ''),
            'phone':    ep.get('phone')    or pi.get('phone', ''),
            'location': ep.get('location') or pi.get('location', ''),
            'linkedin': ep.get('linkedin') or pi.get('linkedin', ''),
            'website':  ep.get('website')  or pi.get('website', ''),
            'github':   ep.get('github')   or '',
            'summary':  ep.get('summary')  or parsed.get('summary', ''),
        }
    }

    # Skills — merge deduplicated
    existing_skills = existing.get('skills') or []
    updates['skills'] = existing_skills + [s for s in (parsed.get('skills') or []) if s not in existing_skills]

    # Experiences — append new by role+company key
    exps = list(existing.get('experiences') or [])
    exp_keys = {(e.get('role','').lower(), e.get('company','').lower()) for e in exps}
    for exp in (parsed.get('experience') or []):
        key = (exp.get('role','').lower(), exp.get('company','').lower())
        if key not in exp_keys:
            exps.append({'id': str(uuid.uuid4()), 'role': exp.get('role',''), 'company': exp.get('company',''),
                         'startDate': exp.get('startDate',''), 'endDate': exp.get('endDate',''),
                         'current': False, 'description': exp.get('description','')})
            exp_keys.add(key)
    updates['experiences'] = exps

    # Education — append new by degree+school key
    edu = list(existing.get('education') or [])
    edu_keys = {(e.get('degree','').lower(), e.get('school','').lower()) for e in edu}
    for e in (parsed.get('education') or []):
        key = (e.get('degree','').lower(), e.get('school','').lower())
        if key not in edu_keys:
            edu.append({'id': str(uuid.uuid4()), 'degree': e.get('degree',''), 'school': e.get('school',''),
                        'year': e.get('year',''), 'gpa': '', 'description': ''})
            edu_keys.add(key)
    updates['education'] = edu

    # Projects — append new by name
    projs = list(existing.get('projects') or [])
    proj_keys = {p.get('name','').lower() for p in projs}
    for p in (parsed.get('projects') or []):
        name = p.get('name','')
        if name.lower() not in proj_keys:
            projs.append({'id': str(uuid.uuid4()), 'name': name, 'tech': '',
                          'description': p.get('description',''), 'link': p.get('link','')})
            proj_keys.add(name.lower())
    updates['projects'] = projs

    # Certifications — append new by name
    certs = list(existing.get('certifications') or [])
    cert_keys = {c.get('name','').lower() for c in certs}
    for c in (parsed.get('certifications') or []):
        name = c.get('name','') if isinstance(c, dict) else str(c)
        if name.lower() not in cert_keys:
            certs.append({'id': str(uuid.uuid4()), 'name': name,
                          'issuer': c.get('issuer','') if isinstance(c, dict) else '',
                          'date': c.get('date','') if isinstance(c, dict) else ''})
            cert_keys.add(name.lower())
    updates['certifications'] = certs

    doc_ref.set(updates, merge=True)


def _desk_to_text(d: dict) -> str:
    """Convert Career Desk dict to plain-text resume for AI."""
    lines = []
    p = d.get('profile') or {}
    if p.get('name'): lines.append(f"# {p['name']}")
    if p.get('role'): lines.append(p['role'])
    contact = ' | '.join(filter(None, [p.get('email'), p.get('phone'), p.get('location'), p.get('linkedin'), p.get('website')]))
    if contact: lines.append(contact)
    if p.get('summary'): lines += ['', '## Summary', p['summary']]
    if d.get('skills'): lines += ['', '## Skills', ', '.join(d['skills'])]

    exps = d.get('experiences') or []
    if exps:
        lines += ['', '## Experience']
        for e in exps:
            end = 'Present' if e.get('current') else e.get('endDate','')
            dr = f"{e.get('startDate','')} – {end}".strip(' –')
            lines.append(f"### {e.get('role','')} at {e.get('company','')} ({dr})")
            if e.get('description'): lines.append(e['description'])

    edu = d.get('education') or []
    if edu:
        lines += ['', '## Education']
        for e in edu:
            lines.append(f"- {e.get('degree','')} — {e.get('school','')} ({e.get('year','')})")

    projs = d.get('projects') or []
    if projs:
        lines += ['', '## Projects']
        for p in projs:
            tech = f" [{p['tech']}]" if p.get('tech') else ''
            lines.append(f"### {p.get('name','')}{tech}")
            if p.get('description'): lines.append(p['description'])

    certs = d.get('certifications') or []
    if certs:
        lines += ['', '## Certifications']
        for c in certs:
            lines.append(f"- {c.get('name','')} — {c.get('issuer','')} ({c.get('date','')})")

    return '\n'.join(lines)
