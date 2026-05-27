"""Leomote backend - FastAPI app."""
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

# Routers (imported after .env load)
from routes_auth import router as auth_router
from routes_resumes import router as resumes_router
from routes_ai import router as ai_router
from routes_payments import router as payments_router
from routes_tracker import router as tracker_router
from routes_admin import router as admin_router
from routes_dashboard import router as dashboard_router
from routes_jobs import router as jobs_router
from routes_settings import admin_router as settings_admin_router, public_router as settings_public_router

from db import users
from auth_utils import hash_password
from models import User

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("leomote")

app = FastAPI(title="Leomote API", version="1.0.0")

# Health/root
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"name": "Leomote API", "version": "1.0.0", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


app.include_router(api_router)
app.include_router(auth_router)
app.include_router(resumes_router)
app.include_router(ai_router)
app.include_router(payments_router)
app.include_router(tracker_router)
app.include_router(admin_router)
app.include_router(dashboard_router)
app.include_router(jobs_router)
app.include_router(settings_admin_router)
app.include_router(settings_public_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("startup")
async def seed_admin():
    """Seed the super-admin account from .env."""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@leomote.ai").lower()
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await users.find_one({"email": admin_email}, {"_id": 0})
    if existing:
        # Ensure role is super_admin
        if existing.get("role") != "super_admin":
            await users.update_one({"email": admin_email}, {"$set": {"role": "super_admin"}})
        logger.info("Admin already exists: %s", admin_email)
    else:
        admin = User(name="Leomote Admin", email=admin_email, role="super_admin", plan="hero")
        doc = admin.model_dump()
        doc["password_hash"] = hash_password(admin_pass)
        await users.insert_one(doc)
        logger.info("Seeded admin user: %s", admin_email)

    # Seed default reviews (only if empty)
    from routes_settings import reviews_col, Review
    if await reviews_col.count_documents({}) == 0:
        seed_reviews = [
            Review(author="Arjun Sharma", role="SDE-2", company="Zepto",
                   quote="Went from 0 callbacks to 7 interviews in 3 weeks. The ATS engine is unreal.",
                   rating=5, avatar_url=None),
            Review(author="Priya Menon", role="Frontend Engineer", company="Razorpay",
                   quote="AI rewrite turned my resume from a wall of text into a recruiter magnet.",
                   rating=5, avatar_url=None),
            Review(author="Karan Mehta", role="L4 Engineer", company="Meta",
                   quote="The interview prep section literally got me through my Meta loop.",
                   rating=5, avatar_url=None),
        ]
        await reviews_col.insert_many([r.model_dump() for r in seed_reviews])
        logger.info("Seeded default reviews")
