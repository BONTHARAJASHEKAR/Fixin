"""Pydantic models for Leomote."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Users ----------
class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: str = "user"  # 'user' | 'admin' | 'super_admin'
    plan: str = "free"  # 'free' | 'basic' | 'premium' | 'hero'
    plan_expires_at: Optional[str] = None
    ats_scans_used: int = 0
    ai_rewrites_used: int = 0
    is_blocked: bool = False
    created_at: str = Field(default_factory=lambda: _now().isoformat())
    last_active_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: User


# ---------- Resumes ----------
class ResumeIn(BaseModel):
    name: str
    content: str  # raw text
    skills: List[str] = []
    target_role: Optional[str] = None


class Resume(BaseModel):
    model_config = ConfigDict(extra="ignore")
    resume_id: str = Field(default_factory=_uuid)
    user_id: str
    name: str
    content: str
    skills: List[str] = []
    target_role: Optional[str] = None
    file_size_bytes: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: _now().isoformat())
    updated_at: str = Field(default_factory=lambda: _now().isoformat())


# ---------- ATS ----------
class ATSRequest(BaseModel):
    resume_id: str
    job_description: str


class ATSReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    report_id: str = Field(default_factory=_uuid)
    user_id: str
    resume_id: str
    match_score: int
    ats_score: int
    keywords_present: List[str] = []
    keywords_missing: List[str] = []
    suggestions: List[Dict[str, Any]] = []
    job_description: str = ""
    created_at: str = Field(default_factory=lambda: _now().isoformat())


# ---------- AI ----------
class RewriteRequest(BaseModel):
    resume_id: str
    section: str = "all"
    target_role: Optional[str] = None
    instructions: Optional[str] = None


class JobMatchRequest(BaseModel):
    resume_id: str
    query: str = "software engineer"


class KeywordExtractRequest(BaseModel):
    text: str


class CareerInsightsRequest(BaseModel):
    resume_id: Optional[str] = None
    goals: Optional[str] = None


class InterviewQuestionsRequest(BaseModel):
    role: str
    level: str = "mid"
    company: Optional[str] = None


# ---------- Applications ----------
class ApplicationIn(BaseModel):
    company: str
    role: str
    status: str = "applied"  # applied|screening|interview|offer|rejected
    location: Optional[str] = None
    salary: Optional[str] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    resume_id: Optional[str] = None


class Application(BaseModel):
    model_config = ConfigDict(extra="ignore")
    app_id: str = Field(default_factory=_uuid)
    user_id: str
    company: str
    role: str
    status: str = "applied"
    location: Optional[str] = None
    salary: Optional[str] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    resume_id: Optional[str] = None
    applied_at: str = Field(default_factory=lambda: _now().isoformat())
    updated_at: str = Field(default_factory=lambda: _now().isoformat())


# ---------- Jobs ----------
class JobDiscoverRequest(BaseModel):
    role: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None  # remote|hybrid|office|any
    experience_level: Optional[str] = None  # entry|mid|senior|staff
    startup_focus: bool = True
    count: int = 12  # how many fresh recommendations to fetch (capped by quota)
    resume_id: Optional[str] = None


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: str = Field(default_factory=_uuid)
    user_id: str
    role: str
    company: str
    company_domain: Optional[str] = None  # e.g. razorpay.com — used for logo
    location: str = ""
    remote_type: str = "office"  # remote|hybrid|office
    experience_level: str = "mid"
    salary: Optional[str] = None
    match_pct: int = 70
    hiring_probability: int = 60
    missing_skills: List[str] = []
    matched_skills: List[str] = []
    skills_required: List[str] = []
    description: Optional[str] = None
    source: str = "linkedin"  # primary source
    apply_url: str = ""
    alt_urls: Dict[str, str] = {}  # {linkedin, naukri, wellfound, indeed, internshala}
    is_startup: bool = False
    posted_label: str = "Just now"
    saved: bool = False
    discovered_at: str = Field(default_factory=lambda: _now().isoformat())


# ---------- Payments / Subscriptions ----------
PLANS = {
    "free": {
        "name": "Free", "price_inr": 0,
        "ats_quota": 5, "ai_quota": 5, "jobs_per_day": 5,
        "sources": ["wellfound", "internshala"],
        "startup_priority": False, "ai_rewrite": False, "interview_prep": False,
        "linkedin_optimizer": False, "hiring_probability": False,
        "features": [
            "5 ATS scans / month",
            "5 AI suggestions / month",
            "5 job links / day",
            "Basic startup job feed",
            "Limited resume uploads",
            "Basic templates",
        ],
    },
    "basic": {
        "name": "Basic", "price_inr": 79,
        "ats_quota": 80, "ai_quota": 80, "jobs_per_day": 25,
        "sources": ["linkedin", "naukri", "wellfound", "internshala"],
        "startup_priority": True, "ai_rewrite": True, "interview_prep": False,
        "linkedin_optimizer": False, "hiring_probability": False,
        "features": [
            "ATS optimization",
            "Resume keyword suggestions",
            "Resume-job matching",
            "AI resume improvements",
            "25 job links / day",
            "Startup job recommendations",
            "LinkedIn + Naukri + Wellfound jobs",
            "Remote / hybrid filters",
            "Save jobs feature",
            "Basic ATS-friendly templates",
        ],
    },
    "premium": {
        "name": "Premium", "price_inr": 119,
        "ats_quota": 100000, "ai_quota": 500, "jobs_per_day": 75,
        "sources": ["linkedin", "naukri", "wellfound", "indeed", "internshala"],
        "startup_priority": True, "ai_rewrite": True, "interview_prep": True,
        "linkedin_optimizer": True, "hiring_probability": True,
        "features": [
            "Advanced ATS optimization",
            "AI resume rewriting",
            "AI career recommendations",
            "AI keyword optimization",
            "Unlimited ATS scans",
            "Startup-focused hiring feed",
            "75 job links / day",
            "Priority startup recommendations",
            "Remote + hybrid + office jobs",
            "Interview preparation",
            "Application tracking",
            "Advanced templates",
            "Hiring probability analysis",
        ],
    },
    "hero": {
        "name": "Hero", "price_inr": 199,
        "ats_quota": 100000, "ai_quota": 100000, "jobs_per_day": 100000,
        "sources": ["linkedin", "naukri", "wellfound", "indeed", "internshala", "ycombinator"],
        "startup_priority": True, "ai_rewrite": True, "interview_prep": True,
        "linkedin_optimizer": True, "hiring_probability": True,
        "features": [
            "Complete AI career optimization",
            "Premium AI resume rebuilding",
            "Advanced job matching engine",
            "Unlimited job links",
            "Startup priority jobs",
            "High-growth startup hiring feed",
            "AI recruiter-level optimization",
            "Unlimited ATS analysis",
            "Unlimited templates",
            "AI interview preparation",
            "Advanced career roadmap",
            "Application analytics",
            "Skill gap analysis",
            "Early-access startup opportunities",
            "Premium remote job access",
            "Priority AI processing",
        ],
    },
}


class CreateOrderRequest(BaseModel):
    plan: str  # basic|premium|hero


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str = Field(default_factory=_uuid)
    user_id: str
    plan: str
    amount_inr: int
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    status: str = "created"  # created|success|failed|refunded
    method: str = "razorpay"
    created_at: str = Field(default_factory=lambda: _now().isoformat())
