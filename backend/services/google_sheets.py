import json
import os
import re
from typing import Any, Optional

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


_SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"]
_sheets_service = None
_service_account_info_cache = None


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _load_service_account_info() -> dict[str, Any]:
    global _service_account_info_cache
    if _service_account_info_cache is not None:
        return _service_account_info_cache

    raw = os.getenv("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw:
        _service_account_info_cache = json.loads(raw)
        return _service_account_info_cache

    explicit_path = os.getenv("GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE")
    candidate_paths = [
        explicit_path,
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json"),
    ]
    for path in candidate_paths:
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                _service_account_info_cache = json.load(handle)
                return _service_account_info_cache

    raise RuntimeError("No Google service account credentials found for Sheets sync")


def get_service_account_email() -> str:
    return _load_service_account_info().get("client_email", "")


def get_credentials_source() -> str:
    if os.getenv("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON"):
        return "GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON"
    if os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"):
        return "FIREBASE_SERVICE_ACCOUNT_JSON"
    if os.getenv("GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE"):
        return "GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE"
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")
    if os.path.exists(path):
        return "serviceAccountKey.json"
    return "missing"


def _get_sheets_service():
    global _sheets_service
    if _sheets_service is not None:
        return _sheets_service

    creds = Credentials.from_service_account_info(
        _load_service_account_info(),
        scopes=_SHEETS_SCOPE,
    )
    _sheets_service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return _sheets_service


def resolve_sheets_settings(db, user_id: Optional[str], overrides: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    doc_data = {}
    if db is not None and user_id:
        try:
            doc = db.collection("autoapply_settings").document(user_id).get()
            doc_data = doc.to_dict() if doc.exists else {}
        except Exception:
            doc_data = {}

    merged = dict(doc_data)
    if overrides:
        for key, value in overrides.items():
            if value is not None:
                merged[key] = value

    enabled = merged.get("google_sheets_enabled")
    if enabled is None:
        enabled = _env_flag("GOOGLE_SHEETS_ENABLED", False)

    spreadsheet_id = (
        merged.get("google_sheets_spreadsheet_id")
        or os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
    )
    tracker_tab_base = (
        merged.get("google_sheets_job_tracker_tab")
        or os.getenv("GOOGLE_SHEETS_JOB_TRACKER_TAB", "Job Tracker")
    )
    autoapply_tab_base = (
        merged.get("google_sheets_autoapply_tab")
        or os.getenv("GOOGLE_SHEETS_AUTOAPPLY_TAB", "AutoApply Jobs")
    )

    return {
        "enabled": bool(enabled),
        "spreadsheet_id": spreadsheet_id,
        "job_tracker_tab_base": tracker_tab_base,
        "autoapply_tab_base": autoapply_tab_base,
    }


def _sheet_title(base: str, user_id: str) -> str:
    suffix = re.sub(r"[^A-Za-z0-9_-]", "_", (user_id or "unknown"))[:24]
    title = f"{base} - {suffix}"
    return title[:99]


def _ensure_sheet(service, spreadsheet_id: str, sheet_title: str):
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    sheets = spreadsheet.get("sheets", [])
    existing_titles = {
        item.get("properties", {}).get("title", "")
        for item in sheets
    }
    if sheet_title in existing_titles:
        return spreadsheet

    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": sheet_title,
                        }
                    }
                }
            ]
        },
    ).execute()
    return service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()


def _normalize_cell(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item not in (None, ""))
    if isinstance(value, dict):
        try:
            return json.dumps(value, ensure_ascii=True)
        except Exception:
            return str(value)
    return value


def _write_rows(spreadsheet_id: str, sheet_title: str, rows: list[list[Any]]):
    service = _get_sheets_service()
    _ensure_sheet(service, spreadsheet_id, sheet_title)

    value_rows = [[_normalize_cell(cell) for cell in row] for row in rows]
    service.spreadsheets().values().clear(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_title}'!A:Z",
    ).execute()
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_title}'!A1",
        valueInputOption="RAW",
        body={"values": value_rows},
    ).execute()


def _require_sync_config(config: dict[str, Any]) -> str:
    if not config.get("enabled"):
        raise RuntimeError("Google Sheets sync is disabled")
    spreadsheet_id = (config.get("spreadsheet_id") or "").strip()
    if not spreadsheet_id:
        raise RuntimeError("Google Sheets spreadsheet ID is missing")
    return spreadsheet_id


def get_google_sheets_status(db, user_id: str) -> dict[str, Any]:
    config = resolve_sheets_settings(db, user_id)
    status = {
        "enabled": config["enabled"],
        "spreadsheet_id": config["spreadsheet_id"],
        "job_tracker_tab_base": config["job_tracker_tab_base"],
        "autoapply_tab_base": config["autoapply_tab_base"],
        "job_tracker_sheet_title": _sheet_title(config["job_tracker_tab_base"], user_id),
        "autoapply_sheet_title": _sheet_title(config["autoapply_tab_base"], user_id),
        "service_account_email": "",
        "credentials_source": "missing",
        "service_account_ready": False,
        "spreadsheet_accessible": False,
        "spreadsheet_title": "",
        "available_sheets": [],
    }

    try:
        status["service_account_email"] = get_service_account_email()
        status["credentials_source"] = get_credentials_source()
        status["service_account_ready"] = True
    except Exception:
        return status

    spreadsheet_id = (config.get("spreadsheet_id") or "").strip()
    if not spreadsheet_id:
        return status

    try:
        service = _get_sheets_service()
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        status["spreadsheet_accessible"] = True
        status["spreadsheet_title"] = spreadsheet.get("properties", {}).get("title", "")
        status["available_sheets"] = [
            item.get("properties", {}).get("title", "")
            for item in spreadsheet.get("sheets", [])
        ]
    except Exception:
        status["spreadsheet_accessible"] = False

    return status


