import os
import json
import base64
import io
import pypdf
import traceback
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Dict
from openai import OpenAI

# Explicitly load .env from the backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    print(f"WARNING: GROQ_API_KEY not found. Checked: {env_path}")
else:
    print(f"DEBUG: GROQ_API_KEY loaded successfully (starts with: {API_KEY[:10]}...)")

# Configure OpenAI client for Groq (OpenAI-compatible API)
client = OpenAI(
  base_url="https://api.groq.com/openai/v1",
  api_key=API_KEY,
)

# Using llama-3.3-70b-versatile: Best quality, 12,000 TPM on free tier
# Free tier: 30 RPM, 14,400 RPD, 12,000 TPM
MODEL_NAME = "llama-3.3-70b-versatile"

def extract_text_from_input(input_data: str) -> str:
    """
    Attempts to extract text from the input. 
    Uses pdfminer.six for high-quality extraction, falls back to pypdf.
    """
    data = None
    
    # Check for base64 header
    if "base64," in input_data:
        _, encoded = input_data.split("base64,", 1)
        data = base64.b64decode(encoded)
    # Check for raw base64
    elif len(input_data) > 1000 and " " not in input_data[:100]:
        try:
            data = base64.b64decode(input_data)
        except:
             pass

    # If we have binary data, try to parse as PDF
    if data:
        text = ""
        # 1. Try pdfminer.six (Best for complex layouts)
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(io.BytesIO(data))
        except Exception as e:
            print(f"pdfminer failed in gemini: {e}")
        
        # 2. Fallback to pypdf
        if not text or len(text.strip()) < 50:
             try:
                reader = pypdf.PdfReader(io.BytesIO(data))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
             except Exception as e:
                 print(f"pypdf fallback failed: {e}")
        
        if text and len(text.strip()) > 0:
            print(f"DEBUG: Extracted text preview (first 200 chars): {text[:200]}")
            return text[:12000] # Increased limit for Llama 3.3
            
        return "Error: Could not parse document text."

    # Assume raw text input
    print(f"DEBUG: Raw text input preview: {input_data[:200]}")
    return input_data[:8000]

def generate_content(prompt: str) -> str:
    if not API_KEY:
        raise Exception("Groq API Key not configured")
    try:
        print(f"DEBUG: Calling Groq with model {MODEL_NAME}")
        completion = client.chat.completions.create(
          model=MODEL_NAME,
          messages=[
            {
              "role": "user",
              "content": prompt
            }
          ]
        )
        print("DEBUG: Groq call successful")
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Groq generation error: {e}")
        traceback.print_exc()
        raise e

