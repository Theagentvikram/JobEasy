from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import resumes, ai, auth, ats, user_data, chat, referral, payment
import os
from dotenv import load_dotenv

from pathlib import Path

# Try strictly finding the .env file
root_dir = Path(__file__).resolve().parent.parent
env_path = root_dir / ".env"
if not env_path.exists():
    env_path = root_dir / ".env.local"

load_dotenv(dotenv_path=env_path)

app = FastAPI(title="JobEasy AI Backend")

# CORS Config
origins = [
    "https://jobeasy.app",
    "https://www.jobeasy.app",
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
    "*" # For dev, ideally restrict in prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(resumes.router)
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(payment.router)
app.include_router(ats.router)
app.include_router(user_data.router)
app.include_router(chat.router)
app.include_router(referral.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "JobEasy Backend"}

@app.get("/")
def root():
    return health_check()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
