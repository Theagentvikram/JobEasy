"""
Backfill Firebase user documents with persistent plan/usage fields.

Run from repo root:
    python3 backend/reproduce_issue.py
"""

from datetime import datetime, timezone
from services.firebase import get_db


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def main() -> None:
    db = get_db()
    users = list(db.collection("users").stream())
    updated = 0

    for user_doc in users:
        data = user_doc.to_dict() or {}
        patch = {}

        if "scan_count" not in data:
            patch["scan_count"] = 0
        if "scan_count_date" not in data:
            patch["scan_count_date"] = today_str()
        if "resume_count" not in data:
            patch["resume_count"] = 0
        if "resume_count_week" not in data:
            patch["resume_count_week"] = 0
        if "resume_count_week_key" not in data:
            patch["resume_count_week_key"] = week_key()
        if "plan" not in data:
            patch["plan"] = "free"
        if "plan_type" not in data:
            patch["plan_type"] = "pro" if data.get("plan") == "pro" else "free"
        if "plan_expires_at" not in data:
            patch["plan_expires_at"] = None

        if patch:
            db.collection("users").document(user_doc.id).set(patch, merge=True)
            updated += 1

    print(f"Checked {len(users)} users; updated {updated} documents.")


if __name__ == "__main__":
    main()
