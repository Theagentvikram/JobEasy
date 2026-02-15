from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import unescape
import inspect
import json
import os
import re
import socket
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

import requests


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

# Disabled by default to keep extraction fast and deterministic.
# Set JOBSPY_ENABLED=true to re-enable.
JOBSPY_ENABLED = os.getenv("JOBSPY_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class ExtractedJob:
    title: str = ""
    company: str = ""
    source: str = "other"
    sourceOther: str = ""
    link: str = ""
    location: str = ""
    jobType: str = "unknown"
    salaryRange: str = ""
    jobDescription: str = ""
    notes: str = ""
    tags: List[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    job: ExtractedJob
    method: str
    warnings: List[str] = field(default_factory=list)
    fetchedAt: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _strip_html(value: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", value or "")
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p>", "\n", text)
    text = re.sub(r"(?is)</(?:h[1-6]|div|li|section|article|tr)>", "\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return "\n".join([line.strip() for line in text.split("\n") if line.strip()]).strip()


def _truncate_text(value: str, max_chars: int = 9000) -> str:
    text = (value or "").strip()
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars].rstrip()}..."


def _normalize_company_case(value: str) -> str:
    text = _normalize_whitespace(value)
    if not text:
        return ""
    # If company is all lowercase (e.g., "techolution"), present it cleanly.
    if text.islower():
        return " ".join(part.capitalize() for part in text.split(" "))
    return text


def _cleanup_headline(text: str) -> str:
    cleaned = _normalize_whitespace(unescape(text))
    cleaned = re.sub(r"\s*\|\s*LinkedIn\s*$", "", cleaned, flags=re.I)
    cleaned = re.sub(r"^\s*LinkedIn:\s*", "", cleaned, flags=re.I)
    return cleaned.strip(" -")


def _parse_hiring_headline(text: str) -> Tuple[str, str, str]:
    """
    Parse common LinkedIn headline formats:
    - "techolution hiring Generative AI Engineer in Hyderabad, Telangana, India"
    - "Techolution is hiring Generative AI Engineer in Hyderabad, Telangana, India"
    - "Generative AI Engineer at Techolution in Hyderabad, Telangana, India"
    """
    cleaned = _cleanup_headline(text)
    if not cleaned:
        return "", "", ""

    patterns = [
        r"^(?P<company>.+?)\s+(?:is\s+)?hiring\s+(?P<title>.+?)\s+in\s+(?P<location>.+)$",
        r"^(?P<title>.+?)\s+at\s+(?P<company>.+?)\s+in\s+(?P<location>.+)$",
    ]

    for pattern in patterns:
        match = re.match(pattern, cleaned, flags=re.I)
        if not match:
            continue
        title = _normalize_whitespace(match.groupdict().get("title", ""))
        company = _normalize_company_case(match.groupdict().get("company", ""))
        location = _normalize_whitespace(match.groupdict().get("location", ""))
        if title and company:
            return title, company, location

    return "", "", ""


def _looks_generic_description(text: str) -> bool:
    value = (text or "").lower()
    if not value:
        return True
    generic_fragments = [
        "join linkedin",
        "sign in",
        "log in",
        "by clicking continue",
        "agree to the user agreement",
        "we use cookies",
        "linkedin cookie policy",
    ]
    return any(fragment in value for fragment in generic_fragments)


def _extract_meta_content(html: str, attr: str, name: str) -> str:
    pattern = rf'(?is)<meta[^>]+{attr}=["\']{re.escape(name)}["\'][^>]+content=["\'](.*?)["\']'
    match = re.search(pattern, html or "")
    if not match:
        return ""
    return _normalize_whitespace(unescape(match.group(1)))


TAG_PATTERNS: List[Tuple[str, List[str]]] = [
    ("Generative AI", [r"\bgen(?:erative)?\s*ai\b"]),
    ("LLM", [r"\bllm(?:s)?\b", r"\blarge language model(?:s)?\b"]),
    ("RAG", [r"\brag\b", r"\bretrieval[- ]augmented generation\b"]),
    ("LangChain", [r"\blangchain\b"]),
    ("Python", [r"\bpython\b"]),
    ("Machine Learning", [r"\bmachine learning\b", r"\bml\b"]),
    ("Deep Learning", [r"\bdeep learning\b", r"\bdl\b"]),
    ("NLP", [r"\bnlp\b", r"\bnatural language processing\b"]),
    ("TTS", [r"\btext[- ]to[- ]speech\b", r"\btts\b"]),
    ("STT", [r"\bspeech[- ]to[- ]text\b", r"\bstt\b"]),
    ("REST APIs", [r"\brest(?:ful)?\s+api(?:s)?\b"]),
    ("Docker", [r"\bdocker\b"]),
    ("AWS", [r"\baws\b", r"\bamazon web services\b"]),
    ("GCP", [r"\bgcp\b", r"\bgoogle cloud\b"]),
    ("MLOps", [r"\bmlops\b"]),
    ("LLMOps", [r"\bllmops\b"]),
    ("Prompt Engineering", [r"\bprompt engineering\b"]),
    ("Git", [r"\bgit\b"]),
    ("Chatbots", [r"\bchatbot(?:s)?\b"]),
]


def _clean_text_block(raw_text: str) -> str:
    lines: List[str] = []
    for line in (raw_text or "").splitlines():
        normalized = _normalize_whitespace(line)
        if not normalized:
            continue
        # Remove common list markers without losing content.
        normalized = re.sub(r"^[\-\*\u2022]\s*", "", normalized)
        normalized = re.sub(r"^\d+[\.\)]\s*", "", normalized)
        lines.append(normalized)
    return _truncate_text("\n".join(lines), max_chars=12000)


def _extract_labeled_value(text: str, labels: List[str]) -> str:
    if not text:
        return ""
    for label in labels:
        pattern = rf"(?im)^\s*{re.escape(label)}\s*[:\-]\s*(.+?)\s*$"
        match = re.search(pattern, text)
        if match:
            return _normalize_whitespace(match.group(1))
        inline_pattern = rf"(?is)\b{re.escape(label)}\s*[:\-]\s*([^\n\r]+)"
        inline_match = re.search(inline_pattern, text)
        if inline_match:
            return _normalize_whitespace(inline_match.group(1))
    return ""


def _extract_company_from_text(text: str, fallback_url: str = "") -> str:
    # "Why Techolution?"
    why_match = re.search(r"(?im)^\s*Why\s+([A-Za-z][A-Za-z0-9&\.\-,' ]{1,80})\?\s*$", text or "")
    if why_match:
        return _normalize_company_case(why_match.group(1))

    # "Visit: www.techolution.com"
    visit_match = re.search(
        r"(?im)\b(?:visit|website|careers?)\s*:\s*(?:https?://)?(?:www\.)?([a-z0-9-]+)\.(?:com|ai|io|co|in)\b",
        text or "",
    )
    if visit_match:
        company_raw = visit_match.group(1).replace("-", " ")
        return _normalize_company_case(company_raw)

    # Headline-style parsing anywhere in the text.
    for line in (text or "").splitlines():
        _, parsed_company, _ = _parse_hiring_headline(line)
        if parsed_company:
            return _normalize_company_case(parsed_company)

    # Fallback from URL domain.
    if fallback_url:
        parsed = urlparse(fallback_url)
        host = (parsed.netloc or "").lower()
        domain_match = re.search(r"(?:www\.)?([a-z0-9-]+)\.(?:com|ai|io|co|in)$", host)
        if domain_match and "linkedin" not in host:
            return _normalize_company_case(domain_match.group(1).replace("-", " "))

    return ""


def _extract_tags_from_text(text: str) -> List[str]:
    content = (text or "").lower()
    tags: List[str] = []
    for tag, patterns in TAG_PATTERNS:
        if any(re.search(pattern, content, flags=re.I) for pattern in patterns):
            tags.append(tag)
    return tags[:12]


def _focus_job_section(text: str) -> str:
    value = text or ""
    if not value:
        return ""
    lowered = value.lower()

    markers = [
        "about the job",
        "role:",
        "what you'll do",
        "what you bring",
        "core requirements",
        "responsibilities",
        "requirements",
        "how to apply",
    ]
    starts = [lowered.find(marker) for marker in markers if lowered.find(marker) != -1]
    if not starts:
        return value

    start = min(starts)
    candidate = value[start:]
    # Keep enough room for role/responsibilities/requirements/apply sections.
    return _truncate_text(candidate, max_chars=10000)


def _extract_visible_page_text(html: str) -> str:
    if not html:
        return ""
    body_match = re.search(r"(?is)<body[^>]*>(.*)</body>", html)
    body_html = body_match.group(1) if body_match else html
    cleaned = _clean_text_block(_strip_html(body_html))
    return _focus_job_section(cleaned)


def _canonicalize_url(raw_url: str) -> Tuple[str, Optional[str], bool]:
    cleaned = (raw_url or "").strip()
    parsed = urlparse(cleaned)
    host = parsed.netloc.lower()
    is_linkedin = "linkedin.com" in host
    job_id: Optional[str] = None

    if is_linkedin:
        qs = parse_qs(parsed.query)
        if qs.get("currentJobId"):
            job_id = qs["currentJobId"][0]
        if not job_id:
            view_match = re.search(r"/jobs/view/(\d+)", parsed.path)
            if view_match:
                job_id = view_match.group(1)
        if not job_id:
            path_match = re.search(r"(\d{7,})", parsed.path)
            if path_match:
                job_id = path_match.group(1)

        if job_id:
            return f"https://www.linkedin.com/jobs/view/{job_id}/", job_id, True

    return cleaned, job_id, is_linkedin


def _coerce_records(payload: Any) -> List[Dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if hasattr(payload, "to_dict"):
        try:
            rows = payload.to_dict("records")
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]
        except Exception:
            pass
    return []


def _pick(record: Dict[str, Any], keys: List[str]) -> str:
    for key in keys:
        value = record.get(key)
        if value is not None and str(value).strip():
            return _normalize_whitespace(str(value))
    return ""


def _map_job_type(value: str, description: str) -> str:
    joined = f"{value} {description}".lower()
    if "remote" in joined:
        return "remote"
    if "hybrid" in joined:
        return "hybrid"
    if "on-site" in joined or "onsite" in joined or "on site" in joined:
        return "onsite"
    return "unknown"


def _find_best_jobspy_match(
    records: List[Dict[str, Any]],
    canonical_url: str,
    job_id: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], int, str]:
    best: Optional[Dict[str, Any]] = None
    best_score = -1
    best_url = ""

    canonical = (canonical_url or "").strip().lower().rstrip("/")

    for row in records:
        raw_url = _pick(row, ["job_url", "url", "jobUrl", "linkedin_url"]).lower().rstrip("/")
        title = _pick(row, ["title", "job_title", "position"]).lower()
        company = _pick(row, ["company", "company_name", "organization", "employer_name"]).lower()
        score = 0
        if canonical and raw_url and canonical in raw_url:
            score += 120
        if job_id and job_id in raw_url:
            score += 100
        if "linkedin" in raw_url:
            score += 5
        if title:
            score += 3
        if company:
            score += 2
        if score > best_score:
            best_score = score
            best = row
            best_url = raw_url

    return best, best_score, best_url


def _extract_from_jobspy(canonical_url: str, job_id: Optional[str]) -> Tuple[Optional[ExtractedJob], str]:
    try:
        module = __import__("jobspy")
    except Exception:
        return None, "jobspy_not_installed"

    scrape_jobs = getattr(module, "scrape_jobs", None)
    if scrape_jobs is None:
        return None, "jobspy_missing_scrape_jobs"

    signature = inspect.signature(scrape_jobs)
    kwargs: Dict[str, Any] = {}

    # Fast preflight to surface infra/network problems clearly.
    try:
        socket.getaddrinfo("www.linkedin.com", 443)
    except Exception as exc:
        return None, f"jobspy_dns_error:{exc}"

    def use_if_supported(name: str, value: Any):
        if name in signature.parameters:
            kwargs[name] = value

    # Best-effort invocation: JobSpy signatures vary by version.
    use_if_supported("site_name", ["linkedin"])
    use_if_supported("search_term", job_id or "software engineer")
    use_if_supported("location", "United States")
    use_if_supported("results_wanted", 25)
    use_if_supported("hours_old", 720)
    use_if_supported("country_indeed", "USA")
    use_if_supported("linkedin_fetch_description", True)
    use_if_supported("offset", 0)
    use_if_supported("verbose", 0)

    try:
        payload = scrape_jobs(**kwargs)
    except Exception as exc:
        return None, f"jobspy_error:{exc}"

    records = _coerce_records(payload)
    if not records:
        return None, "jobspy_no_records"

    row, confidence_score, matched_url = _find_best_jobspy_match(records, canonical_url, job_id)
    if row is None:
        return None, "jobspy_no_records"

    # Strict guard: for a concrete LinkedIn job URL, do not trust JobSpy unless
    # it points to the same job id.
    if job_id and (not matched_url or job_id not in matched_url):
        return None, "jobspy_mismatch_url"

    # If URL-specific confidence is too low, avoid polluting fields with wrong job.
    if confidence_score < 10:
        return None, "jobspy_low_confidence"

    description = _pick(
        row,
        [
            "description",
            "job_description",
            "description_text",
            "job_summary",
            "summary",
        ],
    )

    title = _pick(row, ["title", "job_title", "position"])
    company = _pick(row, ["company", "company_name", "organization", "employer_name"])
    location = _pick(row, ["location", "job_location", "city"])
    salary = _pick(row, ["salary_source", "salary", "compensation"])
    raw_type = _pick(row, ["job_type", "employment_type", "schedule_type"])
    source_link = _pick(row, ["job_url", "url", "jobUrl", "linkedin_url"])

    if not title and not company:
        return None, "jobspy_low_confidence"

    job = ExtractedJob(
        title=title,
        company=company,
        source="linkedin",
        link=source_link or canonical_url,
        location=location,
        jobType=_map_job_type(raw_type, description),
        salaryRange=salary,
        jobDescription=_truncate_text(description),
        notes="Autofilled from URL (JobSpy).",
        tags=_extract_tags_from_text(description),
    )
    return job, "jobspy"


def _extract_ldjson_jobposting(html: str) -> Dict[str, Any]:
    scripts = re.findall(
        r'(?is)<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html or "",
    )
    for script_content in scripts:
        raw = (script_content or "").strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            # Sometimes multiple JSON objects appear in one script block.
            chunks = re.findall(r"\{.*?\}", raw, flags=re.S)
            parsed = None
            for chunk in chunks:
                try:
                    parsed = json.loads(chunk)
                    if isinstance(parsed, dict):
                        break
                except Exception:
                    continue
            if not isinstance(parsed, dict):
                continue
            payload = parsed

        nodes: List[Dict[str, Any]] = []
        if isinstance(payload, dict):
            if isinstance(payload.get("@graph"), list):
                nodes.extend([n for n in payload["@graph"] if isinstance(n, dict)])
            nodes.append(payload)
        elif isinstance(payload, list):
            nodes.extend([n for n in payload if isinstance(n, dict)])

        for node in nodes:
            node_type = str(node.get("@type", "")).lower()
            if "jobposting" in node_type:
                return node
    return {}


def _extract_title_company_from_meta(html: str) -> Tuple[str, str, str, str]:
    title = ""
    company = ""
    location = ""
    summary = ""

    og_title = _extract_meta_content(html, "property", "og:title")
    twitter_title = _extract_meta_content(html, "name", "twitter:title")
    page_title_match = re.search(r"(?is)<title>(.*?)</title>", html or "")
    page_title = _cleanup_headline(page_title_match.group(1)) if page_title_match else ""

    for candidate in [og_title, twitter_title, page_title]:
        if not candidate:
            continue
        parsed_title, parsed_company, parsed_location = _parse_hiring_headline(candidate)
        if parsed_title:
            title = parsed_title
        else:
            title = title or _cleanup_headline(candidate)
        if parsed_company:
            company = parsed_company
        if parsed_location:
            location = parsed_location
        if title and company:
            break

    description_meta = _extract_meta_content(html, "name", "description")
    og_description = _extract_meta_content(html, "property", "og:description")
    twitter_description = _extract_meta_content(html, "name", "twitter:description")

    for desc in [description_meta, og_description, twitter_description]:
        if not desc:
            continue
        parsed_title, parsed_company, parsed_location = _parse_hiring_headline(desc)
        if parsed_title and not title:
            title = parsed_title
        if parsed_company and not company:
            company = parsed_company
        if parsed_location and not location:
            location = parsed_location
        # Keep description only when it looks substantive (not just headline text).
        if (
            not summary
            and len(desc) > 80
            and not _looks_generic_description(desc)
            and not parsed_title
        ):
            summary = desc

    company = _normalize_company_case(company)
    return title, company, location, summary


def _extract_from_public_html(canonical_url: str) -> Tuple[Optional[ExtractedJob], str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        response = requests.get(canonical_url, headers=headers, timeout=8, allow_redirects=True)
    except Exception as exc:
        return None, f"http_error:{exc}"

    if response.status_code >= 400:
        return None, f"http_status:{response.status_code}"

    html = response.text or ""
    page_text = _extract_visible_page_text(html)
    node = _extract_ldjson_jobposting(html)

    title = ""
    company = ""
    location = ""
    salary = ""
    description = ""
    raw_type = ""

    if node:
        title = _normalize_whitespace(str(node.get("title", "")))
        description = _strip_html(str(node.get("description", "")))
        raw_type = _normalize_whitespace(str(node.get("employmentType", "")))

        org = node.get("hiringOrganization")
        if isinstance(org, dict):
            company = _normalize_whitespace(str(org.get("name", "")))

        job_location = node.get("jobLocation")
        locations: List[str] = []
        if isinstance(job_location, list):
            iterable = job_location
        else:
            iterable = [job_location]
        for loc in iterable:
            if not isinstance(loc, dict):
                continue
            addr = loc.get("address", {})
            if isinstance(addr, dict):
                parts = [
                    _normalize_whitespace(str(addr.get("addressLocality", ""))),
                    _normalize_whitespace(str(addr.get("addressRegion", ""))),
                    _normalize_whitespace(str(addr.get("addressCountry", ""))),
                ]
                text = ", ".join([p for p in parts if p])
                if text:
                    locations.append(text)
        location = "; ".join(dict.fromkeys(locations))

        base_salary = node.get("baseSalary")
        if isinstance(base_salary, dict):
            value = base_salary.get("value")
            if isinstance(value, dict):
                min_value = value.get("minValue")
                max_value = value.get("maxValue")
                unit = value.get("unitText")
                if min_value and max_value:
                    salary = f"{min_value} - {max_value} {unit or ''}".strip()

    if not title or not company or not location or not description:
        meta_title, meta_company, meta_location, meta_summary = _extract_title_company_from_meta(html)
        title = title or meta_title
        company = company or meta_company
        location = location or meta_location
        if not description and meta_summary:
            description = meta_summary

    # Final LinkedIn-specific repair if title still contains the full "company hiring role in location" phrase.
    repaired_title, repaired_company, repaired_location = _parse_hiring_headline(title)
    if repaired_title and repaired_company:
        title = repaired_title
        company = company or repaired_company
        location = location or repaired_location

    if not title and not company and not description:
        return None, "public_html_no_job_data"

    job = ExtractedJob(
        title=title,
        company=company,
        source="linkedin" if "linkedin.com" in canonical_url else "other",
        link=canonical_url,
        location=location,
        jobType=_map_job_type(raw_type, description),
        salaryRange=salary,
        jobDescription=_truncate_text(description),
        notes="Autofilled from URL metadata.",
        tags=_extract_tags_from_text(description),
    )

    # Prefer full-page text extraction over metadata whenever available.
    page_job = None
    if page_text and len(page_text) > 180 and not _looks_generic_description(page_text):
        page_job, _ = _extract_from_text(
            page_text,
            fallback_url=canonical_url,
            source_hint="linkedin" if "linkedin.com" in canonical_url else "other",
        )

    if page_job:
        merged = merge_extracted_jobs(job, page_job)
        if merged.notes:
            merged.notes = f"{merged.notes}\nAutofilled from page content.".strip()
        else:
            merged.notes = "Autofilled from page content."
        return merged, "public_html_page"

    return job, "public_html_meta"


def _extract_from_text(raw_text: str, fallback_url: str = "", source_hint: str = "other") -> Tuple[Optional[ExtractedJob], str]:
    cleaned = _focus_job_section(_clean_text_block(raw_text))
    if not cleaned:
        return None, "text_empty"

    title = _extract_labeled_value(cleaned, ["Role", "Position", "Job Title", "Title"])
    location = _extract_labeled_value(cleaned, ["Location", "Work Location"])
    employment_type = _extract_labeled_value(cleaned, ["Employment Type", "Type"])
    experience_req = _extract_labeled_value(cleaned, ["Experience", "Requirements", "Requirement"])
    company = _extract_company_from_text(cleaned, fallback_url=fallback_url)

    if not title:
        for line in cleaned.splitlines()[:15]:
            parsed_title, parsed_company, parsed_location = _parse_hiring_headline(line)
            if parsed_title:
                title = parsed_title
            if parsed_company and not company:
                company = parsed_company
            if parsed_location and not location:
                location = parsed_location
            if title:
                break

    if not title:
        for line in cleaned.splitlines():
            if re.search(r"\bintern\b", line, flags=re.I) or re.search(r"\bengineer\b", line, flags=re.I):
                if len(line) <= 120 and "what you'll" not in line.lower():
                    title = _normalize_whitespace(line)
                    break

    job_type = _map_job_type(employment_type, cleaned)
    tags = _extract_tags_from_text(cleaned)

    notes_parts: List[str] = []
    if employment_type:
        notes_parts.append(f"Employment Type: {employment_type}")
    if experience_req:
        notes_parts.append(f"Experience: {experience_req}")

    source = "linkedin" if "linkedin.com" in (fallback_url or "").lower() else (source_hint or "other")
    job = ExtractedJob(
        title=title,
        company=company,
        source=source,
        link=fallback_url,
        location=location,
        jobType=job_type,
        salaryRange="",
        jobDescription=cleaned,
        notes="\n".join(notes_parts).strip(),
        tags=tags,
    )
    return job, "text_heuristic"


def merge_extracted_jobs(base: Optional[ExtractedJob], overlay: Optional[ExtractedJob]) -> ExtractedJob:
    if base is None and overlay is None:
        return ExtractedJob()
    if base is None:
        return overlay or ExtractedJob()
    if overlay is None:
        return base

    merged = ExtractedJob(**base.__dict__)
    scalar_fields = [
        "title",
        "company",
        "source",
        "sourceOther",
        "link",
        "location",
        "jobType",
        "salaryRange",
        "jobDescription",
    ]

    for key in scalar_fields:
        value = getattr(overlay, key, "")
        if not value:
            continue
        if key == "source" and value == "other" and merged.source:
            continue
        setattr(merged, key, value)

    if overlay.notes:
        if merged.notes:
            if overlay.notes not in merged.notes:
                merged.notes = f"{merged.notes}\n{overlay.notes}".strip()
        else:
            merged.notes = overlay.notes

    merged.tags = list(dict.fromkeys([*(base.tags or []), *(overlay.tags or [])]))[:12]
    return merged


def _fill_safe_defaults(job: ExtractedJob, canonical_url: str, job_id: Optional[str], is_linkedin: bool) -> ExtractedJob:
    if not job.link:
        job.link = canonical_url
    if not job.source or job.source == "other":
        job.source = "linkedin" if is_linkedin else "other"
    if not job.title and job_id:
        job.title = f"LinkedIn Job #{job_id}" if is_linkedin else f"Imported Job #{job_id}"
    if not job.notes:
        job.notes = "Autofilled from URL."
    return job


def extract_job_from_text(raw_text: str, fallback_url: str = "", source_hint: str = "other") -> ExtractionResult:
    warnings: List[str] = []
    if not (raw_text or "").strip():
        raise ValueError("Pasted job text is empty.")

    job, method = _extract_from_text(raw_text, fallback_url=fallback_url, source_hint=source_hint)
    if not job:
        raise ValueError("Could not parse details from pasted job text.")

    if not job.title:
        warnings.append("Could not confidently detect job title from pasted text.")
    if not job.company:
        warnings.append("Could not confidently detect company from pasted text.")
    if not job.location:
        warnings.append("Could not detect location from pasted text.")

    return ExtractionResult(job=job, method=method, warnings=warnings)


def extract_job_from_url(url: str, jobspy_enabled: Optional[bool] = None) -> ExtractionResult:
    canonical_url, job_id, is_linkedin = _canonicalize_url(url)
    warnings: List[str] = []

    if not canonical_url:
        raise ValueError("A valid job URL is required.")

    use_jobspy = JOBSPY_ENABLED if jobspy_enabled is None else bool(jobspy_enabled)

    # 1) Optional JobSpy path (disabled by default for speed/reliability).
    if use_jobspy:
        job, method = _extract_from_jobspy(canonical_url, job_id)
        if job:
            job = _fill_safe_defaults(job, canonical_url, job_id, is_linkedin)
            return ExtractionResult(job=job, method=method, warnings=warnings)

        if method == "jobspy_not_installed":
            warnings.append("JobSpy is not installed in backend environment.")
        elif method == "jobspy_missing_scrape_jobs":
            warnings.append("JobSpy is installed but scrape_jobs is missing.")
        elif method.startswith("jobspy_dns_error:"):
            warnings.append("JobSpy cannot reach LinkedIn (DNS/network issue in runtime environment).")
        elif method.startswith("jobspy_error:"):
            warnings.append("JobSpy execution failed while querying LinkedIn.")
        elif method == "jobspy_no_records":
            warnings.append("JobSpy returned zero job records for this query/link.")
        elif method == "jobspy_mismatch_url":
            warnings.append("JobSpy returned a different job than the requested LinkedIn URL.")
        elif method == "jobspy_low_confidence":
            warnings.append("JobSpy result confidence was too low, so it was skipped.")
        else:
            warnings.append("JobSpy extraction unavailable or returned no match.")

    # 2) Public metadata fallback
    html_job, html_method = _extract_from_public_html(canonical_url)
    if html_job:
        html_job = _fill_safe_defaults(html_job, canonical_url, job_id, is_linkedin)
        warnings.append(f"Fallback used: {html_method}.")
        return ExtractionResult(job=html_job, method=html_method, warnings=warnings)

    warnings.append("Public page extraction failed (likely login wall or network restriction).")

    # 3) Always return a safe partial payload so UI can still auto-fill link/source
    fallback_job = ExtractedJob(
        title=f"LinkedIn Job #{job_id}" if (is_linkedin and job_id) else "",
        company="",
        source="linkedin" if is_linkedin else "other",
        link=canonical_url,
        location="",
        jobType="unknown",
        salaryRange="",
        jobDescription="",
        notes="URL captured. Could not fetch full job data automatically.",
    )
    fallback_job = _fill_safe_defaults(fallback_job, canonical_url, job_id, is_linkedin)
    return ExtractionResult(job=fallback_job, method="fallback_minimal", warnings=warnings)
