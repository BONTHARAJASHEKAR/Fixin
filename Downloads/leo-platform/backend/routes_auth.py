"""Authentication routes: JWT signup/login + Emergent Google OAuth session exchange."""
import os
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from models import SignupBody, LoginBody, AuthResponse, User
from auth_utils import (
    hash_password, verify_password, make_jwt, get_current_user
)
from db import users, sessions

router = APIRouter(prefix="/api/auth", tags=["auth"])
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupBody):
    existing = await users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=body.name.strip(), email=body.email.lower(), role="user", plan="free")
    doc = user.model_dump()
    doc["password_hash"] = hash_password(body.password)
    await users.insert_one(doc)
    token = make_jwt(user.user_id, user.role)
    return AuthResponse(token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginBody):
    doc = await users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not doc or not doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if doc.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")
    token = make_jwt(doc["user_id"], doc.get("role", "user"))
    doc.pop("password_hash", None)
    return AuthResponse(token=token, user=User(**doc))


@router.get("/me", response_model=User)
async def me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return User(**user)


@router.post("/logout")
async def logout(response: Response, request: Request):
    cookie_token = request.cookies.get("session_token")
    if cookie_token:
        await sessions.delete_one({"session_token": cookie_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Emergent Google OAuth session exchange ----------
@router.get("/session")
async def google_session(request: Request, response: Response):
    """Exchange the session_id received in URL fragment for a session_token.
    Frontend should POST/GET this with X-Session-ID header.
    """
    session_id = request.headers.get("x-session-id") or request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")

    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")

    data = r.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    # Upsert user
    user = await users.find_one({"email": email}, {"_id": 0})
    if user:
        await users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": name, "picture": picture,
                      "last_active_at": datetime.now(timezone.utc).isoformat()}},
        )
        user = await users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    else:
        new_user = User(name=name, email=email, picture=picture, role="user", plan="free")
        await users.insert_one(new_user.model_dump())
        user = await users.find_one({"user_id": new_user.user_id}, {"_id": 0})

    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")

    # Store session in DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    user.pop("password_hash", None)
    # Also issue a JWT so the SPA can store it in localStorage as a fallback
    token = make_jwt(user["user_id"], user.get("role", "user"))
    return {"token": token, "user": user, "session_token": session_token}
