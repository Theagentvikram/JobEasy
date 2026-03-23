# JobEasy — Bug Audit & TODO
> Updated: 2026-03-22 (session 2 — bugs 1-6 all fixed)

---

## ✅ Fixed This Session

| # | Issue | File(s) Changed | Status |
|---|-------|----------------|--------|
| 1 | `/pipeline/status` returning 404 | Backend was stale — needs restart. Route is correct. | **Needs restart** |
| 2 | `GET /desk/profiles/{profile_id}` → 405 | Same stale server issue + added auto-create for `default` profile on first load | **Fixed in code** |
| 3 | Glassdoor errors for India/non-US locations | `backend/autoapply/scrapers/jobspy_scraper.py` — now excludes Glassdoor/ZipRecruiter for non-US/UK/CA, normalizes "Work from Home" → "Remote" | **Fixed** |
| 4 | `sync_desk_from_resume` wrote to legacy doc | Now syncs into the active profile document instead | **Fixed** |
| 5 | `GET /desk/text` read from legacy doc | Now reads active profile first, falls back to legacy | **Fixed** |
| 6 | `sync_resume_to_desk` helper hardcoded legacy path | Accepts optional `profile_ref` param | **Fixed** |
| 7 | CareerDesk `<>` fragment not closed | Confirmed closed at line 530-532 | **Was already OK** |

## ✅ Fixed — Bug Audit Session 2

| # | Bug | File(s) Changed | Fix |
|---|-----|----------------|-----|
| B1 | SQLite vs Firestore mismatch (jobs page empty) | `tasks/job_pipeline.py` | Added `_save_job_to_firestore()` — dual-writes each scored job to `autoapply_jobs/{uid}/jobs/{ext_id}` in Firestore after SQLite commit. Also writes run history and status updates. |
| B2 | Wellfound scraper returning 0 jobs | `scrapers/wellfound_scraper.py` | Rewrote `_search_wellfound()` to use jobspy's native `wellfound` site as primary; hand-rolled HTML scraper kept as fallback. Added `_jobspy_wellfound()` + `_safe_int()`. |
| B3 | Local country boards missing from pipeline | `scrapers/local_boards.py` (new), `tasks/job_pipeline.py` | Created `backend/autoapply/scrapers/local_boards.py` (fixed imports from AutoApply copy). Wired as Source 5 in pipeline with `disabled_sources` pass-through. Boards: PNet, CareerJunction, TimesJobs, Reed UK, Jora AU, Bayt UAE, MyCareersFuture SG, JobBank CA. |
| B4 | ATS Firestore composite index error | `routers/ats.py` | Removed `.order_by('createdAt')` from filtered query; sort in Python instead. No index needed. |
| B5 | Platform toggles not wiring `disabled_sources` | `New-ui/src/pages/AutoApply.tsx` | `handleSave` now inverts `form.sources[]` → `disabled_sources` comma-string before sending to backend. |
| B6 | Ollama Pi no fallback when offline | `autoapply/ai/llm_client.py` | Added `ollama` provider via OpenAI-compatible `/v1` endpoint. `chat()` auto-falls back to Groq on connection errors (refused, timeout, etc). Set `AI_PROVIDER=ollama`, `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_FAST_MODEL` in `.env`. |

---

## 🔴 Broken / Not Working

