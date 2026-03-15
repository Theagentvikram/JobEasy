# AI Startup Jobs Pipeline 🚀

An automated scraper that finds **AI/ML startup jobs** and **high-paying international freelance contracts** — filtered for Remote and Hyderabad, and pushed to Google Sheets daily.

## What It Scrapes

| Source | What | Location Filter |
|--------|------|-----------------|
| **YCombinator** (Work at a Startup) | AI/ML roles at YC-backed startups (2022+) | Remote / Hyderabad |
| **Wellfound** (AngelList) | Seed/Series A/B startup jobs + freelance | Remote / Hyderabad |
| **Naukri.com** | AI engineer roles (non-corporate) | Hyderabad / Remote |
| **LinkedIn** (via Apify) | AI/ML jobs at small companies | Hyderabad / Remote |
| **ProductHunt** | Recently launched AI companies (discovery) | Global |
| **Upwork** | High-paying AI contracts ($40+/hr) | US, Canada, Germany, Netherlands, Dubai |
| **Toptal** | Premium AI/ML freelance contracts | Global (US/EU clients) |
| **Contra** | AI freelance projects | Remote (international) |
| **Gun.io** | Vetted AI developer contracts | US companies |

---

## Quick Start

### 1. Install Requirements

```bash
cd ai_startup_jobs
pip install -r requirements.txt
playwright install chromium
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env and fill in your tokens
```

### 3. Get Your Apify Token (free)

1. Sign up at [apify.com](https://apify.com) (free — $5/month compute included)
2. Go to: Console → Settings → Integrations → API Token
3. Paste it as `APIFY_API_TOKEN` in your `.env`

### 4. Set Up Google Sheets OAuth

**Step 1: Create a Google Cloud Project**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g., "AI Jobs Scraper")

**Step 2: Enable APIs**
1. Go to "APIs & Services" → "Enable APIs"
2. Enable: **Google Sheets API** and **Google Drive API**

**Step 3: Create OAuth Credentials**
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: **Desktop application**
4. Name it anything, click Create
5. Download the JSON → rename it `credentials.json`
6. Put `credentials.json` in this project folder

**Step 4: Get Your Sheet ID**
1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/YOUR_ID/edit`
3. Paste it as `GOOGLE_SHEET_ID` in your `.env`

**Step 5: First Auth (one-time)**
```bash
python sheets_writer.py
```
A browser window will open — log in with your Google account and allow access. A `token.json` is saved for future runs (no re-login needed).

---

## Running the Pipeline

### Run Once
```bash
python main.py
```

### Run + Save CSV Only (no Sheets needed)
```bash
python main.py --csv-only
```

### Test with Dummy Data (no scraping)
```bash
python main.py --test
```

### Run Every 24 Hours (auto-scheduler)
```bash
python main.py --schedule
```

### Custom Interval (e.g., every 6 hours)
```bash
python main.py --schedule --interval-hours 6
```

---

## Output — Google Sheet Structure

The sheet named **"AI Startup Jobs"** has these columns:

| Column | Description |
|--------|-------------|
| **Job Title** | Role name |
| **Company** | Startup or client name |
| **Location** | Remote / Hyderabad / Remote (US Client) etc. |
| **Salary** | Salary range or hourly rate |
| **Funding Stage** | Seed / Series A / N/A (freelance) |
| **Source** | YCombinator / Wellfound / Naukri / etc. |
| **Job URL** | Direct link to apply |
| **Company Website** | Company homepage |
| **Date Scraped** | When the job was found |
| **Is Freelance** | Yes / No |
| **Notes** | Extra info (experience required, applicants, etc.) |
| **Status** | *Your tracking column* — Saved / Applied / Interview / Rejected / Offer |

### Color Coding
- 🟡 **Yellow** — YCombinator
- 🔵 **Blue** — Wellfound
- 🟢 **Green** — LinkedIn
- 🟠 **Orange** — Naukri
- 🩷 **Pink** — Upwork
- 🌿 **Pale Green** — Toptal
- 🩵 **Sky Blue** — Contra
- 🍑 **Peach** — Gun.io

---

## Project Structure

```
ai_startup_jobs/
├── scrapers/
│   ├── yc_scraper.py          # YC Work at a Startup
│   ├── wellfound_scraper.py   # AngelList Talent
│   ├── naukri_scraper.py      # Naukri.com (Hyderabad + Remote)
│   ├── linkedin_scraper.py    # LinkedIn via Apify
│   ├── producthunt_scraper.py # ProductHunt + Crunchbase
│   └── freelance_scraper.py   # Upwork / Toptal / Contra / Gun.io
├── filter.py                  # Blocklist + deduplication engine
├── sheets_writer.py           # Google Sheets integration
├── main.py                    # Orchestrator + scheduler
├── requirements.txt
├── .env.example               # Template (copy to .env)
├── credentials.json           # YOUR Google OAuth file (not committed)
├── token.json                 # Auto-generated after first auth
├── jobs_output.csv            # Latest export (auto-generated)
└── logs/
    └── scraper.log            # All run logs with timestamps
```

---

## Filters Applied

**Job title must contain:** AI, ML, Machine Learning, LLM, GenAI, NLP, Data Scientist, Computer Vision, Deep Learning, RAG, Prompt, Generative AI, MLOps, AI Engineer, etc.

**Location must be:** Remote, Hyderabad, WFH, Anywhere, India — OR a freelance role from US/Canada/Germany/Netherlands/Dubai.

**Blocked companies:** TCS, Infosys, Wipro, HCL, Accenture, Capgemini, IBM, Cognizant, Tech Mahindra, Google, Microsoft, Amazon, Meta, Apple, Flipkart, Swiggy, Zomato, Paytm, BYJU, Deloitte, PWC, etc.

---

## Troubleshooting

**Playwright bot detection (Cloudflare/Captcha)**
- Already handled with `playwright-stealth`, random delays, and rotating user agents
- If a site blocks you, that scraper will fail gracefully and the rest will continue
- Check `logs/scraper.log` for details

**Apify actor not found**
- The scraper tries 3 different actor IDs automatically
- If all fail, LinkedIn results will be empty but others still run

**Google Sheets auth error**
- Delete `token.json` and re-run `python sheets_writer.py` to re-authenticate
- Make sure both Sheets API and Drive API are enabled in your GCP project

**No jobs showing up**
- Run `python main.py --test` first to verify the pipeline works
- Check individual scrapers: `python scrapers/naukri_scraper.py`

---

## Freelance Strategy Notes

For high-paying international clients, the pipeline targets:

| Country | Typical AI/ML Rate | Best Sources |
|---------|-------------------|--------------|
| **USA** | $80–150/hr | Upwork, Toptal, Gun.io |
| **Canada** | $60–120/hr | LinkedIn, Upwork |
| **Germany** | €60–100/hr | LinkedIn, Upwork |
| **Netherlands** | €70–110/hr | LinkedIn, Contra |
| **Dubai (UAE)** | $70–130/hr | LinkedIn, Upwork |

**Tip:** For Upwork, build a strong profile with AI project case studies before applying. Toptal/Gun.io require a vetting process — apply proactively.

---

## License

MIT — use freely for personal job searching.
