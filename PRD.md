# Comprehensive Product Requirements Document (PRD)
## JobEasy - AI Resume & ATS Optimizer

**Version:** 2.0
**Date:** 2026-02-16
**Status:** Live / In-Development

---

## 1. Executive Summary
**JobEasy** is a full-stack job application assistant designed to maximize a candidate's chances of passing Applicant Tracking Systems (ATS). It provides a high-fidelity Resume Builder, an AI-powered ATS Scanner, a Career Coaching Chatbot, and a structured Job Tracker. The application is built with a "Concentrated Professional" aesthetic, emphasizing density, clarity, and a premium "Emerald" brand identity.

---

## 2. System Architecture

### 2.1 Tech Stack Operations
*   **Frontend Runtime:** React 19 (SPA)
*   **Build System:** Vite 6.2.0
*   **Language:** TypeScript 5.8+
*   **Package Manager:** npm (implied via `package-lock.json`)

### 2.2 Directory Structure
```
/src
├── /components         # Legacy & Shared Components (Scanner, Plans, etc.)
├── /firebase           # Firebase Config & Initialization
├── /new-ui             # NEW Design System Implementation
│   ├── /components     # Radix/Tailwind primitives (Button, Card, etc.)
│   ├── /pages          # Top-level Page Views (Login, Dashboard, Landing)
│   └── /design-system  # Design tokens & documentation
├── /services           # API Service Layer (Axios)
├── /types.ts           # Global TypeScript Interfaces (Database Models)
└── App.tsx             # Main Routing & Auth Context
```

### 2.3 External Services
*   **Authentication & Database:** Google Firebase (BaaS)
    *   **Auth:** Google and Email/Password providers.
    *   **Firestore:** NoSQL database for structured data.
    *   **Storage:** Blob storage for resume files (PDF/Docx).
*   **Payments:** Razorpay (India & International)
*   **AI/LLM:** Google Gemini 1.5 (via `@google/genai` on backend or proxied).
*   **PDF Engine:** `html2pdf.js` (Client-side rendering).

---

## 3. Database Schema (Firestore)

The application uses a NoSQL document structure. Key collections and models defined in `types.ts`:

### 3.1 Users Collection
*   **Document ID:** `uid` (from Firebase Auth)
*   **Fields:**
    *   `email`: string
    *   `displayName`: string
    *   `photoURL`: string
    *   `plan`: 'free' | 'pro'
    *   `plan_type`: 'weekly' | 'monthly' | 'quarterly' | 'lifetime'
    *   `credits`: number (for AI scans/generations)
    *   `createdAt`: Timestamp

### 3.2 Resumes Collection (`resumes`)
*   **Document ID:** UUID
*   **Fields:**
    *   `userId`: string (Foreign Key)
    *   `templateId`: 'modern' | 'professional' | 'minimalist'
    *   `personalInfo`: Object (Name, Email, Phone, LinkedIn, etc.)
    *   `experience`: Array<ExperienceItem>
    *   `education`: Array<EducationItem>
    *   `skills`: Array<string>
    *   `projects`: Array<ProjectItem>
    *   `summary`: string (AI Generated or Manual)
    *   `score`: number (ATS Score)

### 3.3 Jobs Collection (`jobs`)
*   **Document ID:** UUID
*   **Fields:**
    *   `userId`: string
    *   `title`: string
    *   `company`: string
    *   `status`: 'applied' | 'interview' | 'offer' | 'rejected'
    *   `jobDescription`: string (Full text)
    *   `dateApplied`: string (ISO Date)

---

## 4. API Specification

### 4.1 Base Configuration
*   **Base URL:** `import.meta.env.VITE_API_URL` or `http://localhost:8000`
*   **Authentication:** Bearer Token (Firebase ID Token) validation via Interceptor.

### 4.2 Auth Endpoints
*   `GET /auth/me`: Fetch current user profile and plan status.
*   `POST /auth/downgrade`: Revert user plan to Free.

### 4.3 AI Endpoints (`geminiService.ts`)
*   `POST /ai/analyze`
    *   **Payload:** `{ resume_text: string, job_description: string }`
    *   **Response:** `AnalysisResult` (Score, Missing Keywords, Feedback).
*   `POST /ai/generate-bullets`
    *   **Payload:** `{ role: string, company: string, description: string }`
    *   **Response:** `string[]` (List of bullet points).