### Backend
| Issue | Where | Notes |
|-------|-------|-------|
| **Server must be restarted** | `backend/` | All new routes (pipeline/status, desk/profiles/GET) are in code but the running uvicorn process doesn't know about them. Run `uvicorn main:app --reload` to fix. |
| **Pipeline runs SQLite for job storage** | `backend/autoapply/tasks/job_pipeline.py` | Jobs are stored in `autoapply.db` (SQLite) not Firestore. The `all-jobs` endpoint reads from Firestore collection `autoapply_jobs/{uid}/jobs` but the pipeline writes to SQLite. So the jobs page always shows 0 unless this is reconciled. |
| **`/autoapply/all-jobs` reads Firestore but pipeline writes SQLite** | `routers/autoapply.py:222`, `tasks/job_pipeline.py` | Critical data flow mismatch — pipeline saves to SQLite, frontend reads from Firestore. |
| **Wellfound scraper returns 0 jobs** | `backend/autoapply/scrapers/wellfound_scraper.py` | Not configured / no auth. Returns empty consistently. |
| **Naukri scraper status unknown** | `backend/autoapply/scrapers/naukri_scraper.py` | Haven't verified it returns data. |
| **Local country boards not in backend pipeline** | `backend/autoapply/tasks/job_pipeline.py` | `LocalBoardsScraper` exists in `AutoApply/src/scrapers/local_boards.py` but NOT in the backend `autoapply/` copy. PNet, CareerJunction, TimesJobs, Reed, Jora, etc. are missing from the running pipeline. |
| **Dry run still applies** | `job_pipeline.py` | The `dry_run` flag is passed but need to verify all application steps actually check it and skip. |
| **ATS Firestore index error** | `ats_scans` collection | `order_by('createdAt') + where('userId')` requires composite index — shows error in logs. Need to create index in Firebase Console. |

### Frontend — New UI
| Issue | Where | Notes |
|-------|-------|-------|
| **Command Center (`AutopilotCommand.tsx`) jobs table always empty** | `AutopilotCommand.tsx` | Reads from `/autoapply/all-jobs` which reads Firestore. Pipeline writes SQLite. Mismatch. |
| **AutoApply page jobs also empty** | `AutoApply.tsx` | Same cause. |
| **Settings — platform toggle saves but doesn't wire to pipeline** | `AutoApply.tsx` settings panel | `disabled_sources` saves to Firestore but the frontend `sources` list (array of enabled platforms) needs to also be serialized to `disabled_sources` string on save. |
| **Classic UI button** | `Sidebar.tsx` | Fixed to use `window.location.origin + '/'` — needs testing in prod where ports differ. |
| **`/new` basename routing** | `New-ui/src/App.tsx` | Verify all routes work under `/new/` basename — some deep links may break. |

### AI / Ollama
| Issue | Where | Notes |
|-------|-------|-------|
| **Ollama Pi connection not tested end-to-end** | `autoapply/ai/llm_client.py` | `ollama_host` default is `192.168.31.246:11434`. Works on same LAN, fails remotely. No fallback if Pi is offline. |
| **Job scoring uses Groq by default** | `autoapply/ai/job_matcher.py` | Even if Ollama is selected, need to confirm the `llm_client.py` routing works. |

---

## 🟡 Partially Working

| Feature | Status | Notes |
|---------|--------|-------|
| **Pipeline progress modal** | Modal shows, but polling returns 404 until restart | After restart will work |
| **Dry run** | Fires the pipeline, but modal 404s | After restart: should work |
| **Career Desk — resume picker** | UI complete, backend endpoint exists | `GET /user/desk/resumes` is new — only works after restart |
| **Profile switcher** | Works (create/rename/delete/switch all 200) | `loadDeskForProfile` returns 405 on stale server |
| **Platform source toggles in settings** | Save works, pipeline respects them | Need to verify `disabled_sources` string roundtrip |
| **Glassdoor exclusion** | Fixed in code but needs restart | After restart: India/Bengaluru searches will skip Glassdoor |

---

## 🟢 Working

| Feature | Notes |
|---------|-------|
| Auth (Firebase JWT) | Login/signup working |
| Resume upload & parsing | `/resumes` endpoint working |
| ATS Scanner | Working (minor Firestore index warning) |
| AI Assistant / Chat | Working |
| AutoPilot sessions | Sessions list/detail working |
| Referral jobs | CRUD working |
| Pipeline trigger (`POST /pipeline/run`) | Fires correctly, background task starts |
| Skeleton loading on all pages | Added to AutoApply, AutopilotCommand, CareerDesk |
| Settings page | Reads/writes to Firestore |
| Career Desk save/load | Working on active profile |
| Multi-profile (create/rename/delete) | Working |
| Import from resume modal | UI complete |

---

## 📋 Next Steps (Ordered Priority)

### Immediate (restart unblocks most)
- [ ] **Restart backend** — `uvicorn main:app --reload` in `backend/` dir
- [ ] Test `GET /autoapply/pipeline/status` returns properly
- [ ] Test `GET /user/desk/profiles/{id}` works
- [ ] Test resume picker in CareerDesk loads resume list

