"""
Google Sheets Writer
Authenticates via gspread + OAuth and writes filtered job data.

Features:
  - Creates or updates a sheet named "AI Startup Jobs"
  - Color-codes rows by source
  - Freezes header row
  - Adds dropdown validation for Status column
  - Adds "Is Freelance" formatting (bold for freelance rows)
  - Maintains a "Last Updated" timestamp tab
"""

import logging
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")
SHEET_NAME = "AI Startup Jobs"
CREDS_FILE = os.getenv("GOOGLE_CREDS_FILE", "credentials.json")
TOKEN_FILE = "token.json"

# Source → HEX color (for Sheets API)
SOURCE_HEX_COLORS = {
    "YCombinator":  {"red": 1.0,  "green": 0.92, "blue": 0.61},  # Yellow
    "Wellfound":    {"red": 0.68, "green": 0.85, "blue": 0.90},  # Blue
    "LinkedIn":     {"red": 0.56, "green": 0.93, "blue": 0.56},  # Green
    "Naukri":       {"red": 1.0,  "green": 0.78, "blue": 0.59},  # Orange
    "ProductHunt":  {"red": 0.90, "green": 0.90, "blue": 0.98},  # Lavender
    "Crunchbase":   {"red": 0.86, "green": 0.86, "blue": 0.86},  # Gray
    "Upwork":       {"red": 1.0,  "green": 0.71, "blue": 0.76},  # Pink
    "Toptal":       {"red": 0.60, "green": 0.98, "blue": 0.60},  # Pale Green
    "Gun.io":       {"red": 1.0,  "green": 0.94, "blue": 0.78},  # Peach
    "Contra":       {"red": 0.78, "green": 0.90, "blue": 1.0},   # Sky Blue
}

DEFAULT_COLOR = {"red": 1.0, "green": 1.0, "blue": 1.0}  # White

STATUS_OPTIONS = ["", "Saved", "Applied", "Interview", "Rejected", "Offer"]


def _get_row_color(source: str) -> dict:
    """Get background color dict for a source."""
    for src_key, color in SOURCE_HEX_COLORS.items():
        if src_key.lower() in source.lower():
            return color
    return DEFAULT_COLOR


def authenticate_gspread():
    """
    Authenticate with Google Sheets using OAuth2 (user account).

    First-time setup:
      1. Go to https://console.cloud.google.com/
      2. Create a project → Enable Google Sheets API + Google Drive API
      3. Create OAuth 2.0 credentials (Desktop application)
      4. Download credentials.json → put it in this project folder
      5. Run this script once → it will open a browser for auth
      6. token.json will be saved for future runs (no re-auth needed)
    """
    try:
        import gspread
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
    except ImportError:
        raise ImportError(
            "Required packages not installed. Run:\n"
            "  pip install gspread google-auth google-auth-oauthlib"
        )

    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]

    creds = None
    token_path = Path(TOKEN_FILE)
    creds_path = Path(CREDS_FILE)

    # Load saved token
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    # If no valid creds, start OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                raise FileNotFoundError(
                    f"credentials.json not found at '{creds_path}'.\n"
                    "Please follow the README to set up Google OAuth credentials."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)

        # Save token for next run
        with open(token_path, "w") as f:
            f.write(creds.to_json())
        logger.info(f"Token saved to {TOKEN_FILE}")

    return gspread.authorize(creds)


