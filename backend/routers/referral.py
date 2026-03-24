from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from models import Job, Outreach, JobStatus, OutreachStatus
from services.firebase import get_db
from services.auth import get_current_user
from services.job_url_extractor import extract_job_from_url, extract_job_from_text, merge_extracted_jobs
import uuid
import math
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/referral", tags=["Referral Flow"])

STATUS_ALIASES = {
    "waiting_for_referral": JobStatus.WAITING_REFERRAL,
    # Legacy → new
    "waitingReferral": JobStatus.SAVED,
    "waiting_referral": JobStatus.SAVED,
    "referral_received": JobStatus.SAVED,
    "apply_today": JobStatus.SAVED,
    "closed": JobStatus.REJECTED,
    "withdrawn": JobStatus.REJECTED,
}

VALID_JOB_STATUSES = {
    JobStatus.SAVED,
    JobStatus.APPLIED,
    JobStatus.INTERVIEW,
    JobStatus.OFFER,
    JobStatus.REJECTED,
    JobStatus.WITHDRAWN,
    # Legacy — kept so old docs can still be updated
    JobStatus.WAITING_REFERRAL,
    JobStatus.REFERRAL_RECEIVED,
    JobStatus.APPLY_TODAY,
    JobStatus.CLOSED,
}

VALID_OUTREACH_STATUSES = {
    OutreachStatus.PENDING,
    OutreachStatus.VIEWED,
    OutreachStatus.REPLIED,
    OutreachStatus.REFERRAL_GIVEN,
    OutreachStatus.DECLINED,
    OutreachStatus.NO_RESPONSE,
    OutreachStatus.ACCEPTED,  # legacy
    OutreachStatus.REJECTED,  # legacy
}

VALID_SORT_FIELDS = {
    "dateDiscovered",
    "autoMoveDate",
    "updatedAt",
    "priority",
    "company",
    "title",
    "status",
}

