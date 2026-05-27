"""AI-powered Job Discovery system.

Strategy:
- GPT-5.2 generates curated, plausible job recommendations matched to the user's resume,
  skills, ATS keywords, and selected filters.
- Each job ships with deep-link search URLs for LinkedIn / Naukri / Wellfound / Indeed /
  Internshala so the Apply button always lands on a real listing page.
- Company logos are sourced from Clearbit (no auth required).
- Daily quota enforced per subscription plan.
"""
import re
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from auth_utils import get_current_user
from db import resumes, ai_usage
from db import client as mongo_client
from models import JobDiscoverRequest, Job, PLANS
from ai_service import _ask, _extract_json, _log_usage

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Dedicated collection
import os
_db = mongo_client[os.environ["DB_NAME"]]
jobs_col = _db.jobs

JOB_SYSTEM = (
    "You are an expert tech recruiter and job discovery engine for the Indian + global "
    "remote-first market. Reply with STRICT, valid JSON only — no prose, no markdown."
)


def _company_domain(name: str) -> str:
    n = (name or "").lower().strip()
    # Known prominent companies the user listed
    known = {
        "razorpay": "razorpay.com", "swiggy": "swiggy.com", "zomato": "zomato.com",
        "phonepe": "phonepe.com", "flipkart": "flipkart.com", "zepto": "zeptonow.com",
        "cred": "cred.club", "meesho": "meesho.com", "paytm": "paytm.com",
        "freshworks": "freshworks.com", "myntra": "myntra.com", "uber": "uber.com",
        "google": "google.com", "microsoft": "microsoft.com", "amazon": "amazon.com",
        "meta": "meta.com", "atlassian": "atlassian.com", "stripe": "stripe.com",
        "linkedin": "linkedin.com", "github": "github.com", "shopify": "shopify.com",
        "uber india": "uber.com", "byju's": "byjus.com", "byjus": "byjus.com",
        "ola": "olacabs.com", "groww": "groww.in", "upstox": "upstox.com",
        "cleartax": "cleartax.in", "zerodha": "zerodha.com", "postman": "postman.com",
        "browserstack": "browserstack.com", "ninjacart": "ninjacart.com",
    }
    if n in known:
        return known[n]
    # Fallback: kebab-case + .com
    slug = re.sub(r"[^a-z0-9]+", "", n)
    return f"{slug}.com" if slug else "example.com"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def _alt_urls(role: str, company: str, location: str) -> dict:
    role_q = urllib.parse.quote_plus(f"{role} {company}")
    naukri_q = _slug(role)
    return {
        "linkedin": f"https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote_plus(role + ' ' + company)}&location={urllib.parse.quote_plus(location or 'India')}",
        "naukri":   f"https://www.naukri.com/{naukri_q}-jobs?k={urllib.parse.quote_plus(role)}&l={urllib.parse.quote_plus(location or 'India')}",
        "wellfound": f"https://wellfound.com/role/{naukri_q}",
        "indeed":   f"https://in.indeed.com/jobs?q={role_q}&l={urllib.parse.quote_plus(location or 'India')}",
        "internshala": f"https://internshala.com/internships/{naukri_q}-internship",
    }


def _start_of_today_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


@router.get("/usage")
async def usage(user: dict = Depends(get_current_user)):
    from routes_settings import get_effective_plan
    plan = await get_effective_plan(user.get("plan", "free"))
    cap = plan["jobs_per_day"]
    today_iso = _start_of_today_iso()
    used = await jobs_col.count_documents({
        "user_id": user["user_id"],
        "discovered_at": {"$gte": today_iso},
    })
    return {
        "plan": user.get("plan", "free"),
        "plan_name": plan["name"],
        "jobs_per_day": cap,
        "jobs_used_today": used,
        "remaining": max(0, cap - used),
        "unlimited": cap >= 1000,
        "sources": plan["sources"],
        "startup_priority": plan["startup_priority"],
        "hiring_probability": plan["hiring_probability"],
    }


