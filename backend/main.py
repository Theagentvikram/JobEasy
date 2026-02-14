from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import resumes, ai, auth, ats, user_data, chat
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="JobEasy AI Backend")

# CORS Config
origins = [
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
# app.include_router(payment.router)
app.include_router(ats.router)
app.include_router(user_data.router)
app.include_router(chat.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "JobEasy Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
