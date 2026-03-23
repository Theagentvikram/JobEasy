from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.auth import get_current_user
from services.firebase import get_db
import uuid as _uuid

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


@router.get("/desk/resumes")
async def list_resumes_for_desk(user=Depends(get_current_user)):
    """Return the user's uploaded resumes so they can pick one to import."""
    user_id = user['uid']
    db = get_db()
    docs = list(db.collection('resumes').where('userId', '==', user_id).stream())
    resumes = []
    for d in docs:
        data = d.to_dict()
        resumes.append({
            "id": d.id,
            "name": data.get("title") or data.get("name") or data.get("fileName") or "Untitled Resume",
            "lastModified": data.get("lastModified") or data.get("updatedAt") or "",
            "role": (data.get("personalInfo") or data.get("profile") or {}).get("jobTitle") or (data.get("personalInfo") or data.get("profile") or {}).get("role") or "",
        })
    # Sort by lastModified descending
    resumes.sort(key=lambda r: r["lastModified"] or "", reverse=True)
    return resumes


@router.post("/desk/sync-from-resume")
async def sync_desk_from_resume(
    user=Depends(get_current_user),
    resume_id: Optional[str] = None,
):
    """Re-sync Career Desk from a specific resume (or the most recent if no id given)."""
    user_id = user['uid']
    db = get_db()

    if resume_id:
        doc = db.collection('resumes').document(resume_id).get()
        if not doc.exists or doc.to_dict().get('userId') != user_id:
            raise HTTPException(404, "Resume not found")
        parsed = doc.to_dict()
    else:
        # Fall back to most recent
        docs = list(db.collection('resumes').where('userId', '==', user_id).stream())
        if docs:
            docs.sort(key=lambda d: d.to_dict().get('lastModified', 0), reverse=True)
            docs = docs[:1]
        if not docs:
            raise HTTPException(404, "No resumes found. Upload a resume first.")
        parsed = docs[0].to_dict()

    # Sync into the active profile doc (not the legacy career_desk)
    meta = _meta_ref(db, user_id).get()
    active_id = meta.to_dict().get('activeProfileId') if meta.exists else None
    if active_id:
        profile_ref = _profiles_ref(db, user_id).document(active_id)
        if profile_ref.get().exists:
            sync_resume_to_desk(user_id, parsed, profile_ref=profile_ref)
            return {"status": "synced"}
    # Fallback to legacy career_desk
    sync_resume_to_desk(user_id, parsed)
    return {"status": "synced"}


# ── Profile management ────────────────────────────────────────

def _profiles_ref(db, user_id: str):
    return db.collection('users').document(user_id).collection('desk_profiles')

def _meta_ref(db, user_id: str):
    """Stores activeProfileId."""
    return db.collection('users').document(user_id).collection('data').document('desk_meta')


@router.get("/desk/profiles")
async def list_profiles(user=Depends(get_current_user)):
    """List all profiles for this user."""
    db = get_db()
    uid = user['uid']
    docs = list(_profiles_ref(db, uid).stream())
    profiles = [{"id": d.id, "name": d.to_dict().get("profileName", "Unnamed")} for d in docs]

    # If no profiles exist yet, migrate the existing career_desk as "default"
    if not profiles:
        existing_doc = db.collection('users').document(uid).collection('data').document('career_desk').get()
        existing = existing_doc.to_dict() if existing_doc.exists else {}
        profile_name = existing.get('profile', {}).get('name') or 'My Profile'
        _profiles_ref(db, uid).document('default').set({**existing, 'profileName': profile_name})
        profiles = [{"id": "default", "name": profile_name}]

    meta = _meta_ref(db, uid).get()
    active_id = meta.to_dict().get('activeProfileId', profiles[0]['id']) if meta.exists else profiles[0]['id']
    return {"profiles": profiles, "activeProfileId": active_id}


@router.post("/desk/profiles")
async def create_profile(payload: Dict[str, Any] = Body(...), user=Depends(get_current_user)):
    """Create a new empty profile."""
    db = get_db()
    uid = user['uid']
    profile_id = str(_uuid.uuid4())[:8]
    name = (payload.get('name') or 'New Profile').strip()
    new_profile = {
        'profileName': name,
        'profile': {'name': '', 'role': '', 'email': '', 'phone': '', 'location': '',
                    'linkedin': '', 'website': '', 'github': '', 'summary': ''},
        'skills': [], 'experiences': [], 'education': [], 'projects': [], 'certifications': [],
    }
    _profiles_ref(db, uid).document(profile_id).set(new_profile)
    # Switch to new profile
    _meta_ref(db, uid).set({'activeProfileId': profile_id}, merge=True)
    return {"id": profile_id, "name": name}


