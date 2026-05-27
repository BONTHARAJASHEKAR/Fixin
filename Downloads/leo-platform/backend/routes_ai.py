"""ATS + AI endpoints: analyze, rewrite, keywords, job match, insights, interview, LinkedIn."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import (
    ATSRequest, ATSReport, RewriteRequest, KeywordExtractRequest,
    JobMatchRequest, CareerInsightsRequest, InterviewQuestionsRequest, PLANS
)
from auth_utils import get_current_user
from db import resumes, ats_reports, users
from ai_service import (
    analyze_resume_vs_jd, rewrite_resume, extract_keywords,
    match_jobs, career_insights, interview_questions, linkedin_optimize
)

router = APIRouter(prefix="/api", tags=["ai"])


async def _check_quota(user: dict, feature: str):
    from routes_settings import get_effective_plan
    plan = await get_effective_plan(user.get("plan", "free"))
    if feature == "ats":
        used = user.get("ats_scans_used", 0)
        quota = plan["ats_quota"]
        if used >= quota:
            raise HTTPException(status_code=402, detail=f"ATS quota exceeded ({used}/{quota}). Upgrade your plan.")
    elif feature == "ai":
        used = user.get("ai_rewrites_used", 0)
        quota = plan["ai_quota"]
        if used >= quota:
            raise HTTPException(status_code=402, detail=f"AI quota exceeded ({used}/{quota}). Upgrade your plan.")


async def _bump(user: dict, field: str):
    await users.update_one({"user_id": user["user_id"]}, {"$inc": {field: 1}})


@router.post("/ats/analyze", response_model=ATSReport)
async def ats_analyze(body: ATSRequest, user: dict = Depends(get_current_user)):
    await _check_quota(user, "ats")
    res = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await analyze_resume_vs_jd(user["user_id"], res["content"], body.job_description)
    report = ATSReport(
        user_id=user["user_id"], resume_id=body.resume_id,
        match_score=int(data.get("match_score", 60)),
        ats_score=int(data.get("ats_score", 70)),
        keywords_present=data.get("keywords_present", [])[:20],
        keywords_missing=data.get("keywords_missing", [])[:20],
        suggestions=data.get("suggestions", []),
        job_description=body.job_description[:5000],
    )
    await ats_reports.insert_one(report.model_dump())
    await _bump(user, "ats_scans_used")
    return report


@router.get("/ats/reports", response_model=List[ATSReport])
async def list_reports(user: dict = Depends(get_current_user)):
    items = await ats_reports.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [ATSReport(**x) for x in items]


@router.get("/ats/reports/{report_id}", response_model=ATSReport)
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    r = await ats_reports.find_one({"report_id": report_id, "user_id": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return ATSReport(**r)


@router.post("/ai/rewrite")
async def ai_rewrite(body: RewriteRequest, user: dict = Depends(get_current_user)):
    await _check_quota(user, "ai")
    res = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await rewrite_resume(user["user_id"], res["content"], body.target_role, body.instructions)
    await _bump(user, "ai_rewrites_used")
    return data


@router.post("/ai/keywords")
async def ai_keywords(body: KeywordExtractRequest, user: dict = Depends(get_current_user)):
    await _check_quota(user, "ai")
    data = await extract_keywords(user["user_id"], body.text)
    await _bump(user, "ai_rewrites_used")
    return data


@router.post("/ai/job-match")
async def ai_job_match(body: JobMatchRequest, user: dict = Depends(get_current_user)):
    await _check_quota(user, "ai")
    res = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await match_jobs(user["user_id"], res["content"], body.query)
    await _bump(user, "ai_rewrites_used")
    return data


@router.post("/ai/insights")
async def ai_insights(body: CareerInsightsRequest, user: dict = Depends(get_current_user)):
    await _check_quota(user, "ai")
    text = ""
    if body.resume_id:
        res = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
        if res:
            text = res["content"]
    data = await career_insights(user["user_id"], text, body.goals)
    await _bump(user, "ai_rewrites_used")
    return data


@router.post("/ai/interview")
async def ai_interview(body: InterviewQuestionsRequest, user: dict = Depends(get_current_user)):
    plan = user.get("plan", "free")
    if plan not in ("premium", "hero"):
        raise HTTPException(status_code=402, detail="Interview prep is available on Premium and Hero plans")
    data = await interview_questions(user["user_id"], body.role, body.level, body.company)
    return data


@router.post("/ai/linkedin")
async def ai_linkedin(body: JobMatchRequest, user: dict = Depends(get_current_user)):
    plan = user.get("plan", "free")
    if plan not in ("premium", "hero"):
        raise HTTPException(status_code=402, detail="LinkedIn optimizer is available on Premium and Hero plans")
    res = await resumes.find_one({"resume_id": body.resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await linkedin_optimize(user["user_id"], res["content"], body.query)
    return data
