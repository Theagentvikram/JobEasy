
import os
import base64
import io
import pypdf
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

# Load environment variables
# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
if not env_path.exists():
    # Try root directory (assuming backend/services/...)
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"

if not env_path.exists():
     # Try .env.local in root
    env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"

load_dotenv(dotenv_path=env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- Pydantic Models for Resume Schema ---
class PersonalInfo(BaseModel):
    fullName: str = Field(description="Full name of the candidate")
    email: str = Field(description="Email address")
    phone: str = Field(description="Phone number", default="")
    location: str = Field(description="City, State, or Country", default="")
    linkedin: str = Field(description="LinkedIn profile URL", default="")
    website: str = Field(description="Personal website or portfolio URL", default="")
    title: str = Field(description="Current professional title or headline", default="")

class WorkExperience(BaseModel):
    id: str = Field(description="Unique identifier for this entry (e.g., 'exp_1')", default="exp_1")
    role: str = Field(description="Job title")
    company: str = Field(description="Company name")
    startDate: str = Field(description="Start date (e.g., 'Jan 2020')", default="")
    endDate: str = Field(description="End date (e.g., 'Present' or 'Dec 2022')", default="")
    description: str = Field(description="Key responsibilities and achievements as a single text block. Use bullet points if possible.")

class Education(BaseModel):
    id: str = Field(description="Unique identifier for this entry (e.g., 'edu_1')", default="edu_1")
    school: str = Field(description="School or University name")
    degree: str = Field(description="Degree or Certification obtained")
    year: str = Field(description="Years attended (e.g., '2018 - 2022')", default="")

class Project(BaseModel):
    id: str = Field(description="Unique identifier", default="proj_1")
    name: str = Field(description="Project title")
    description: str = Field(description="Project description")
    link: str = Field(description="URL to project if available", default="")

class ResumeSchema(BaseModel):
    personalInfo: PersonalInfo
    summary: str = Field(description="A professional summary or objective statement", default="")
    skills: List[str] = Field(description="List of technical and soft skills", default_factory=list)
    experience: List[WorkExperience] = Field(description="Work experience history", default_factory=list)
    education: List[Education] = Field(description="Educational background", default_factory=list)
    projects: List[Project] = Field(description="List of academic or personal projects", default_factory=list)

# --- Service Functions ---

def extract_text_from_pdf(file_content: str) -> str:
    """
    Extracts text from a base64 encoded PDF or plain text string.
    """
    # Check if base64 encoded PDF
    if "base64," in file_content:
        _, encoded = file_content.split("base64,", 1)
        data = base64.b64decode(encoded)
    elif len(file_content) > 1000 and " " not in file_content[:100]:
        try:
            data = base64.b64decode(file_content)
        except:
             return file_content # Treat as raw text
    else:
        return file_content # Treat as raw text

    # Try pdfminer.six first (more robust)
    try:
        from pdfminer.high_level import extract_text
        text = extract_text(io.BytesIO(data))
        if text and len(text.strip()) > 0:
             return text
    except Exception as e:
        print(f"pdfminer extraction failed: {e}")

    # Fallback to pypdf
    try:
        reader = pypdf.PdfReader(io.BytesIO(data))
        text = ""
        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            except Exception as e:
                print(f"Warning: Could not extract text from page {i}: {e}")
                continue
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

async def extract_resume_data(file_content: str) -> dict:
    """
    Extracts structured resume data from file content using LangChain and Groq.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables")

    # 1. Extract raw text
    text = extract_text_from_pdf(file_content)
    if not text:
        raise ValueError("Could not extract text from the provided file.")
    
    # Truncate text to fit context if necessary (approx 30k chars is safe for Llama 70b ~8k tokens)
    # Llama 3.3 70b has 128k context, but let's be safe and efficient
    text = text[:30000]

    # 2. Setup LangChain with Groq
    # We use llama-3.3-70b-versatile for best instructions following
    llm = ChatGroq(
        temperature=0,
        model_name="llama-3.3-70b-versatile",
        groq_api_key=GROQ_API_KEY
    )

    # 3. Define the extraction chain
    structured_llm = llm.with_structured_output(ResumeSchema)

    system_prompt = """You are an expert Resume Parser. 
    Extract the following resume text into a strict JSON format matching the schema.
    - Fix capitalization where necessary.
    - Infer missing dates if logical context exists, otherwise leave empty.
    - If a field is missing, strictly use the default values (empty strings or lists).
    - For 'description' in experience, combine all bullet points into a single string, separated by newlines.
    - For 'projects', if the resume contains a Projects section, extract each project into strict JSON objects with 'name', 'description', and 'link'. Ensure 'id' is generated or left default.
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{text}"),
    ])

    chain = prompt | structured_llm

    # 4. Invoke LLM
    try:
        result: ResumeSchema = chain.invoke({"text": text})
        
        # Convert Pydantic model to dict for JSON serialization
        # exclude_none=True might hide fields, we want empty strings so use default dict
        return result.dict()
    except Exception as e:
        print(f"LLM Extraction failed: {e}")
        # Fallback or re-raise?
        # For now, let's re-raise so the frontend sees the error 
        # (or handle it gracefully in the router)
        raise e
