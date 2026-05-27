"""User dashboard summary endpoint."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from auth_utils import get_current_user
from db import resumes, ats_reports, applications, ai_usage, payments, client as mongo_client
from models import PLANS
import os

_db = mongo_client[os.environ["DB_NAME"]]
jobs_col = _db.jobs

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(user: dict = Depends(get_current_user)):
    from routes_settings import get_effective_plan
    resume_count = await resumes.count_documents({"user_id": user["user_id"]})
    recent_reports = await ats_reports.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    latest_ats = recent_reports[0]["ats_score"] if recent_reports else None
    apps = await applications.count_documents({"user_id": user["user_id"]})
    interviews = await applications.count_documents({"user_id": user["user_id"], "status": {"$in": ["interview", "offer"]}})
    ai_calls = await ai_usage.count_documents({"user_id": user["user_id"]})

    plan_info = await get_effective_plan(user.get("plan", "free"))
    today_iso = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    jobs_today = await jobs_col.count_documents({"user_id": user["user_id"], "discovered_at": {"$gte": today_iso}})
    jobs_saved = await jobs_col.count_documents({"user_id": user["user_id"], "saved": True})

    return {
        "plan": user.get("plan", "free"),
        "plan_name": plan_info["name"],
        "ats_quota": plan_info["ats_quota"],
        "ai_quota": plan_info["ai_quota"],
        "jobs_per_day": plan_info["jobs_per_day"],
        "ats_used": user.get("ats_scans_used", 0),
        "ai_used": user.get("ai_rewrites_used", 0),
        "jobs_today": jobs_today,
        "jobs_saved": jobs_saved,
        "resume_count": resume_count,
        "latest_ats_score": latest_ats,
        "apps_total": apps,
        "apps_interview_or_offer": interviews,
        "ai_calls": ai_calls,
        "recent_reports": recent_reports,
    }
