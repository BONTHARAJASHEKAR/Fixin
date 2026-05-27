"""Dynamic plans, reviews, and site content service.

PLANS in models.py remains the immutable default. Admins can override any field per plan
via /api/admin/plans/{plan_id}. Effective plans are computed by merging defaults with overrides.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from db import client as mongo_client
from auth_utils import get_admin_user
from models import PLANS

_db = mongo_client[os.environ["DB_NAME"]]
plan_overrides = _db.plan_overrides
reviews_col = _db.reviews
site_content = _db.site_content


# ---------- Models ----------
class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price_inr: Optional[int] = None
    ats_quota: Optional[int] = None
    ai_quota: Optional[int] = None
    jobs_per_day: Optional[int] = None
    sources: Optional[List[str]] = None
    startup_priority: Optional[bool] = None
    ai_rewrite: Optional[bool] = None
    interview_prep: Optional[bool] = None
    linkedin_optimizer: Optional[bool] = None
    hiring_probability: Optional[bool] = None
    features: Optional[List[str]] = None


class ReviewIn(BaseModel):
    author: str
    role: str = ""
    company: str = ""
    quote: str
    rating: int = 5
    featured: bool = True
    avatar_url: Optional[str] = None


class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author: str
    role: str = ""
    company: str = ""
    quote: str
    rating: int = 5
    featured: bool = True
    avatar_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


DEFAULT_CONTENT = {
    "hero_badge": "✦ Powered by GPT-5.2 · Trusted by 19,000+ professionals",
    "hero_title_line1": "Beat the bots.",
    "hero_title_line2": "Land the offer.",
    "hero_subtitle": "Leomote is the AI co-pilot for your career. Beat ATS systems, rewrite resumes that recruiters actually read, and get matched to roles in your range — all in one platform.",
    "hero_cta": "Start free — no card needed",
    "footer_tagline": "© 2026 Leomote · Made with care for job seekers in India and beyond.",
    "stat_1_label": "Avg ATS lift",
    "stat_1_value": "+18.4 pts",
    "stat_2_label": "Interview rate",
    "stat_2_value": "31.4%",
    "stat_3_label": "Resumes optimized",
    "stat_3_value": "847K+",
    "stat_4_label": "Hiring success",
    "stat_4_value": "73%",
}


# ---------- Helpers ----------
async def get_effective_plans() -> Dict[str, Dict[str, Any]]:
    """Merge defaults + DB overrides. Returns dict keyed by plan_id."""
    overrides = {}
    async for o in plan_overrides.find({}, {"_id": 0}):
        pid = o.get("plan_id")
        if pid in PLANS:
            overrides[pid] = {k: v for k, v in o.get("data", {}).items() if v is not None}
    return {pid: {**defaults, **overrides.get(pid, {})} for pid, defaults in PLANS.items()}


async def get_effective_plan(plan_id: str) -> Dict[str, Any]:
    plans = await get_effective_plans()
    return plans.get(plan_id, PLANS.get(plan_id, PLANS["free"]))


# ---------- Admin Routers ----------
admin_router = APIRouter(prefix="/api/admin", tags=["admin-management"])
public_router = APIRouter(prefix="/api", tags=["public-content"])


@admin_router.get("/plans")
async def admin_list_plans(admin: dict = Depends(get_admin_user)):
    plans = await get_effective_plans()
    return [{"id": k, **v} for k, v in plans.items()]


@admin_router.put("/plans/{plan_id}")
async def admin_update_plan(plan_id: str, body: PlanUpdate, admin: dict = Depends(get_admin_user)):
    if plan_id not in PLANS:
        raise HTTPException(status_code=404, detail="Unknown plan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await plan_overrides.update_one(
        {"plan_id": plan_id},
        {"$set": {"data": update, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["user_id"]}},
        upsert=True,
    )
    merged = await get_effective_plan(plan_id)
    return {"id": plan_id, **merged}


@admin_router.delete("/plans/{plan_id}/overrides")
async def admin_reset_plan(plan_id: str, admin: dict = Depends(get_admin_user)):
    if plan_id not in PLANS:
        raise HTTPException(status_code=404, detail="Unknown plan")
    await plan_overrides.delete_one({"plan_id": plan_id})
    return {"ok": True, "plan": {"id": plan_id, **PLANS[plan_id]}}


# ---------- Reviews ----------
@admin_router.get("/reviews")
async def admin_list_reviews(admin: dict = Depends(get_admin_user)):
    items = await reviews_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@admin_router.post("/reviews", response_model=Review)
async def admin_create_review(body: ReviewIn, admin: dict = Depends(get_admin_user)):
    r = Review(**body.model_dump())
    await reviews_col.insert_one(r.model_dump())
    return r


@admin_router.put("/reviews/{review_id}", response_model=Review)
async def admin_update_review(review_id: str, body: ReviewIn, admin: dict = Depends(get_admin_user)):
    r = await reviews_col.find_one({"review_id": review_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    upd = body.model_dump()
    await reviews_col.update_one({"review_id": review_id}, {"$set": upd})
    r.update(upd)
    return Review(**r)


@admin_router.delete("/reviews/{review_id}")
async def admin_delete_review(review_id: str, admin: dict = Depends(get_admin_user)):
    r = await reviews_col.delete_one({"review_id": review_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"ok": True}


@public_router.get("/reviews")
async def public_reviews():
    """Featured reviews shown on the landing page."""
    items = await reviews_col.find({"featured": True}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return items


# ---------- Site content ----------
@admin_router.get("/content")
async def admin_get_content(admin: dict = Depends(get_admin_user)):
    doc = await site_content.find_one({"_key": "landing"}, {"_id": 0}) or {}
    data = {**DEFAULT_CONTENT, **doc.get("data", {})}
    return data


@admin_router.put("/content")
async def admin_update_content(body: Dict[str, str], admin: dict = Depends(get_admin_user)):
    # Whitelist keys
    allowed = {k: v for k, v in body.items() if k in DEFAULT_CONTENT and isinstance(v, str)}
    if not allowed:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await site_content.update_one(
        {"_key": "landing"},
        {"$set": {"data": allowed, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["user_id"]}},
        upsert=True,
    )
    doc = await site_content.find_one({"_key": "landing"}, {"_id": 0}) or {}
    return {**DEFAULT_CONTENT, **doc.get("data", {})}


@public_router.get("/content")
async def public_content():
    doc = await site_content.find_one({"_key": "landing"}, {"_id": 0}) or {}
    return {**DEFAULT_CONTENT, **doc.get("data", {})}


# ---------- Conversion analytics ----------
@admin_router.get("/conversion")
async def conversion_analytics(admin: dict = Depends(get_admin_user)):
    from db import users as users_col, ats_reports, ai_usage
    import os as _os
    _db_ = mongo_client[_os.environ["DB_NAME"]]
    jobs_col = _db_.jobs

    total_users = await users_col.count_documents({})
    paid_users = await users_col.count_documents({"plan": {"$ne": "free"}})
    free_users = total_users - paid_users

    # Used free ATS = unique users with at least 1 ats_report
    user_ids_with_ats = await ats_reports.distinct("user_id")
    used_free_ats = len(user_ids_with_ats)
    user_ids_with_jobs = await jobs_col.distinct("user_id")
    used_jobs = len(user_ids_with_jobs)

    # Users who upgraded AFTER first ats scan (heuristic: paid plan + has any ats report)
    paid_with_ats = await users_col.count_documents({"plan": {"$ne": "free"}, "user_id": {"$in": user_ids_with_ats}})

    free_to_paid_pct = round((paid_users / total_users) * 100, 2) if total_users else 0
    upgrade_after_ats_pct = round((paid_with_ats / used_free_ats) * 100, 2) if used_free_ats else 0

    plan_counts_pipe = [{"$group": {"_id": "$plan", "count": {"$sum": 1}}}]
    plan_counts = await users_col.aggregate(plan_counts_pipe).to_list(20)
    most_popular = max(plan_counts, key=lambda x: x["count"], default={"_id": "—", "count": 0})

    return {
        "total_users": total_users,
        "free_users": free_users,
        "paid_users": paid_users,
        "used_free_ats": used_free_ats,
        "used_jobs": used_jobs,
        "paid_with_ats": paid_with_ats,
        "free_to_paid_pct": free_to_paid_pct,
        "upgrade_after_ats_pct": upgrade_after_ats_pct,
        "most_popular_plan": most_popular["_id"],
        "plan_counts": [{"plan": p["_id"], "count": p["count"]} for p in plan_counts],
    }


# ---------- Jobs analytics for admin ----------
@admin_router.get("/jobs-analytics")
async def jobs_analytics(admin: dict = Depends(get_admin_user)):
    import os as _os
    _db_ = mongo_client[_os.environ["DB_NAME"]]
    jobs_col = _db_.jobs

    total = await jobs_col.count_documents({})
    saved = await jobs_col.count_documents({"saved": True})
    startup = await jobs_col.count_documents({"is_startup": True})
    remote = await jobs_col.count_documents({"remote_type": "remote"})

    # Top searched skills (using matched_skills as proxy)
    pipe = [
        {"$unwind": "$matched_skills"},
        {"$group": {"_id": {"$toLower": "$matched_skills"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    skills = await jobs_col.aggregate(pipe).to_list(10)

    # Top companies
    pipe2 = [
        {"$group": {"_id": "$company", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    companies = await jobs_col.aggregate(pipe2).to_list(10)

    # Per-source breakdown
    pipe3 = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}]
    sources = await jobs_col.aggregate(pipe3).to_list(10)

    return {
        "total_jobs_viewed": total,
        "total_jobs_saved": saved,
        "startup_jobs": startup,
        "remote_jobs": remote,
        "top_skills": [{"skill": s["_id"], "count": s["count"]} for s in skills],
        "top_companies": [{"company": c["_id"], "count": c["count"]} for c in companies],
        "source_breakdown": [{"source": s["_id"], "count": s["count"]} for s in sources],
    }