### High Priority — Data Flow Fix
- [x] **Fix SQLite vs Firestore mismatch** — Dual-write: pipeline now mirrors each scored job to Firestore after SQLite commit ✅

### Medium Priority
- [x] Add `LocalBoardsScraper` to `backend/autoapply/scrapers/` ✅
- [x] Wire local boards into `backend/autoapply/tasks/job_pipeline.py` ✅
- [x] Fix ATS Firestore composite index error — sort in Python instead ✅
- [x] Fix Wellfound scraper — now uses jobspy native wellfound support ✅
- [ ] **Verify dry run** actually skips application submission steps (quick code audit)
- [ ] **Test Naukri scraper** — status unknown, needs verification it returns data

### Architecture — Frontend Data Caching (React Query)
- [ ] **Install `@tanstack/react-query`** and wrap app in `QueryClientProvider`
- [ ] Replace `useEffect + api.get` on AutoApply mount (5 calls) with `useQuery` + stale times
- [ ] Replace `useEffect + api.get` on AutoPilot mount (3 calls) with `useQuery`
- [ ] Replace `useEffect + api.get` on JobTracker mount (2 calls) with `useQuery`
- [ ] Replace `useEffect + api.get` on CareerDesk mount (2 calls) with `useQuery`
- [ ] Use `useMutation` + `invalidateQueries` for all write operations (add/update/delete job, save desk, etc.)
- [ ] Set per-query stale times: jobs=2min, desk=5min, stats=1min, auth=10min, sessions=30s
- [ ] **Longer term:** Move JobTracker + CareerDesk to Firestore for realtime sync (backend only handles AI/compute)

> **Why:** Every page navigation fires fresh API calls to a Render backend (cold starts = slow). React Query caches responses in memory — revisiting a page is instant, data revalidates silently in background.

### Low Priority / Polish
- [ ] Add error boundary to New UI pages (currently crash on API error)
- [x] Add retry / fallback when Ollama Pi is offline ✅ (auto-falls back to Groq)
- [ ] Job deduplication across pipeline runs (same job can be re-inserted into SQLite)
- [x] Settings: wire `sources` array → `disabled_sources` string conversion on save ✅

---

## 🗂 Obsidian Vault Audit (`/Users/abhi/Downloads/ClaudeMem`)

### What's in the Vault
| File | Content | Status |
|------|---------|--------|
| `MEMORY.md` | Index — links to CollateralQC, ResuMatch, infra, patterns | Current |
| `Projects/CollateralQC.md` | Full arch, deployment scripts, gotchas | Current |
| `Projects/ResuMatch.md` | ResuMatch F2 project | Needs check |
| `Infrastructure/DigitalOcean.md` | DO server 138.68.47.164 | Likely current |
| `Infrastructure/CloudflarePages.md` | CF Pages deploy | Likely current |
| `Infrastructure/CloudflareR2.md` | R2 bucket | Likely current |
| `Patterns/Docker.md` | Docker image-based deploy pattern | Current |
| `Patterns/NextJS.md` | .env.local override, static export | Current |
| `Patterns/Django.md` | Org model `id` not `uuid` | Current |
| `Architecture/QCEngine.md` | QC Engine 5.0.0, 194 rules | Current |

### What's MISSING from Obsidian (should be added)
- [ ] `Projects/JobEasy.md` — this project doesn't exist in Obsidian at all
- [ ] `Infrastructure/Firebase.md` — Firestore collections, auth setup
- [ ] `Infrastructure/RaspberryPi.md` — Ollama on Pi, host/model, LAN-only access
- [ ] `Patterns/FastAPI.md` — route ordering gotcha, async background tasks

### Obsidian Notes that are STALE
| File | Issue |
|------|-------|
| `Projects/CollateralQC.md` — deploy scripts | Scripts moved to GitHub Actions for API, but Obsidian still says "ManualPushes/push-backend.sh works ~80% of the time" — per the system memory, API now uses `git push origin sandbox-api` → GH Actions |
| `MEMORY.md` — updated date | Says `2026-03-10` — needs updating |