*   `POST /ai/generate-summary`
    *   **Payload:** `{ role: string, skills: string[] }`
    *   **Response:** `{ summary: string }`.

### 4.4 Payment Endpoints (`Plans.tsx`)
*   `POST /payment/create-order`
    *   **Payload:** `{ amount: number, plan: string, currency: string, coupon_code?: string }`
    *   **Response:** `{ order_id: string, key_id: string, ... }`
*   `POST /payment/verify`
    *   **Payload:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
*   `POST /payment/validate-coupon`
    *   **Payload:** `{ code: string }`
    *   **Response:** `{ valid: boolean, discount: number, message: string }`

---

## 5. Frontend Architecture & Routing

### 5.1 Main Router (`App.tsx`)
*   `/` -> `NewLandingPage` (Public Marketing Page)
*   `/login` -> `LoginPage` (Auth Handling)
*   `/blog/:id` -> `BlogDetail` (SEO Content)
*   `/dashboard/*` -> `DashboardLayout` (Protected Route)
    *   `/dashboard/` -> `DashboardHome` (Overview Stats)
    *   `/dashboard/*` -> `Scanner` (Legacy Wrapper for Tools)

### 5.2 Internal Dashboard Routing (`Scanner.tsx sub-router`)
*   `/dashboard/scan` -> `ATSView` (Resume Scanner Interface)
*   `/dashboard/resumes` -> `ResumeBuilder` (New UI Builder)
*   `/dashboard/jobs` -> `JobTracker` intent (via `Jobs` component)
*   `/dashboard/career-desk` -> `CareerDesk` (AI Chat)
*   `/dashboard/settings` -> `Settings`
*   `/dashboard/plans` -> `Plans` (Pricing & Upgrades)

---

## 6. Detailed Feature Requirements

### 6.1 Resume Builder (High Fidelity)
*   **Layout:** Split-Pane (Editor Left, Preview Right).
*   **State Management:** Local React State (`useState`) initialized with `initialResume` or empty template.
*   **Auto-Save:** `useEffect` hook triggers `onSave` callback every 5 seconds if changes detected.
*   **AI Integration:** "Magic Wand" buttons near text areas trigger `generateExperienceContent` or `generateProfessionalSummary`.
*   **Preview:** `ResumePreview` component must accept a `scae` prop to fit within the viewport using CSS Transforms.

### 6.2 ATS Scanner
*   **Input:** Multi-modal (File Upload via Drag-n-Drop OR Text Paste).
*   **Process:**
    1.  Parse File (Frontend or Backend).
    2.  Send text + JD to `/ai/analyze`.
*   **Visualization:** Radial Progress bar for Score. List view for "Missing Keywords" (red) and "Found Keywords" (green).

### 6.3 Payment Integration
*   **Library:** `window.Razorpay` (Client SDK loaded via script tag).
*   **Flow:**
    1.  User selects plan (ID: `weekly`, `monthly`, etc.).
    2.  `create-order` API called.
    3.  Razorpay Modal opens with `options` object provided by backend.
    4.  `handler` callback posts to `/payment/verify` on success.

---

## 7. Environment & Configuration

### 7.1 Required Environment Variables (`.env`)
*   `VITE_API_URL`: Backend API endpoint (e.g., `http://localhost:8000/api/v1`).
*   `GEMINI_API_KEY`: (Optional) If client-side AI is used fallback detailed in `vite.config.ts`.
*   `FIREBASE_*`: All Firebase config values (ApiKey, AuthDomain, etc.) typically hardcoded in `firebase/config.ts` or provided via env vars for CI/CD.

### 7.2 Styling Configuration (`tailwind.config.js`)
*   **Mode:** `jit` (Just-in-Time).
*   **DarkMode:** `class` strategy.
*   **Theme Extension:**
    *   `colors.brand`: 50-950 (Emerald Ramp).
    *   `colors.neutral`: 50-950 (Stone/Slate Ramp).
    *   `fontFamily`: Inter (sans), Outfit (headings).

---

## 8. Asset Requirements
*   **Icons:** Use `lucide-react` for UI elements (User, Home, Settings) and `@phosphor-icons/react` for specialized actions (Scan, AI Sparkles).
*   **Fonts:** Google Fonts `Inter` and `Outfit` must be loaded in `index.html`.