TERMINAL_STATUSES = {
    JobStatus.REJECTED,
    JobStatus.WITHDRAWN,
    JobStatus.CLOSED,
    JobStatus.OFFER,
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        normalized = value.strip()
        if len(normalized) == 10:
            normalized = f"{normalized}T00:00:00+00:00"
        normalized = normalized.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def normalize_status(status: Optional[str]) -> str:
    raw = (status or JobStatus.SAVED).strip()
    normalized = STATUS_ALIASES.get(raw, STATUS_ALIASES.get(raw.lower(), raw.lower()))
    if normalized not in VALID_JOB_STATUSES:
        return JobStatus.SAVED
    return normalized


def normalize_source(source: Optional[str]) -> str:
    raw = (source or "other").strip().lower()
    return raw.replace(" ", "_")


def normalize_outreach_status(status: Optional[str]) -> str:
    normalized = (status or OutreachStatus.PENDING).strip().lower()
    if normalized not in VALID_OUTREACH_STATUSES:
        return OutreachStatus.PENDING
    return normalized


def clamp_priority(priority: Any) -> int:
    try:
        p = int(priority)
    except Exception:
        return 0
    return min(3, max(0, p))


def sanitize_waiting_period(waiting_period: Any) -> int:
    try:
        value = int(waiting_period)
    except Exception:
        return 2
    return max(0, value)


def compute_auto_move_date(date_discovered: Optional[str], waiting_period_days: int) -> str:
    discovered_dt = parse_dt(date_discovered) or now_utc()
    return (discovered_dt + timedelta(days=max(0, waiting_period_days))).isoformat()


def compute_days_until_apply(auto_move_date: Optional[str]) -> Optional[int]:
    target = parse_dt(auto_move_date)
    if not target:
        return None
    total_seconds = (target - now_utc()).total_seconds()
    if total_seconds >= 0:
        return math.ceil(total_seconds / 86400)
    return math.floor(total_seconds / 86400)


def effective_status_for_job(job: Job) -> str:
    if job.status == JobStatus.WAITING_REFERRAL:
        auto_move_dt = parse_dt(job.autoMoveDate)
        if auto_move_dt and auto_move_dt <= now_utc():
            return JobStatus.APPLY_TODAY
    return job.status


def normalize_outreach_dict(item: Dict[str, Any], job_id: str) -> Dict[str, Any]:
    response_status = normalize_outreach_status(item.get("responseStatus") or item.get("status"))

    # Keep legacy `status` field in sync for older frontend code paths.
    legacy_status = item.get("status")
    if not legacy_status:
        if response_status in {OutreachStatus.ACCEPTED, OutreachStatus.REJECTED, OutreachStatus.NO_RESPONSE}:
            legacy_status = response_status
        else:
            legacy_status = OutreachStatus.PENDING

    date_connected = item.get("dateConnected") or item.get("dateConnnected") or now_iso()

    return {
        **item,
        "id": item.get("id") or str(uuid.uuid4()),
        "jobId": item.get("jobId") or job_id,
        "contactName": item.get("contactName") or "",
        "contactTitle": item.get("contactTitle") or "",
        "platform": normalize_source(item.get("platform") or "linkedin"),
        "contactLink": item.get("contactLink") or "",
        "responseStatus": response_status,
        "status": legacy_status,
        "messageSent": item.get("messageSent") or "",
        "responseNotes": item.get("responseNotes") or "",
        "notes": item.get("notes") or "",
        "dateConnected": date_connected,
        "dateConnnected": item.get("dateConnnected") or date_connected,
        "dateResponded": item.get("dateResponded") or "",
        "followUpDate": item.get("followUpDate") or "",
        "createdAt": item.get("createdAt") or now_iso(),
    }


def build_job(data: Dict[str, Any]) -> Job:
    payload = dict(data)
    payload["status"] = normalize_status(payload.get("status"))
    payload["source"] = normalize_source(payload.get("source"))
    payload["priority"] = clamp_priority(payload.get("priority", 0))
    payload["waitingPeriod"] = sanitize_waiting_period(payload.get("waitingPeriod", 2))

    if not payload.get("dateDiscovered"):
        payload["dateDiscovered"] = now_iso()

    if not payload.get("autoMoveDate"):
        payload["autoMoveDate"] = compute_auto_move_date(payload["dateDiscovered"], payload["waitingPeriod"])

    outreach_items = payload.get("outreach") or []
    if not isinstance(outreach_items, list):
        outreach_items = []
    payload["outreach"] = [
        normalize_outreach_dict(item, payload.get("id", "")) for item in outreach_items if isinstance(item, dict)
    ]
    payload["outreachCount"] = int(payload.get("outreachCount") or len(payload["outreach"]))

    payload["tags"] = [str(tag).strip() for tag in (payload.get("tags") or []) if str(tag).strip()]
    payload["jobType"] = (payload.get("jobType") or "unknown").lower()
    payload["sponsorshipRequired"] = bool(payload.get("sponsorshipRequired", False))
    payload["createdAt"] = payload.get("createdAt") or payload["dateDiscovered"]
    payload["updatedAt"] = payload.get("updatedAt") or now_iso()
    payload["effectiveStatus"] = payload.get("effectiveStatus")
    payload["daysUntilApply"] = payload.get("daysUntilApply")

    return Job(**payload)


def with_effective_fields(job: Job) -> Job:
    effective_status = effective_status_for_job(job)
    job.status = effective_status
    job.effectiveStatus = effective_status
    job.daysUntilApply = compute_days_until_apply(job.autoMoveDate)
    return job


def list_user_jobs_raw(db, user_id: str) -> List[Dict[str, Any]]:
    docs = db.collection("jobs").where("userId", "==", user_id).stream()
    return [doc.to_dict() for doc in docs]


def sync_tracker_sheet_for_user(db, user_id: str):
    try:
        from services.google_sheets import sync_job_tracker_sheet
        sync_job_tracker_sheet(db, user_id)
    except Exception as exc:
        print(f"[Referral] Google Sheets sync failed for user {user_id}: {exc}")


def assert_job_ownership_or_404(db, job_id: str, user_id: str):
    doc_ref = db.collection("jobs").document(job_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    data = doc.to_dict()
    if data.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return doc_ref, data


def apply_status_side_effects(job_payload: Dict[str, Any]):
    status = normalize_status(job_payload.get("status"))
    now_value = now_iso()

    if status == JobStatus.APPLIED and not job_payload.get("dateApplied"):
        job_payload["dateApplied"] = now_value

    if status in TERMINAL_STATUSES and not job_payload.get("dateClosed"):
        job_payload["dateClosed"] = now_value

    if status == JobStatus.WAITING_REFERRAL:
        job_payload["autoMoveDate"] = compute_auto_move_date(
            job_payload.get("dateDiscovered"),
            sanitize_waiting_period(job_payload.get("waitingPeriod")),
        )


def get_user_jobspy_setting(db, user_id: str) -> bool:
    """
    Per-user JobSpy toggle. Defaults to False for speed/reliability.
    Supports both:
    - users/{uid}.settings.jobspy_enabled
    - users/{uid}.jobspy_enabled (legacy/simple path)
    """
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return False

    data = doc.to_dict() or {}
    settings = data.get("settings") or {}
    if isinstance(settings, dict) and "jobspy_enabled" in settings:
        return bool(settings.get("jobspy_enabled"))
    return bool(data.get("jobspy_enabled", False))


@router.post("/jobs/extract")
async def extract_job_details_from_url(payload: Dict[str, Any] = Body(...), user=Depends(get_current_user)):
    db = get_db()
    user_id = user["uid"]
    raw_url = (payload.get("url") or "").strip()
    raw_text = (payload.get("rawText") or "").strip()

    if not raw_url and not raw_text:
        raise HTTPException(status_code=422, detail="Provide a job URL or pasted job text.")

    warnings: List[str] = []
    methods: List[str] = []
    url_result = None
    text_result = None
    try:
        jobspy_enabled = get_user_jobspy_setting(db, user_id)

        if raw_url:
            url_result = extract_job_from_url(raw_url, jobspy_enabled=jobspy_enabled)
            methods.append(url_result.method)
            warnings.extend(url_result.warnings)
        if raw_text:
            text_result = extract_job_from_text(raw_text, fallback_url=raw_url, source_hint="linkedin" if "linkedin.com" in raw_url.lower() else "other")
            methods.append(text_result.method)
            warnings.extend(text_result.warnings)

        merged_job = merge_extracted_jobs(url_result.job if url_result else None, text_result.job if text_result else None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to extract job details: {exc}")

    return {
        "job": merged_job.__dict__,
        "method": " + ".join(methods) if methods else "unknown",
        "warnings": list(dict.fromkeys(warnings)),
        "fetchedAt": now_iso(),
    }


@router.get("/jobs", response_model=List[Job])
async def list_jobs(
    status: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    sort: str = Query(default="dateDiscovered"),
    order: str = Query(default="desc"),
    user=Depends(get_current_user),
):
    db = get_db()
    user_id = user["uid"]

    raw_jobs = list_user_jobs_raw(db, user_id)
    jobs = [with_effective_fields(build_job(raw)) for raw in raw_jobs]

    normalized_status_filter = normalize_status(status) if status and status != "all" else None
    normalized_source_filter = normalize_source(source) if source and source != "all" else None

    if normalized_status_filter:
        jobs = [job for job in jobs if normalize_status(job.status) == normalized_status_filter]

    if normalized_source_filter:
        jobs = [job for job in jobs if normalize_source(job.source) == normalized_source_filter]

    sort_field = sort if sort in VALID_SORT_FIELDS else "dateDiscovered"
    reverse = order.lower() != "asc"

    def sort_key(job: Job):
        value = getattr(job, sort_field, None)
        if sort_field in {"dateDiscovered", "autoMoveDate", "updatedAt"}:
            return parse_dt(value) or datetime.min.replace(tzinfo=timezone.utc)
        if sort_field == "priority":
            return int(value or 0)
        return str(value or "").lower()

    jobs.sort(key=sort_key, reverse=reverse)
    return jobs


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    _, data = assert_job_ownership_or_404(db, job_id, user["uid"])
    return with_effective_fields(build_job(data))


@router.post("/jobs", response_model=Job)
async def create_job(payload: Dict[str, Any] = Body(...), user=Depends(get_current_user)):
    db = get_db()
    user_id = user["uid"]

    title = (payload.get("title") or "").strip().lower()
    company = (payload.get("company") or "").strip().lower()

    if not title or not company:
        raise HTTPException(status_code=422, detail="Both title and company are required.")

    # Free-tier friendly dedupe in app layer (avoids complex Firestore indexes).
    existing = list_user_jobs_raw(db, user_id)
    for item in existing:
        if (item.get("title") or "").strip().lower() == title and (item.get("company") or "").strip().lower() == company:
            raise HTTPException(status_code=409, detail="This job already exists in your Referral Flow.")

    payload = dict(payload)
    payload["id"] = payload.get("id") or str(uuid.uuid4())
    payload["userId"] = user_id
    payload["status"] = normalize_status(payload.get("status"))
    payload["source"] = normalize_source(payload.get("source"))
    payload["waitingPeriod"] = sanitize_waiting_period(payload.get("waitingPeriod", 2))
    payload["dateDiscovered"] = payload.get("dateDiscovered") or now_iso()
    payload["createdAt"] = payload.get("createdAt") or now_iso()
    payload["updatedAt"] = now_iso()
    payload["outreach"] = payload.get("outreach") or []
    payload["outreachCount"] = int(payload.get("outreachCount") or len(payload["outreach"]))
    apply_status_side_effects(payload)

    job = build_job(payload)
    db.collection("jobs").document(job.id).set(job.model_dump())
    sync_tracker_sheet_for_user(db, user_id)
    return with_effective_fields(job)


@router.put("/jobs/{job_id}", response_model=Job)
@router.patch("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, payload: Dict[str, Any] = Body(...), user=Depends(get_current_user)):
    db = get_db()
    user_id = user["uid"]

    doc_ref, current_data = assert_job_ownership_or_404(db, job_id, user_id)

    merged = {**current_data, **payload}
    merged["id"] = job_id
    merged["userId"] = user_id
    merged["updatedAt"] = now_iso()
    merged["status"] = normalize_status(merged.get("status"))
    merged["source"] = normalize_source(merged.get("source"))
    merged["priority"] = clamp_priority(merged.get("priority", 0))
    merged["waitingPeriod"] = sanitize_waiting_period(merged.get("waitingPeriod", 2))

    if "outreach" in merged and isinstance(merged["outreach"], list):
        merged["outreachCount"] = len(merged["outreach"])

    apply_status_side_effects(merged)

    job = build_job(merged)
    doc_ref.set(job.model_dump())
    sync_tracker_sheet_for_user(db, user_id)
    return with_effective_fields(job)


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc_ref, _ = assert_job_ownership_or_404(db, job_id, user["uid"])
    doc_ref.delete()
    sync_tracker_sheet_for_user(db, user["uid"])
    return {"status": "success", "id": job_id}


@router.get("/jobs/{job_id}/contacts", response_model=List[Outreach])
async def list_contacts(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    _, data = assert_job_ownership_or_404(db, job_id, user["uid"])
    job = build_job(data)
    return job.outreach


@router.post("/jobs/{job_id}/contacts", response_model=Job)
async def add_contact(
    job_id: str,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
):
    db = get_db()
    doc_ref, current_data = assert_job_ownership_or_404(db, job_id, user["uid"])
    job = build_job(current_data)

    normalized_contact = normalize_outreach_dict(payload, job_id)
    job.outreach.append(Outreach(**normalized_contact))
    job.outreachCount = len(job.outreach)

    if normalized_contact.get("responseStatus") in {OutreachStatus.REFERRAL_GIVEN, OutreachStatus.ACCEPTED}:
        if job.status in {JobStatus.WAITING_REFERRAL, JobStatus.APPLY_TODAY}:
            job.status = JobStatus.REFERRAL_RECEIVED

    job.updatedAt = now_iso()
    doc_ref.set(job.model_dump())
    sync_tracker_sheet_for_user(db, user["uid"])
    return with_effective_fields(job)


@router.patch("/jobs/{job_id}/contacts/{contact_id}", response_model=Job)
async def update_contact(
    job_id: str,
    contact_id: str,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
):
    db = get_db()
    doc_ref, current_data = assert_job_ownership_or_404(db, job_id, user["uid"])
    job = build_job(current_data)

    updated = False
    outreach_dicts: List[Dict[str, Any]] = [o.model_dump() for o in job.outreach]
    for index, contact in enumerate(outreach_dicts):
        if contact.get("id") == contact_id:
            merged = {**contact, **payload, "id": contact_id, "jobId": job_id}
            normalized = normalize_outreach_dict(merged, job_id)
            outreach_dicts[index] = normalized
            updated = True
            if normalized.get("responseStatus") in {OutreachStatus.REFERRAL_GIVEN, OutreachStatus.ACCEPTED}:
                if job.status in {JobStatus.WAITING_REFERRAL, JobStatus.APPLY_TODAY}:
                    job.status = JobStatus.REFERRAL_RECEIVED
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Contact not found")

    job.outreach = [Outreach(**item) for item in outreach_dicts]
    job.outreachCount = len(job.outreach)
    job.updatedAt = now_iso()
    doc_ref.set(job.model_dump())
    sync_tracker_sheet_for_user(db, user["uid"])
    return with_effective_fields(job)


@router.delete("/jobs/{job_id}/contacts/{contact_id}", response_model=Job)
async def delete_contact(job_id: str, contact_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc_ref, current_data = assert_job_ownership_or_404(db, job_id, user["uid"])
    job = build_job(current_data)

    filtered = [o for o in job.outreach if o.id != contact_id]
    if len(filtered) == len(job.outreach):
        raise HTTPException(status_code=404, detail="Contact not found")

    job.outreach = filtered
    job.outreachCount = len(job.outreach)
    job.updatedAt = now_iso()
    doc_ref.set(job.model_dump())
    sync_tracker_sheet_for_user(db, user["uid"])
    return with_effective_fields(job)


@router.post("/outreach", response_model=Job)
async def add_outreach_legacy(outreach: Outreach, user=Depends(get_current_user)):
    # Legacy endpoint preserved for compatibility with existing frontend calls.
    payload = outreach.model_dump()
    return await add_contact(outreach.jobId, payload, user)


@router.get("/stats")
async def get_stats(
    period: str = Query(default="week"),  # week | month | all
    user=Depends(get_current_user),
):
    db = get_db()
    user_id = user["uid"]

    raw_jobs = list_user_jobs_raw(db, user_id)
    jobs = [with_effective_fields(build_job(raw)) for raw in raw_jobs]

    now = now_utc()
    if period == "month":
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "all":
        start = datetime.min.replace(tzinfo=timezone.utc)
    else:
        start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

    discovered_jobs = [job for job in jobs if (parse_dt(job.dateDiscovered) or now) >= start]
    jobs_discovered = len(discovered_jobs)

    outreach_entries = []
    for job in jobs:
        for contact in job.outreach:
            connected = parse_dt(contact.dateConnected or contact.dateConnnected) or now
            if connected >= start:
                outreach_entries.append((job, contact, connected))

    outreach_sent = len(outreach_entries)
    referrals_received = sum(
        1 for _, contact, _ in outreach_entries
        if normalize_outreach_status(contact.responseStatus or contact.status) in {OutreachStatus.REFERRAL_GIVEN, OutreachStatus.ACCEPTED}
    )

    def is_applied_or_beyond(job: Job):
        return job.status in {
            JobStatus.APPLIED,
            JobStatus.INTERVIEW,
            JobStatus.OFFER,
            JobStatus.REJECTED,
            JobStatus.WITHDRAWN,
            JobStatus.CLOSED,
        }

    applications_sent = 0
    interviews_scheduled = 0
    for job in jobs:
        status = normalize_status(job.status)
        if status == JobStatus.INTERVIEW:
            interviews_scheduled += 1
        if not is_applied_or_beyond(job):
            continue
        applied_at = parse_dt(job.dateApplied) or parse_dt(job.updatedAt) or parse_dt(job.dateDiscovered) or now
        if applied_at >= start:
            applications_sent += 1

    referral_rate = round((referrals_received / outreach_sent) * 100, 2) if outreach_sent else 0.0
    application_rate = round((applications_sent / jobs_discovered) * 100, 2) if jobs_discovered else 0.0

    # Avg time to referral
    referral_deltas_hours: List[float] = []
    for job in jobs:
        discovered_at = parse_dt(job.dateDiscovered)
        if not discovered_at:
            continue
        referral_times = []
        for contact in job.outreach:
            rs = normalize_outreach_status(contact.responseStatus or contact.status)
            if rs not in {OutreachStatus.REFERRAL_GIVEN, OutreachStatus.ACCEPTED}:
                continue
            responded_at = parse_dt(contact.dateResponded) or parse_dt(contact.dateConnected or contact.dateConnnected)
            if responded_at:
                referral_times.append(responded_at)
        if referral_times:
            first_referral = min(referral_times)
            hours = (first_referral - discovered_at).total_seconds() / 3600
            referral_deltas_hours.append(max(0.0, hours))

    avg_time_to_referral_hours = round(
        sum(referral_deltas_hours) / len(referral_deltas_hours), 2
    ) if referral_deltas_hours else 0.0

    # Platform breakdown
    platform_breakdown: Dict[str, Dict[str, Any]] = {}
    for _, contact, _ in outreach_entries:
        platform = normalize_source(contact.platform)
        bucket = platform_breakdown.setdefault(platform, {"sent": 0, "replied": 0, "rate": 0.0})
        bucket["sent"] += 1
        if normalize_outreach_status(contact.responseStatus or contact.status) in {
            OutreachStatus.REPLIED,
            OutreachStatus.REFERRAL_GIVEN,
            OutreachStatus.ACCEPTED,
        }:
            bucket["replied"] += 1

    for platform, values in platform_breakdown.items():
        values["rate"] = round((values["replied"] / values["sent"]) * 100, 2) if values["sent"] else 0.0

    # Daily trend for last 7 days
    trend_start = (now - timedelta(days=6)).date()
    daily_map: Dict[str, Dict[str, Any]] = {}
    for i in range(7):
        day = trend_start + timedelta(days=i)
        day_key = day.isoformat()
        daily_map[day_key] = {"date": day_key, "discovered": 0, "applied": 0, "outreach": 0}

    for job in jobs:
        discovered = parse_dt(job.dateDiscovered)
        if discovered:
            key = discovered.date().isoformat()
            if key in daily_map:
                daily_map[key]["discovered"] += 1
        applied = parse_dt(job.dateApplied)
        if applied:
            key = applied.date().isoformat()
            if key in daily_map:
                daily_map[key]["applied"] += 1
        for contact in job.outreach:
            connected = parse_dt(contact.dateConnected or contact.dateConnnected)
            if connected:
                key = connected.date().isoformat()
                if key in daily_map:
                    daily_map[key]["outreach"] += 1

    return {
        "period": {
            "type": period,
            "start": start.isoformat(),
            "end": now.isoformat(),
        },
        "jobs_discovered": jobs_discovered,
        "outreach_sent": outreach_sent,
        "referrals_received": referrals_received,
        "applications_sent": applications_sent,
        "interviews_scheduled": interviews_scheduled,
        "referral_rate": referral_rate,
        "application_rate": application_rate,
        "avg_time_to_referral_hours": avg_time_to_referral_hours,
        "platform_breakdown": platform_breakdown,
        "daily_trend": list(daily_map.values()),
    }
