from fastapi import APIRouter, HTTPException, Body, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
import json
from services.gemini import analyze_resume_with_context, generate_bullet_points, generate_summary, extract_json_from_response
from services.auth import get_current_user
from services.firebase import check_user_limit, increment_scan_count, verify_token

router = APIRouter(prefix="/ai", tags=["AI"])

# Optional auth helper — returns user dict or None (no 401)
async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        decoded = verify_token(token)
        return decoded
    except:
        return None

# Request Models
class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class BulletsRequest(BaseModel):
    role: str
    company: str
    description: Optional[str] = None

class SummaryReq(BaseModel):
    role: str
    skills: List[str]

@router.post("/analyze")
async def analyze_resume(req: AnalyzeRequest, user=Depends(get_optional_user)):
    # If authenticated, check usage limits
    if user:
        user_id = user['uid']
        if not check_user_limit(user_id, limit_type="scan_count"):
            raise HTTPException(
                status_code=403, 
                detail="Free plan limit reached (1 ATS scan/day). Upgrade for premium access (up to 20 scans/day)."
            )

    try:
        raw_result = await analyze_resume_with_context(req.resume_text, req.job_description)
        
        print(f"DEBUG: Raw LLM response prefix: {raw_result[:200] if raw_result else 'None'}")
        
        parsed_result = extract_json_from_response(raw_result)
        
        if not parsed_result:
             clean_json = raw_result.replace("```json", "").replace("```", "").strip()
             try:
                parsed_result = json.loads(clean_json)
             except:
                raise ValueError("Could not extract valid JSON from LLM response")

        # Increment usage count only for authenticated users
        if user:
            increment_scan_count(user['uid'], limit_type="scan_count")

        return parsed_result
    except Exception as e:
        print(f"Analyze Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-bullets")
async def generate_bullets_api(req: BulletsRequest, user=Depends(get_current_user)):
    try:
        # Optional: Limit bullet generation too? User didn't specify, but safer to add auth at least.
        # But for now I'll just adding auth, no limits yet unless requested.
        raw_result = await generate_bullet_points(req.role, req.company, req.description)
        if isinstance(raw_result, str):
             return json.loads(raw_result) # Should already be cleaned in service, but double check
        return raw_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ExtractJobRequest(BaseModel):
    url: str

@router.post("/extract-job")
async def extract_job_description(req: ExtractJobRequest):
    try:
        import trafilatura
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse, parse_qs
        
        target_url = req.url
        
        # Optimize LinkedIn URLs: Convert search/tracker links to direct job view links
        if "linkedin.com" in target_url:
            parsed = urlparse(target_url)
            qs = parse_qs(parsed.query)
            if 'currentJobId' in qs:
                job_id = qs['currentJobId'][0]
                target_url = f"https://www.linkedin.com/jobs/view/{job_id}/"
                print(f"Refined LinkedIn URL to: {target_url}")
        
        print(f"Fetching job description from: {target_url}")
        
        # Method 2: The "Hacker" Method (Guest View)
        # Headers are CRITICAL for LinkedIn to avoid 999
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        try:
            response = requests.get(target_url, headers=headers, timeout=10)
            
            # If LinkedIn and we got a good response, try specific parsing first
            if "linkedin.com" in target_url and response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                # LinkedIn Guest View Class (Subject to change, but currently standard)
                description_div = soup.find("div", {"class": "show-more-less-html__markup"})
                if description_div:
                     clean_text = description_div.get_text(separator="\n").strip()
                     return {"job_description": clean_text}
                
                # If that class isn't found, fall through to generic extraction or error
                
            response.raise_for_status()
            downloaded = response.text

        except Exception as fetch_err:
             print(f"Requests fetch failed: {fetch_err}")
             downloaded = None

        # Fallback to trafilatura if requests failed or custom parsing didn't return
        if not downloaded:
             print("Falling back to trafilatura fetcher...")
             downloaded = trafilatura.fetch_url(target_url)

        if not downloaded:
             # Final Check for LinkedIn specific error
             if "linkedin.com" in target_url:
                  raise HTTPException(status_code=422, detail="LinkedIn requires login to view this job (Login Wall). Please copy and paste the text manually.")
             raise HTTPException(status_code=400, detail="Failed to fetch URL. Please check the link or paste text manually.")

        # 2. Extract Main Content (Generic)
        result = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        
        if not result:
             # Try fallback: simple text extraction if trafilatura fails to find "article" content
             soup = BeautifulSoup(downloaded, 'html.parser')
             for script in soup(["script", "style"]):
                 script.extract()
             text = soup.get_text()
             lines = (line.strip() for line in text.splitlines())
             chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
             result = '\n'.join(chunk for chunk in chunks if chunk)
             
             if not result or len(result) < 50:
                 raise HTTPException(status_code=422, detail="Could not extract meaningful text. The page might be behind a login wall.")

        return {"job_description": result}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract job: {str(e)}")
