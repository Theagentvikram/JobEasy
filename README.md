# JobEasy - AI Resume & ATS Optimizer 🚀

**JobEasy** is a powerful AI-driven platform designed to help job seekers crack the ATS (Applicant Tracking System) code. Scan your resume against job descriptions, get deep insights, and optimize your profile to land your dream job.

![JobEasy Dashboard](https://via.placeholder.com/800x400?text=JobEasy+Dashboard+Preview)

## ✨ Key Features

-   **🎯 ATS Compliance Scanner**: Upload your resume and a job description to get a match score (0-100).
-   **🔍 Deep Insights (Pro)**: Detailed breakdown of "Hard" vs "Soft" skills, missing keywords, and formatting checks.
-   **📝 Resume Builder**: Create ATS-friendly resumes with our smart builder (Coming Soon).
-   **🤖 AI Assistant**: Chat with an AI career coach for instant advice.
-   **🔒 Secure & Private**: Built with Firebase Authentication for secure user data management.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React (Vite)
-   **Styling**: Tailwind CSS + Lucide Icons
-   **Routing**: React Router DOM
-   **State Management**: React Hooks (Context API planned)

### Backend
-   **API**: FastAPI (Python)
-   **AI Engine**: Google Gemini Pro (via `google-generativeai`)
-   **PDF Processing**: `pdfplumber`
-   **Auth**: Firebase Admin SDK

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (v3.10+)

### 1. Clone the Repository
```bash
git clone https://github.com/Theagentvikram/JobEasy.git
cd JobEasy
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000`*

## 📦 Deployment Guide

### Frontend (Vercel/Netlify)
1.  Connect your GitHub repo to Vercel.
2.  Set the **Environment Variable**:
    *   `VITE_API_URL`: Your deployed Backend URL (e.g., `https://jobeasy-api.onrender.com`)
3.  Deploy!

### Backend (Render/Railway)
1.  Connect your GitHub repo to Render.
2.  **Build Command**: `pip install -r backend/requirements.txt`
3.  **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4.  Add your `.env` variables (GEMINI_API_KEY, FIREBASE_CREDENTIALS, etc.) in the dashboard.

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a PR.

## 📄 License
MIT License © 2024 JobEasy