@router.get("/desk/profiles/{profile_id}")
async def get_profile(profile_id: str, user=Depends(get_current_user)):
    """Get a specific profile's desk data."""
    db = get_db()
    uid = user['uid']
    doc = _profiles_ref(db, uid).document(profile_id).get()
    if not doc.exists:
        # Auto-create default profile from legacy career_desk if first time
        if profile_id == 'default':
            legacy = db.collection('users').document(uid).collection('data').document('career_desk').get()
            existing = legacy.to_dict() if legacy.exists else {}
            profile_name = existing.get('profile', {}).get('name') or 'My Profile'
            _profiles_ref(db, uid).document('default').set({**existing, 'profileName': profile_name})
            return {**existing, 'profileName': profile_name, 'id': 'default'}
        raise HTTPException(404, "Profile not found")
    return {**doc.to_dict(), "id": profile_id}


@router.put("/desk/profiles/{profile_id}")
async def update_profile(profile_id: str, data: CareerDeskData, user=Depends(get_current_user)):
    """Save a profile's desk data."""
    db = get_db()
    uid = user['uid']
    doc_ref = _profiles_ref(db, uid).document(profile_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(404, "Profile not found")
    doc_ref.set(data.model_dump(exclude_unset=True), merge=True)
    return {"status": "ok"}


@router.patch("/desk/profiles/{profile_id}/rename")
async def rename_profile(profile_id: str, payload: Dict[str, Any] = Body(...), user=Depends(get_current_user)):
    db = get_db()
    uid = user['uid']
    name = (payload.get('name') or '').strip()
    if not name:
        raise HTTPException(400, "Name required")
    _profiles_ref(db, uid).document(profile_id).set({'profileName': name}, merge=True)
    return {"status": "ok"}


@router.delete("/desk/profiles/{profile_id}")
async def delete_profile(profile_id: str, user=Depends(get_current_user)):
    db = get_db()
    uid = user['uid']
    docs = list(_profiles_ref(db, uid).stream())
    if len(docs) <= 1:
        raise HTTPException(400, "Cannot delete the only profile")
    _profiles_ref(db, uid).document(profile_id).delete()
    # Switch active to first remaining
    remaining = [d.id for d in docs if d.id != profile_id]
    _meta_ref(db, uid).set({'activeProfileId': remaining[0]}, merge=True)
    return {"status": "ok", "activeProfileId": remaining[0]}


@router.post("/desk/profiles/{profile_id}/activate")
async def activate_profile(profile_id: str, user=Depends(get_current_user)):
    db = get_db()
    uid = user['uid']
    doc = _profiles_ref(db, uid).document(profile_id).get()
    if not doc.exists:
        raise HTTPException(404, "Profile not found")
    _meta_ref(db, uid).set({'activeProfileId': profile_id}, merge=True)
    return {**doc.to_dict(), "id": profile_id}


@router.get("/desk/text")
async def get_desk_as_text(user=Depends(get_current_user)):
    """Return Desk as plain text for AutoPilot / AI features. Reads active profile."""
    user_id = user['uid']
    db = get_db()
    # Try active profile first
    meta = _meta_ref(db, user_id).get()
    active_id = meta.to_dict().get('activeProfileId') if meta.exists else None
    if active_id:
        prof_doc = _profiles_ref(db, user_id).document(active_id).get()
        if prof_doc.exists:
            d = prof_doc.to_dict()
            return {"text": _desk_to_text(d), "desk": d}
    # Fallback to legacy career_desk
    doc = db.collection('users').document(user_id).collection('data').document('career_desk').get()
    if not doc.exists:
        raise HTTPException(404, "Career Desk is empty. Add your details first.")
    d = doc.to_dict()
    return {"text": _desk_to_text(d), "desk": d}


# ── Internal helper (called by resumes router) ────────────────

def sync_resume_to_desk(user_id: str, parsed: dict, profile_ref=None):
    """Merge parsed resume data into Career Desk without overwriting existing data.

    If profile_ref is provided, syncs into that profile doc.
    Otherwise falls back to the legacy career_desk doc.
    """
    import uuid
    db = get_db()
    doc_ref = profile_ref or db.collection('users').document(user_id).collection('data').document('career_desk')
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
