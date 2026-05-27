"""Auth utilities: password hashing, JWT, current-user dependency."""
import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Request, status
from db import users, sessions

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXP_DAYS = 7


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str, role: str = "user") -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _user_from_session_token(token: str) -> Optional[dict]:
    """Look up an Emergent Google OAuth session_token."""
    sess = await sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


async def get_current_user(request: Request) -> dict:
    """Resolve current user from either:
    - Authorization: Bearer <jwt> header (email/password login)
    - Authorization: Bearer <session_token> (Google OAuth)
    - session_token httpOnly cookie (Google OAuth)
    """
    token: Optional[str] = None
    auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_hdr and auth_hdr.lower().startswith("bearer "):
        token = auth_hdr.split(" ", 1)[1].strip()
    if not token:
        token = request.cookies.get("session_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if user_id:
            user = await users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                if user.get("is_blocked"):
                    raise HTTPException(status_code=403, detail="Account blocked")
                return user
    except jwt.PyJWTError:
        pass

    # Fall back to OAuth session token
    user = await _user_from_session_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")
    return user


async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
