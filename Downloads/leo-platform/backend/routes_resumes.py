"""Resume CRUD + upload (PDF/DOCX/TXT parsing)."""
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from models import Resume, ResumeIn
from auth_utils import get_current_user
from db import resumes
from datetime import datetime, timezone
import PyPDF2
import docx

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _extract_text(filename: str, content: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = "\n".join((p.extract_text() or "") for p in reader.pages)
            return text.strip()
        except Exception:
            return ""
    if name.endswith(".docx"):
        try:
            d = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in d.paragraphs).strip()
        except Exception:
            return ""
    # plain text
    try:
        return content.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


@router.post("/upload", response_model=Resume)
async def upload_resume(
    file: UploadFile = File(...),
    name: str = Form(...),
    target_role: str = Form(""),
    user: dict = Depends(get_current_user),
):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    text = _extract_text(file.filename or "", raw)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file")
    # If this is the user's first resume, mark active; otherwise inactive
    has_active = await resumes.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
    res = Resume(
        user_id=user["user_id"], name=name, content=text,
        target_role=target_role or None,
        file_size_bytes=len(raw),
        is_active=not has_active,
    )
    await resumes.insert_one(res.model_dump())
    return res


@router.post("", response_model=Resume)
async def create_resume(body: ResumeIn, user: dict = Depends(get_current_user)):
    has_active = await resumes.find_one({"user_id": user["user_id"], "is_active": True}, {"_id": 0})
    res = Resume(
        user_id=user["user_id"], name=body.name, content=body.content,
        skills=body.skills, target_role=body.target_role,
        file_size_bytes=len(body.content.encode()),
        is_active=not has_active,
    )
    await resumes.insert_one(res.model_dump())
    return res


@router.get("", response_model=List[Resume])
async def list_resumes(user: dict = Depends(get_current_user)):
    items = await resumes.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Resume(**x) for x in items]


@router.get("/active", response_model=Resume)
async def active_resume(user: dict = Depends(get_current_user)):
    res = await resumes.find_one(
        {"user_id": user["user_id"], "is_active": True}, {"_id": 0}
    )
    if not res:
        # fallback to most recent
        res = await resumes.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    if not res:
        raise HTTPException(status_code=404, detail="No resume uploaded")
    return Resume(**res)


@router.get("/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    res = await resumes.find_one({"resume_id": resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    return Resume(**res)


@router.post("/{resume_id}/activate", response_model=Resume)
async def activate_resume(resume_id: str, user: dict = Depends(get_current_user)):
    res = await resumes.find_one({"resume_id": resume_id, "user_id": user["user_id"]}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found")
    await resumes.update_many({"user_id": user["user_id"]}, {"$set": {"is_active": False}})
    await resumes.update_one({"resume_id": resume_id}, {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc).isoformat()}})
    res["is_active"] = True
    return Resume(**res)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    r = await resumes.delete_one({"resume_id": resume_id, "user_id": user["user_id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"ok": True}
