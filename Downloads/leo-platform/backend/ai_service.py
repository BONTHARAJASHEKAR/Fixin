"""AI service backed by Emergent Universal Key (GPT-5.2)."""
import os
import json
import re
import uuid
from typing import Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
from db import ai_usage
from datetime import datetime, timezone

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL_PROVIDER = "openai"
MODEL_NAME = "gpt-5.2"


def _new_session_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _extract_json(text: str) -> Dict[str, Any]:
    """Best-effort: pull the first JSON object from an LLM response."""
    if not text:
        return {}
    text = text.strip()
    # Strip ```json fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text)
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}


async def _ask(system: str, user: str, session_prefix: str = "leomote") -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=_new_session_id(session_prefix),
            system_message=system,
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        msg = UserMessage(text=user)
        return await chat.send_message(msg)
    except Exception as e:
        # Surface a friendly error to the route layer
        from fastapi import HTTPException
        msg = str(e)
        if "budget" in msg.lower() or "exceeded" in msg.lower():
            raise HTTPException(status_code=503, detail="AI service budget exceeded. Please try again later or contact support.")
        raise HTTPException(status_code=503, detail=f"AI service temporarily unavailable: {msg[:160]}")


async def _log_usage(user_id: str, feature: str, tokens: int = 0):
    await ai_usage.insert_one({
        "user_id": user_id,
        "feature": feature,
        "tokens": tokens,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ----------- High-level features -----------
ATS_SYSTEM = (
    "You are an elite ATS (Applicant Tracking System) analysis engine. "
    "You always reply with STRICT, valid JSON only — no prose, no markdown."
)


async def analyze_resume_vs_jd(user_id: str, resume_text: str, job_description: str) -> Dict[str, Any]:
    prompt = f"""Analyze this resume against the job description and return JSON with these keys EXACTLY:
{{
  "match_score": <0-100 integer; semantic + keyword match>,
  "ats_score": <0-100 integer; how ATS-friendly the resume is>,
  "keywords_present": ["k1","k2", ...],  // up to 12 matching keywords from JD found in resume
  "keywords_missing": ["k1","k2", ...],  // up to 12 important keywords from JD missing in resume
  "suggestions": [
    {{"type":"add"|"rewrite"|"remove", "text":"actionable sentence"}}
  ]  // 5-8 suggestions
}}

RESUME:
\"\"\"{resume_text[:6000]}\"\"\"

JOB DESCRIPTION:
\"\"\"{job_description[:4000]}\"\"\"
"""
    raw = await _ask(ATS_SYSTEM, prompt, "ats")
    data = _extract_json(raw)
    if not data:
        data = {
            "match_score": 60, "ats_score": 70,
            "keywords_present": [], "keywords_missing": [],
            "suggestions": [{"type": "add", "text": "Add more measurable achievements with metrics."}],
        }
    await _log_usage(user_id, "ats_analyze")
    return data


REWRITE_SYSTEM = (
    "You are a world-class resume writer for tech roles. "
    "Rewrite content to be impactful, quantified, action-verb led, and ATS-friendly. "
    "Reply with STRICT JSON only."
)


async def rewrite_resume(user_id: str, resume_text: str, target_role: str | None, instructions: str | None) -> Dict[str, Any]:
    prompt = f"""Rewrite/improve the following resume content. Return JSON:
{{
  "rewritten": "the full improved resume text",
  "highlights": ["bullet 1", "bullet 2", ...]  // 3-5 key improvements you made
}}

Target role: {target_role or "general software engineer"}
Special instructions: {instructions or "none"}

RESUME:
\"\"\"{resume_text[:6000]}\"\"\"
"""
    raw = await _ask(REWRITE_SYSTEM, prompt, "rewrite")
    data = _extract_json(raw)
    if not data:
        data = {"rewritten": resume_text, "highlights": ["No changes generated. Please retry."]}
    await _log_usage(user_id, "ai_rewrite")
    return data


KEYWORD_SYSTEM = (
    "You extract the most important keywords from text for ATS optimization. "
    "Reply with strict JSON only."
)


async def extract_keywords(user_id: str, text: str) -> Dict[str, Any]:
    prompt = f"""Extract keywords from this text. Return JSON:
{{
  "keywords": ["k1","k2",...],   // 15-25 keywords, lowercase, no duplicates
  "categories": {{
    "skills": ["..."],
    "tools": ["..."],
    "soft_skills": ["..."]
  }}
}}

TEXT:
\"\"\"{text[:5000]}\"\"\"
"""
    raw = await _ask(KEYWORD_SYSTEM, prompt, "kw")
    data = _extract_json(raw)
    if not data:
        data = {"keywords": [], "categories": {"skills": [], "tools": [], "soft_skills": []}}
    await _log_usage(user_id, "keyword_extract")
    return data


JOB_MATCH_SYSTEM = (
    "You are a job-matching AI. Given a resume and a target role, generate plausible matching jobs "
    "from major Indian/global tech companies. Reply with strict JSON only."
)


async def match_jobs(user_id: str, resume_text: str, query: str) -> Dict[str, Any]:
    prompt = f"""Given the resume and target role "{query}", suggest 6 realistic matching jobs (different companies). Return JSON:
{{
  "jobs": [
    {{"role":"...","company":"...","location":"...","salary":"...","match_prob":<0-100>,"skills_match":["..."],"why":"short reason"}}
  ]
}}

RESUME:
\"\"\"{resume_text[:4500]}\"\"\"
"""
    raw = await _ask(JOB_MATCH_SYSTEM, prompt, "match")
    data = _extract_json(raw)
    if not data or "jobs" not in data:
        data = {"jobs": []}
    await _log_usage(user_id, "job_match")
    return data


INSIGHTS_SYSTEM = (
    "You are a senior tech career coach. Provide concrete, prioritized, India-aware career insights. "
    "Reply with strict JSON only."
)


async def career_insights(user_id: str, resume_text: str, goals: str | None) -> Dict[str, Any]:
    prompt = f"""Provide career insights based on the resume and goals. Return JSON:
{{
  "summary": "2-3 sentence overview of where the candidate stands",
  "strengths": ["..."],   // 3-5
  "gaps": ["..."],        // 3-5
  "next_steps": [
    {{"priority":"high"|"medium"|"low","action":"..."}}
  ],  // 5-7
  "recommended_roles": ["role 1","role 2","role 3"],
  "salary_estimate_inr": "min - max LPA"
}}

GOALS: {goals or "career growth"}
RESUME:
\"\"\"{resume_text[:4500]}\"\"\"
"""
    raw = await _ask(INSIGHTS_SYSTEM, prompt, "insight")
    data = _extract_json(raw)
    if not data:
        data = {
            "summary": "Profile shows strong foundations.",
            "strengths": [], "gaps": [], "next_steps": [],
            "recommended_roles": [], "salary_estimate_inr": "10 - 25 LPA",
        }
    await _log_usage(user_id, "career_insights")
    return data


INTERVIEW_SYSTEM = (
    "You are a tech interviewer designing realistic interview questions. Reply with strict JSON only."
)


async def interview_questions(user_id: str, role: str, level: str, company: str | None) -> Dict[str, Any]:
    prompt = f"""Create realistic interview questions for {level} {role} at {company or 'a top tech company'}. Return JSON:
{{
  "questions": [
    {{"category":"technical"|"behavioral"|"system_design"|"coding","question":"...","tips":"short tip"}}
  ]  // exactly 8 questions, mixed categories
}}
"""
    raw = await _ask(INTERVIEW_SYSTEM, prompt, "iv")
    data = _extract_json(raw)
    if not data or "questions" not in data:
        data = {"questions": []}
    await _log_usage(user_id, "interview_prep")
    return data


LINKEDIN_SYSTEM = (
    "You optimize LinkedIn profiles for tech professionals. Reply with strict JSON only."
)


async def linkedin_optimize(user_id: str, resume_text: str, target_role: str | None) -> Dict[str, Any]:
    prompt = f"""Generate optimized LinkedIn content. Return JSON:
{{
  "headline": "max 220 chars",
  "about": "300-500 word about section",
  "skills_to_add": ["skill1", ...],  // 10
  "tips": ["..."]  // 5 actionable tips
}}

Target role: {target_role or "Software Engineer"}
RESUME:
\"\"\"{resume_text[:4500]}\"\"\"
"""
    raw = await _ask(LINKEDIN_SYSTEM, prompt, "li")
    data = _extract_json(raw)
    if not data:
        data = {"headline": "", "about": "", "skills_to_add": [], "tips": []}
    await _log_usage(user_id, "linkedin_optimize")
    return data