@router.post("/discover")
async def discover(body: JobDiscoverRequest, user: dict = Depends(get_current_user)):
    from routes_settings import get_effective_plan
    plan = await get_effective_plan(user.get("plan", "free"))
    cap = plan["jobs_per_day"]

    today_iso = _start_of_today_iso()
    used_today = await jobs_col.count_documents({
        "user_id": user["user_id"],
        "discovered_at": {"$gte": today_iso},
    })
    if used_today >= cap:
        raise HTTPException(
            status_code=402,
            detail=f"Daily job recommendation limit reached ({used_today}/{cap}). Upgrade your plan for more.",
        )

    # Pull resume text + skills hint
    resume_text = ""
    if body.resume_id:
        r = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
        if r: resume_text = r["content"]
    if not resume_text:
        r = await resumes.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
        if not r:
            r = await resumes.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("discovered_at", -1)])
        if r: resume_text = r["content"]

    # Cap requested count by remaining quota
    to_fetch = min(body.count, max(1, cap - used_today), 20)

    target_role = body.role or "Software Engineer"
    remote_filter = (body.remote_type or "any").lower()
    exp = body.experience_level or "mid"
    sources = ", ".join(plan["sources"])
    startup_focus = "yes — prioritize venture-backed Indian + global remote-first startups (Swiggy, Zomato, Razorpay, PhonePe, Flipkart, Zepto, CRED, Meesho, Paytm, Freshworks, Groww, Postman, BrowserStack, etc.)" if (body.startup_focus and plan["startup_priority"]) else "mix of established companies and startups"

    prompt = f"""Generate {to_fetch} realistic, high-quality job recommendations for this candidate.
Return JSON:
{{
  "jobs": [
    {{
      "role": "...",
      "company": "...",          // real company name; spell consistently
      "location": "Bengaluru | Mumbai | Hyderabad | Remote | etc",
      "remote_type": "remote" | "hybrid" | "office",
      "experience_level": "entry" | "mid" | "senior" | "staff",
      "salary": "e.g. ₹18 - 32 LPA",
      "match_pct": <0-100 integer; semantic match to resume>,
      "hiring_probability": <0-100 integer>,
      "matched_skills": ["..."],   // 3-6 skills the candidate already has
      "missing_skills": ["..."],   // 2-5 skills the JD wants but candidate is missing
      "skills_required": ["..."],  // 5-8 total
      "description": "one-line elevator pitch (max 140 chars)",
      "source": "linkedin" | "naukri" | "wellfound" | "indeed" | "internshala" | "ycombinator",
      "is_startup": true|false,
      "posted_label": "Just now | 2h ago | 1d ago | 3d ago"
    }}
  ]
}}

TARGET ROLE: {target_role}
EXPERIENCE: {exp}
LOCATION PREF: {body.location or "India / Remote"}
REMOTE FILTER: {remote_filter}
STARTUP FOCUS: {startup_focus}
ALLOWED SOURCES: {sources}

RESUME (truncated):
\"\"\"{resume_text[:4500] if resume_text else "No resume — infer from target role + experience."}\"\"\"

Rules:
- Vary companies; do not repeat the same company twice.
- match_pct must be in 60–95 range; spread realistically.
- For remote_filter='remote', only return remote roles. For 'hybrid' return hybrid. For 'office' return office. For 'any', mix.
- Use only the ALLOWED SOURCES list above for the 'source' field.
- At least 60% of jobs should be marked is_startup=true when STARTUP FOCUS is yes.
"""

    raw = await _ask(JOB_SYSTEM, prompt, "jobs")
    data = _extract_json(raw)
    raw_jobs = data.get("jobs", [])

    # Post-filter: if a strict remote_type is requested, drop jobs that ignore it
    if remote_filter in ("remote", "hybrid", "office"):
        raw_jobs = [j for j in raw_jobs if (j.get("remote_type") or "").lower() == remote_filter]

    if not raw_jobs:
        raise HTTPException(status_code=502, detail="AI couldn't generate jobs right now. Please retry.")

    # Persist + enrich
    saved_docs = []
    for j in raw_jobs[:to_fetch]:
        company = j.get("company") or "Unknown"
        role = j.get("role") or target_role
        loc = j.get("location") or (body.location or "India")
        source = (j.get("source") or "linkedin").lower()
        if source not in plan["sources"] and plan["sources"]:
            source = plan["sources"][0]
        alts = _alt_urls(role, company, loc)
        primary = alts.get(source) or alts["linkedin"]
        doc = Job(
            user_id=user["user_id"],
            role=role,
            company=company,
            company_domain=_company_domain(company),
            location=loc,
            remote_type=(j.get("remote_type") or "office").lower(),
            experience_level=(j.get("experience_level") or exp).lower(),
            salary=j.get("salary"),
            match_pct=int(j.get("match_pct", 70)),
            hiring_probability=int(j.get("hiring_probability", 60)),
            missing_skills=j.get("missing_skills", [])[:8],
            matched_skills=j.get("matched_skills", [])[:8],
            skills_required=j.get("skills_required", [])[:12],
            description=(j.get("description") or "")[:200],
            source=source,
            apply_url=primary,
            alt_urls=alts,
            is_startup=bool(j.get("is_startup", False)),
            posted_label=j.get("posted_label", "Just now"),
        ).model_dump()
        saved_docs.append(doc)

    if saved_docs:
        await jobs_col.insert_many(saved_docs)
    await _log_usage(user["user_id"], "job_discover")
    # Re-fetch with _id stripped
    out = await jobs_col.find(
        {"user_id": user["user_id"], "job_id": {"$in": [d["job_id"] for d in saved_docs]}},
        {"_id": 0},
    ).sort("match_pct", -1).to_list(len(saved_docs))
    return {
        "jobs": out,
        "remaining": max(0, cap - used_today - len(saved_docs)),
        "jobs_per_day": cap,
    }