def test_google_sheets_access(db, user_id: str) -> dict[str, Any]:
    config = resolve_sheets_settings(db, user_id)
    spreadsheet_id = _require_sync_config(config)
    service = _get_sheets_service()
    spreadsheet = _ensure_sheet(
        service,
        spreadsheet_id,
        _sheet_title(config["job_tracker_tab_base"], user_id),
    )
    _ensure_sheet(
        service,
        spreadsheet_id,
        _sheet_title(config["autoapply_tab_base"], user_id),
    )
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    return {
        "status": "ok",
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_title": spreadsheet.get("properties", {}).get("title", ""),
        "sheet_titles": [
            item.get("properties", {}).get("title", "")
            for item in spreadsheet.get("sheets", [])
        ],
        "service_account_email": get_service_account_email(),
    }


def sync_job_tracker_sheet(db, user_id: str, config: Optional[dict[str, Any]] = None):
    config = config or resolve_sheets_settings(db, user_id)
    spreadsheet_id = _require_sync_config(config)

    docs = list(db.collection("jobs").where("userId", "==", user_id).stream())
    jobs = [doc.to_dict() for doc in docs]
    jobs.sort(key=lambda item: item.get("updatedAt", ""), reverse=True)

    rows = [[
        "job_id", "title", "company", "status", "source", "location", "link",
        "priority", "job_type", "date_discovered", "date_applied", "updated_at",
        "outreach_count", "tags", "notes", "autopilot_resume_id", "autopilot_session_job_id",
    ]]
    for job in jobs:
        rows.append([
            job.get("id", ""),
            job.get("title", ""),
            job.get("company", ""),
            job.get("status", ""),
            job.get("source", ""),
            job.get("location", ""),
            job.get("link", ""),
            job.get("priority", ""),
            job.get("jobType", ""),
            job.get("dateDiscovered", ""),
            job.get("dateApplied", ""),
            job.get("updatedAt", ""),
            job.get("outreachCount", 0),
            job.get("tags", []),
            job.get("notes", ""),
            job.get("autopilot_resume_id", ""),
            job.get("autopilot_session_job_id", ""),
        ])

    sheet_title = _sheet_title(config["job_tracker_tab_base"], user_id)
    _write_rows(spreadsheet_id, sheet_title, rows)
    return {"sheet_title": sheet_title, "rows_written": max(0, len(rows) - 1)}


def sync_autoapply_jobs_sheet(db, user_id: str, config: Optional[dict[str, Any]] = None):
    config = config or resolve_sheets_settings(db, user_id)
    spreadsheet_id = _require_sync_config(config)

    rows = [[
        "record_id", "origin", "session_id", "title", "company", "status",
        "match_score", "match_tier", "source", "location", "url", "apply_url",
        "keywords_matched", "keywords_missing", "cold_email_sent", "applied_at", "updated_at",
    ]]
    seen_urls = set()

    sessions = db.collection("autopilot_sessions").where("uid", "==", user_id).stream()
    for session_doc in sessions:
        job_docs = (
            db.collection("autopilot_sessions")
            .document(session_doc.id)
            .collection("jobs")
            .stream()
        )
        for job_doc in job_docs:
            job = job_doc.to_dict()
            url = job.get("url") or job.get("apply_url") or job_doc.id
            if url in seen_urls:
                continue
            seen_urls.add(url)
            rows.append([
                job_doc.id,
                "autopilot",
                session_doc.id,
                job.get("title", ""),
                job.get("company", ""),
                job.get("status", ""),
                job.get("match_score", 0),
                job.get("match_tier", ""),
                job.get("source", ""),
                job.get("location", ""),
                job.get("url", ""),
                job.get("apply_url", ""),
                job.get("keywords_matched", []),
                job.get("keywords_missing", []),
                job.get("cold_email_sent", False),
                job.get("applied_at", ""),
                job.get("created_at", ""),
            ])

    pipeline_jobs = db.collection("autoapply_jobs").document(user_id).collection("jobs").stream()
    for job_doc in pipeline_jobs:
        job = job_doc.to_dict()
        url = job.get("url") or job_doc.id
        if url in seen_urls:
            continue
        seen_urls.add(url)
        rows.append([
            job_doc.id,
            "autoapply",
            "",
            job.get("title", ""),
            job.get("company", ""),
            job.get("status", ""),
            job.get("match_score", 0),
            job.get("match_tier", ""),
            job.get("source", ""),
            job.get("location", ""),
            job.get("url", ""),
            job.get("apply_url", ""),
            job.get("keywords_matched", []),
            job.get("keywords_missing", []),
            job.get("cold_email_sent", False),
            job.get("applied_at", ""),
            job.get("discovered_at", ""),
        ])

    rows[1:] = sorted(rows[1:], key=lambda row: row[6] or 0, reverse=True)
    sheet_title = _sheet_title(config["autoapply_tab_base"], user_id)
    _write_rows(spreadsheet_id, sheet_title, rows)
    return {"sheet_title": sheet_title, "rows_written": max(0, len(rows) - 1)}


def sync_all_google_sheets(db, user_id: str, config: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    config = config or resolve_sheets_settings(db, user_id)
    tracker = sync_job_tracker_sheet(db, user_id, config=config)
    autoapply = sync_autoapply_jobs_sheet(db, user_id, config=config)
    return {
        "status": "ok",
        "tracker": tracker,
        "autoapply": autoapply,
        "spreadsheet_id": config.get("spreadsheet_id", ""),
    }