async def analyze_resume_with_context(resume_input: str, job_desc: str = None) -> str:
    # Extract clean text first
    resume_text = extract_text_from_input(resume_input)
    
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) scanner and professional resume writer.
    Analyze the following resume text against the provided job description (if any).
    
    Resume Text:
    {resume_text}

    Job Description:
    {job_desc if job_desc else "General Professional Context (No specific job provided)"}

    Return a valid JSON object with the following structure (do NOT return Markdown code blocks, just the raw JSON string):
    {{
        "score": <0-100 integer representing match score>,
        "candidateInfo": {{
            "name": "<extracted name>",
            "headline": "<extracted current title/headline>",
            "email": "<extracted email>"
        }},
        "summary": "<a 2-3 sentence executive summary of the candidate's fit>",
        "skillsDetected": ["<skill1>", "<skill2>", ...],
        "keywordsMissing": ["<keyword1>", "<keyword2>", ... (only if job desc provided, else empty)],
        "formattingIssues": ["<issue1>", ...],
        "improvements": ["<suggestion1>", "<suggestion2>", ... top 3 high impact changes],
        "sectionScores": {{
            "impact": <0-100 score on quantifiable results>,
            "brevity": <0-100 score on conciseness>,
            "style": <0-100 score on language/tone>,
            "structure": <0-100 score on organization>
        }},
        "audit": {{
            "actionVerbs": {{
                "score": <0-100>,
                "issues": ["<bullet point that lacks strong action verb>", ...],
                "suggestions": ["<better verb>", ...]
            }},
            "quantifiableResults": {{
                "score": <0-100>,
                "issues": ["<bullet point that lacks metrics>", ...],
                "suggestions": ["Add numbers like % growth, $ revenue, or team size"]
            }},
            "buzzwords": {{
                "score": <0-100 (100 is good/no buzzwords)>,
                "found": ["<buzzword1>", "<buzzword2>", ...]
            }},
            "personals": {{
                "score": <0-100 (100 is good/no I/me/my)>,
                "found": ["<sentence containing I/me/my>", ...]
            }}
        }}
    }}
    """
    return generate_content(prompt)

async def generate_bullet_points(role: str, company: str, description: str = None) -> List[str]:
    prompt = f"""
    Generate 3-4 powerful, results-oriented bullet points for a resume.
    Role: {role}
    Company: {company}
    Context/Draft: {description if description else "Standard responsibilities for this role"}

    Focus on metrics, action verbs, and impact.
    Return strictly a JSON array of strings. Example: ["Led team...", "Increased revenue..."]
    """
    response_text = generate_content(prompt)
    return extract_json_from_response(response_text)

def extract_json_from_response(text: str):
    try:
        # 1. Try standard markdown cleanup
        clean_text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except json.JSONDecodeError:
        pass
    
    try:
        # 2. Try regex to find first { ... } or [ ... ]
        import re
        # Match outermost braces/brackets
        json_obj_match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
        if json_obj_match:
            return json.loads(json_obj_match.group(1))
    except:
        pass
        
    # 3. Fallback: manual substring finding (already in generate_bullet_points but imperfect)
    if "[" in text and "]" in text:
        start = text.find("[")
        end = text.rfind("]") + 1
        try:
             return json.loads(text[start:end])
        except: pass
        
    return [] # Fail safe

async def generate_summary(role: str, skills: List[str]) -> str:
    prompt = f"""
    Write a compelling professional summary for a resume.
    Target Role: {role}
    Key Skills: {", ".join(skills)}
    
    Keep it under 300 characters. Professional code tone.
    """
    return generate_content(prompt)

async def parse_resume_to_json(file_content: str) -> str:
    """
    Parses a base64 encoded PDF or text content into a structured Resume JSON object.
    Matches the frontend Resume interface.
    """
    text = extract_text_from_input(file_content)
    
    prompt = f"""
    You are a precise data extraction AI. Extract resume details from the text below into a strict JSON format.
    
    RESUME TEXT:
    {text}
    
    REQUIRED JSON STRUCTURE:
    {{
        "personalInfo": {{
            "fullName": "...",
            "email": "...",
            "phone": "...",
            "location": "...",
            "website": "...",
            "linkedin": "...",
            "title": "..."  // inferred from most recent role or summary
        }},
        "summary": "...",
        "experience": [
            {{
                "id": "exp_1", // generate unique IDs
                "role": "...",
                "company": "...",
                "startDate": "...",
                "endDate": "...",
                "description": "..." // bullet points as a single block of text
            }}
        ],
        "education": [
            {{
                "id": "edu_1",
                "school": "...",
                "degree": "...",
                "year": "..." // e.g. "2018 - 2022"
            }}
        ],
        "skills": ["skill1", "skill2", ...],
        "projects": [] // optional
    }}
    
    RULES:
    - If a field is missing, use empty string "" or empty array [].
    - Ensure 'id' fields are generated for arrays.
    - Return ONLY the raw JSON string, no markdown formatting.
    """
    
    response = generate_content(prompt)
    # Clean up markdown if present
    clean_json = response.replace("```json", "").replace("```", "").strip()
    return clean_json

async def chat_with_context(message: str, history: List[Dict[str, str]], system_instruction: str = "") -> str:
    if not API_KEY:
        raise Exception("Groq API Key not configured")
        
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
        
    # Add history
    for msg in history:
        messages.append(msg)
        
    # Add current message
    messages.append({"role": "user", "content": message})
    
    try:
        completion = client.chat.completions.create(
          model=MODEL_NAME,
          messages=messages
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Chat generation error: {e}")
        traceback.print_exc()
        raise e