@router.get("")
async def list_jobs(
    user: dict = Depends(get_current_user),
    saved_only: bool = False,
    remote_type: Optional[str] = None,
    is_startup: Optional[bool] = None,
    min_match: int = 0,
    limit: int = 60,
):
    flt = {"user_id": user["user_id"]}
    if saved_only: flt["saved"] = True
    if remote_type and remote_type != "any":
        flt["remote_type"] = remote_type
    if is_startup is not None:
        flt["is_startup"] = is_startup
    if min_match > 0:
        flt["match_pct"] = {"$gte": min_match}
    items = await jobs_col.find(flt, {"_id": 0}).sort("discovered_at", -1).to_list(limit)
    return items


@router.post("/{job_id}/save")
async def save_job(job_id: str, user: dict = Depends(get_current_user)):
    r = await jobs_col.update_one(
        {"job_id": job_id, "user_id": user["user_id"]},
        {"$set": {"saved": True}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "saved": True}


@router.post("/{job_id}/unsave")
async def unsave_job(job_id: str, user: dict = Depends(get_current_user)):
    r = await jobs_col.update_one(
        {"job_id": job_id, "user_id": user["user_id"]},
        {"$set": {"saved": False}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "saved": False}


@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    r = await jobs_col.delete_one({"job_id": job_id, "user_id": user["user_id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


@router.get("/stats")
async def job_stats(user: dict = Depends(get_current_user)):
    total = await jobs_col.count_documents({"user_id": user["user_id"]})
    saved = await jobs_col.count_documents({"user_id": user["user_id"], "saved": True})
    startup = await jobs_col.count_documents({"user_id": user["user_id"], "is_startup": True})
    remote = await jobs_col.count_documents({"user_id": user["user_id"], "remote_type": "remote"})
    # Avg match
    pipe = [
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": None, "avg": {"$avg": "$match_pct"}}},
    ]
    agg = await jobs_col.aggregate(pipe).to_list(1)
    avg = int(agg[0]["avg"]) if agg else 0
    return {"total": total, "saved": saved, "startup": startup, "remote": remote, "avg_match": avg}