def write_to_sheets(df: pd.DataFrame, sheet_id: str = GOOGLE_SHEET_ID) -> bool:
    """
    Write the filtered jobs DataFrame to Google Sheets.
    Creates the sheet tab if it doesn't exist.
    Returns True on success.
    """
    if df.empty:
        logger.warning("DataFrame is empty — nothing to write to Sheets.")
        return False

    if not sheet_id:
        logger.error(
            "GOOGLE_SHEET_ID not set in .env file. "
            "Create a Google Sheet and paste the ID from the URL."
        )
        return False

    try:
        gc = authenticate_gspread()
    except Exception as e:
        logger.error(f"Google Sheets auth failed: {e}")
        _fallback_csv_export(df)
        return False

    try:
        spreadsheet = gc.open_by_key(sheet_id)
        logger.info(f"Opened spreadsheet: {spreadsheet.title}")
    except Exception as e:
        logger.error(f"Cannot open spreadsheet {sheet_id}: {e}")
        _fallback_csv_export(df)
        return False

    # Get or create the target worksheet
    try:
        worksheet = spreadsheet.worksheet(SHEET_NAME)
        # Clear existing content
        worksheet.clear()
        logger.info(f"Cleared existing '{SHEET_NAME}' tab")
    except Exception:
        worksheet = spreadsheet.add_worksheet(
            title=SHEET_NAME, rows=str(len(df) + 10), cols="15"
        )
        logger.info(f"Created new '{SHEET_NAME}' tab")

    # Prepare data
    headers = list(df.columns)
    rows = df.fillna("").values.tolist()
    all_data = [headers] + [[str(cell) for cell in row] for row in rows]

    # Write all data at once
    worksheet.update("A1", all_data)
    logger.info(f"Wrote {len(rows)} rows to '{SHEET_NAME}'")

    # ── FORMATTING ────────────────────────────────
    try:
        _apply_formatting(spreadsheet, worksheet, df)
    except Exception as e:
        logger.warning(f"Formatting failed (data was written): {e}")

    # ── UPDATE METADATA TAB ───────────────────────
    try:
        _update_metadata_tab(spreadsheet, df)
    except Exception as e:
        logger.warning(f"Metadata tab update failed: {e}")

    # Share URL
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    print(f"\n✅ Google Sheet updated: {sheet_url}")
    print(f"   Sheet tab: '{SHEET_NAME}'")
    print(f"   Total rows: {len(rows)}")

    return True


def _apply_formatting(spreadsheet, worksheet, df: pd.DataFrame) -> None:
    """Apply colors, freeze rows, bold headers, dropdown validation."""
    import gspread
    from gspread.utils import rowcol_to_a1

    sheet_id_int = worksheet.id

    requests = []

    # 1. Freeze header row
    requests.append({
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id_int,
                "gridProperties": {"frozenRowCount": 1}
            },
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # 2. Bold + background color for header row
    requests.append({
        "repeatCell": {
            "range": {
                "sheetId": sheet_id_int,
                "startRowIndex": 0,
                "endRowIndex": 1,
            },
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
                    "textFormat": {
                        "bold": True,
                        "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0},
                        "fontSize": 11,
                    },
                    "horizontalAlignment": "CENTER",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    # 3. Color-code rows by source
    source_col_idx = list(df.columns).index("Source")
    freelance_col_idx = list(df.columns).index("Is Freelance")

    for i, row in df.iterrows():
        row_idx = i + 1  # 0-based, +1 for header
        source = str(row.get("Source", ""))
        is_freelance = str(row.get("Is Freelance", "No")) == "Yes"
        bg_color = _get_row_color(source)

        cell_format = {
            "backgroundColor": bg_color,
            "textFormat": {"bold": is_freelance},
        }

        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_int,
                    "startRowIndex": row_idx,
                    "endRowIndex": row_idx + 1,
                },
                "cell": {"userEnteredFormat": cell_format},
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }
        })

    # 4. Auto-resize columns
    requests.append({
        "autoResizeDimensions": {
            "dimensions": {
                "sheetId": sheet_id_int,
                "dimension": "COLUMNS",
                "startIndex": 0,
                "endIndex": len(df.columns),
            }
        }
    })

    # 5. Status column dropdown validation
    status_col_idx = list(df.columns).index("Status")
    requests.append({
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id_int,
                "startRowIndex": 1,
                "endRowIndex": len(df) + 1,
                "startColumnIndex": status_col_idx,
                "endColumnIndex": status_col_idx + 1,
            },
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in STATUS_OPTIONS if v],
                },
                "showCustomUi": True,
                "strict": False,
            }
        }
    })

    # 6. Make Job URL column clickable (hyperlink format)
    url_col_idx = list(df.columns).index("Job URL")
    # Note: gspread handles hyperlinks differently — we'll use formulas
    for i, row in df.iterrows():
        row_idx = i + 1
        url = str(row.get("Job URL", ""))
        if url and url.startswith("http"):
            cell_ref = rowcol_to_a1(row_idx + 1, url_col_idx + 1)
            worksheet.update_cell(row_idx + 1, url_col_idx + 1,
                                  f'=HYPERLINK("{url}","Link")')

    # Execute all formatting requests
    if requests:
        spreadsheet.batch_update({"requests": requests})
        logger.info("Formatting applied successfully")