# Helper to return a basic structure if scraping fails
def return_basic_profile(url, error_msg=None):
    print(f"Returning basic profile due to error: {error_msg}")
    try:
        domain = url.split('//')[-1].split('/')[0]
    except:
        domain = "Profile"
        
    return {
        "personalInfo": {
            "fullName": "",
            "email": "",
            "phone": "",
            "location": "",
            "website": "",
            "linkedin": url,
            "title": "Imported Profile (Manual Entry Required)"
        },
        "summary": f"Could not automatically extract data ({error_msg}). Please fill in details manually.",
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "title": f"Profile from {domain}"
    }

class ExtractProfileRequest(BaseModel):
    url: str

@router.post("/extract-profile")
async def extract_profile(req: ExtractProfileRequest):
    try:
        import trafilatura
        import requests
        from bs4 import BeautifulSoup
        import traceback
        
        target_url = req.url
        print(f"Fetching profile from: {target_url}")
        
        # Reuse the "Guest View" scraping logic
        # Enhanced headers + Cookies to mimic a real logged-in or guest session
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }
        
        # Simple/Dummy cookies sometimes help trigger a cleaner guest view or at least avoid immediate 999
        cookies = {
            "bcookie": "v=2&lang=en-us",
            "lidc": "b=TB01",
            "JSESSIONID": "ajax:5361646261564"
        }
        
        downloaded = None
        final_url = target_url

        try:
            # Allow redirects
            session = requests.Session()
            response = session.get(target_url, headers=headers, cookies=cookies, timeout=15, allow_redirects=True)
            final_url = response.url
            print(f"DEBUG: Final URL after redirects: {final_url}")
            print(f"DEBUG: Status Code: {response.status_code}")
            
            if response.status_code == 999 or response.status_code == 429:
                 print("LinkedIn blocked the request (Status 999/429).")
                 return return_basic_profile(target_url, "LinkedIn blocked automated access")

            # Special handling for LinkedIn Guest View
            if "linkedin.com" in final_url and response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Check for login wall titles
                page_title = soup.title.string if soup.title else ""
                if "LinkedIn: Log In or Sign Up" in page_title or "Sign In" in page_title:
                     print("DEBUG: Detected Login Wall via Title")
                else:
                    clean_text = soup.get_text(separator="\n").strip()
                    # LinkedIn auth wall often has short text "Sign In | LinkedIn" etc.
                    if len(clean_text) > 500:
                        downloaded = clean_text
                        print(f"DEBUG: Successfully extracted {len(downloaded)} chars via BS4")
                    else:
                        print(f"DEBUG: Text too short ({len(clean_text)} chars). Likely login wall.")
            
            if not downloaded and response.status_code == 200:
                 # Try using response text directly if BS4 custom extraction failed but status is 200
                 downloaded = response.text
                
        except Exception as e:
            print(f"Profile fetch warning: {e}")
            # Don't fail completely yet, try fallback
            
        # Fallback to trafilatura
        if not downloaded or len(downloaded) < 500:
            print("Falling back to trafilatura...")
            try:
                downloaded = trafilatura.fetch_url(final_url)
            except Exception as e:
                print(f"Trafilatura fetch failed: {e}")
            
        if not downloaded:
             # If we failed completely, return basic profile instead of error
             return return_basic_profile(target_url, "Failed to load page")
             
        # Extract text if we have HTML
        text_content = ""
        try:
            if "<html" in downloaded.lower():
                 text_content = trafilatura.extract(downloaded)
                 if not text_content:
                     soup = BeautifulSoup(downloaded, "html.parser")
                     for script in soup(["script", "style"]):
                         script.extract()
                     text_content = soup.get_text(separator="\n")
            else:
                text_content = downloaded
        except Exception as e:
            print(f"Extraction failed: {e}")
            return return_basic_profile(target_url, "Text extraction failed")

        if not text_content or len(text_content) < 100:
             return return_basic_profile(target_url, "Content too short or login wall")

        # Parse with Gemini
        from services.gemini import parse_resume_to_json
        print("Parsing profile text with Gemini...")
        try:
            resume_json_str = await parse_resume_to_json(text_content[:15000]) # Limit to avoid context window issues
            
            import json
            # Sanitize JSON string (gemini sometimes adds markdown blocks)
            if "```json" in resume_json_str:
                resume_json_str = resume_json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in resume_json_str:
                resume_json_str = resume_json_str.split("```")[1].strip()
                
            resume_data = json.loads(resume_json_str)
            
            # Ensure it has a title
            if not resume_data.get('personalInfo', {}).get('title'):
                 if 'personalInfo' not in resume_data:
                     resume_data['personalInfo'] = {}
                 resume_data['personalInfo']['title'] = 'Imported Profile'
                 
            resume_data['title'] = f"Imported from {target_url.split('//')[-1].split('/')[0]}"
            
            return resume_data
            
        except Exception as e:
            print(f"Gemini/JSON parsing failed: {e}")
            return return_basic_profile(target_url, "AI parsing failed")

    except Exception as e:
        print(f"Profile Extraction Error: {e}")
        tb = traceback.format_exc()
        print(tb)
        # Even on critical error, try to return something useful
        return return_basic_profile(req.url, f"Unexpected error: {str(e)}")
