"""Application tracker CRUD."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import Application, ApplicationIn
from auth_utils import get_current_user
from db import applications
from datetime import datetime, timezone

router = APIRouter(prefix="/api/tracker", tags=["tracker"])


@router.post("", response_model=Application)
async def create_app(body: ApplicationIn, user: dict = Depends(get_current_user)):
    app = Application(user_id=user["user_id"], **body.model_dump())
    await applications.insert_one(app.model_dump())
    return app


@router.get("", response_model=List[Application])
async def list_apps(user: dict = Depends(get_current_user)):
    items = await applications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("applied_at", -1).to_list(200)
    return [Application(**x) for x in items]


@router.patch("/{app_id}", response_model=Application)
async def update_app(app_id: str, body: ApplicationIn, user: dict = Depends(get_current_user)):
    upd = {**body.model_dump(exclude_none=True), "updated_at": datetime.now(timezone.utc).isoformat()}
    r = await applications.update_one(
        {"app_id": app_id, "user_id": user["user_id"]},
        {"$set": upd},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    doc = await applications.find_one({"app_id": app_id}, {"_id": 0})
    return Application(**doc)


@router.delete("/{app_id}")
async def delete_app(app_id: str, user: dict = Depends(get_current_user)):
    r = await applications.delete_one({"app_id": app_id, "user_id": user["user_id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"ok": True}


@router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    pipe = [
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    agg = await applications.aggregate(pipe).to_list(20)
    out = {x["_id"]: x["count"] for x in agg}
    total = sum(out.values())
    return {
        "total": total,
        "by_status": out,
        "interview_rate": round((out.get("interview", 0) + out.get("offer", 0)) / total * 100, 1) if total else 0.0,
    }