def _update_metadata_tab(spreadsheet, df: pd.DataFrame) -> None:
    """Create/update a 'Meta' tab with run statistics."""
    try:
        meta = spreadsheet.worksheet("Meta")
        meta.clear()
    except Exception:
        meta = spreadsheet.add_worksheet(title="Meta", rows="30", cols="5")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    source_counts = df["Source"].value_counts().to_dict()
    location_counts = df["Location"].value_counts().to_dict()
    freelance_count = (df["Is Freelance"] == "Yes").sum()

    meta_rows = [
        ["AI Startup Jobs Pipeline", "", "", "", ""],
        ["Last Updated", now, "", "", ""],
        ["Total Jobs", str(len(df)), "", "", ""],
        ["Freelance / Contract", str(freelance_count), "", "", ""],
        ["", "", "", "", ""],
        ["Jobs by Source", "", "", "", ""],
    ]
    for src, cnt in source_counts.items():
        meta_rows.append([f"  {src}", str(cnt), "", "", ""])

    meta_rows.append(["", "", "", "", ""])
    meta_rows.append(["Jobs by Location", "", "", "", ""])
    for loc, cnt in location_counts.items():
        meta_rows.append([f"  {loc}", str(cnt), "", "", ""])

    meta.update("A1", meta_rows)
    logger.info("Meta tab updated")


def _fallback_csv_export(df: pd.DataFrame) -> None:
    """Export to CSV if Google Sheets auth fails."""
    output_path = Path("jobs_output.csv")
    df.to_csv(output_path, index=False)
    logger.info(f"Fallback: data exported to {output_path.absolute()}")
    print(f"\n⚠️  Google Sheets auth failed. Data saved to: {output_path.absolute()}")


def export_csv(df: pd.DataFrame, path: str = "jobs_output.csv") -> str:
    """Export DataFrame to CSV file."""
    df.to_csv(path, index=False)
    logger.info(f"CSV exported: {path}")
    return path


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test
    test_df = pd.DataFrame({
        "Job Title": ["AI Engineer", "ML Engineer"],
        "Company": ["Startup A", "Startup B"],
        "Location": ["Remote", "Hyderabad"],
        "Salary": ["30-50 LPA", "$80/hr"],
        "Funding Stage": ["Series A", "Seed"],
        "Source": ["YCombinator", "Upwork"],
        "Job URL": ["https://example.com/1", "https://example.com/2"],
        "Company Website": ["", ""],
        "Date Scraped": ["2026-03-15", "2026-03-15"],
        "Is Freelance": ["No", "Yes"],
        "Notes": ["", "Freelance"],
        "Status": ["", ""],
    })

    # Try to write to Sheets
    if GOOGLE_SHEET_ID:
        write_to_sheets(test_df)
    else:
        print("GOOGLE_SHEET_ID not set. Exporting to CSV instead.")
        export_csv(test_df)
        print(f"Exported {len(test_df)} rows to jobs_output.csv")
