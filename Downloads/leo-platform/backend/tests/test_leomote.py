"""End-to-end backend tests for Leomote APIs."""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ADMIN_EMAIL = "admin@leomote.ai"
ADMIN_PASS = "Admin@2026"

SAMPLE_RESUME = (
    "John Doe\nSoftware Engineer with 5 years of experience in Python, FastAPI, React, MongoDB.\n"
    "Built scalable APIs and deployed on AWS. Skilled in Docker, Kubernetes, CI/CD, and PostgreSQL."
)
SAMPLE_JD = (
    "We are hiring a Senior Backend Engineer skilled in Python, FastAPI, MongoDB, AWS, Docker, "
    "Kubernetes, system design, and microservices. CI/CD and observability are a plus."
)


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def user_creds():
    suf = uuid.uuid4().hex[:8]
    return {"name": f"Test User {suf}", "email": f"TEST_{suf}@example.com", "password": "Passw0rd!"}


@pytest.fixture(scope="session")
def user_token(s, user_creds):
    r = s.post(f"{BASE_URL}/api/auth/signup", json=user_creds, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["user"]["email"] == user_creds["email"].lower()
    return data["token"]


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] in ("admin", "super_admin")
    return data["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_health(s):
    r = s.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
def test_login_and_me(s, user_creds, user_token):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": user_creds["email"], "password": user_creds["password"]})
    assert r.status_code == 200
    me = s.get(f"{BASE_URL}/api/auth/me", headers=_h(user_token))
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == user_creds["email"].lower()
    assert body["plan"] == "free"


def test_admin_login_role(admin_token, s):
    r = s.get(f"{BASE_URL}/api/auth/me", headers=_h(admin_token))
    assert r.status_code == 200
    assert r.json()["role"] == "super_admin"


# ---------- Resumes ----------
@pytest.fixture(scope="session")
def resume_id(s, user_token):
    r = s.post(f"{BASE_URL}/api/resumes",
               json={"name": "TEST_Resume", "content": SAMPLE_RESUME,
                     "skills": ["python", "fastapi"], "target_role": "Backend Engineer"},
               headers=_h(user_token))
    assert r.status_code == 200, r.text
    rid = r.json()["resume_id"]
    return rid


def test_resume_list_and_active(s, user_token, resume_id):
    r = s.get(f"{BASE_URL}/api/resumes", headers=_h(user_token))
    assert r.status_code == 200
    assert any(x["resume_id"] == resume_id for x in r.json())
    act = s.post(f"{BASE_URL}/api/resumes/{resume_id}/activate", headers=_h(user_token))
    assert act.status_code == 200
    a = s.get(f"{BASE_URL}/api/resumes/active", headers=_h(user_token))
    assert a.status_code == 200
    assert a.json()["resume_id"] == resume_id


# ---------- ATS ----------
def test_ats_analyze(s, user_token, resume_id):
    r = s.post(f"{BASE_URL}/api/ats/analyze",
               json={"resume_id": resume_id, "job_description": SAMPLE_JD},
               headers=_h(user_token), timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    for f in ("match_score", "ats_score", "keywords_present", "keywords_missing", "suggestions"):
        assert f in data
    assert 0 <= data["match_score"] <= 100
    me = s.get(f"{BASE_URL}/api/auth/me", headers=_h(user_token)).json()
    assert me["ats_scans_used"] >= 1


# ---------- AI endpoints ----------
def test_ai_keywords(s, user_token):
    r = s.post(f"{BASE_URL}/api/ai/keywords",
               json={"text": SAMPLE_JD}, headers=_h(user_token), timeout=120)
    assert r.status_code == 200, r.text


def test_ai_rewrite(s, user_token, resume_id):
    r = s.post(f"{BASE_URL}/api/ai/rewrite",
               json={"resume_id": resume_id, "target_role": "Backend Engineer"},
               headers=_h(user_token), timeout=120)
    # Could be 402 if quota exceeded after multiple ai calls; free quota = 3
    assert r.status_code in (200, 402), r.text


def test_ai_interview_blocked_for_free(s, user_token):
    r = s.post(f"{BASE_URL}/api/ai/interview",
               json={"role": "Backend Engineer", "level": "mid"},
               headers=_h(user_token), timeout=60)
    assert r.status_code == 402


def test_ai_linkedin_blocked_for_free(s, user_token, resume_id):
    r = s.post(f"{BASE_URL}/api/ai/linkedin",
               json={"resume_id": resume_id, "query": "backend engineer"},
               headers=_h(user_token), timeout=60)
    assert r.status_code == 402


# ---------- Payments ----------
def test_plans(s):
    r = s.get(f"{BASE_URL}/api/payments/plans")
    assert r.status_code == 200
    plans = r.json()
    ids = {p["id"] for p in plans}
    assert {"free", "basic", "premium", "hero"}.issubset(ids)


def test_payment_mock_flow(s, user_token):
    r = s.post(f"{BASE_URL}/api/payments/create-order",
               json={"plan": "premium"}, headers=_h(user_token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["mock"] is True
    order_id = data["order_id"]
    v = s.post(f"{BASE_URL}/api/payments/verify",
               json={"razorpay_order_id": order_id,
                     "razorpay_payment_id": f"pay_mock_{int(time.time())}",
                     "razorpay_signature": "mock_sig",
                     "plan": "premium"}, headers=_h(user_token))
    assert v.status_code == 200, v.text
    assert v.json()["user"]["plan"] == "premium"

    h = s.get(f"{BASE_URL}/api/payments/history", headers=_h(user_token))
    assert h.status_code == 200
    assert len(h.json()) >= 1


def test_ai_interview_after_premium(s, user_token):
    # User is now premium after payment verify -> interview should work
    r = s.post(f"{BASE_URL}/api/ai/interview",
               json={"role": "Backend Engineer", "level": "mid"},
               headers=_h(user_token), timeout=120)
    assert r.status_code == 200, r.text


# ---------- Tracker ----------
def test_tracker_crud_and_stats(s, user_token):
    r = s.post(f"{BASE_URL}/api/tracker",
               json={"company": "TEST_Acme", "role": "Engineer", "status": "applied"},
               headers=_h(user_token))
    assert r.status_code == 200, r.text
    app_id = r.json()["app_id"]

    g = s.get(f"{BASE_URL}/api/tracker", headers=_h(user_token))
    assert g.status_code == 200 and any(a["app_id"] == app_id for a in g.json())

    u = s.patch(f"{BASE_URL}/api/tracker/{app_id}",
                json={"company": "TEST_Acme", "role": "Engineer", "status": "interview"},
                headers=_h(user_token))
    assert u.status_code == 200
    assert u.json()["status"] == "interview"

    st = s.get(f"{BASE_URL}/api/tracker/stats", headers=_h(user_token))
    assert st.status_code == 200
    assert "interview_rate" in st.json()

    d = s.delete(f"{BASE_URL}/api/tracker/{app_id}", headers=_h(user_token))
    assert d.status_code == 200


# ---------- Dashboard ----------
def test_dashboard_summary(s, user_token):
    r = s.get(f"{BASE_URL}/api/dashboard/summary", headers=_h(user_token))
    assert r.status_code == 200
    data = r.json()
    # Dashboard returns flattened quotas (ats_quota/ai_quota/ats_used/ai_used) instead of nested "quotas" object
    assert "plan" in data and "recent_reports" in data
    for k in ("ats_quota", "ai_quota", "ats_used", "ai_used"):
        assert k in data


# ---------- Admin ----------
def test_admin_endpoints(s, admin_token):
    for path in ("/api/admin/overview", "/api/admin/users", "/api/admin/payments",
                 "/api/admin/ats-analytics", "/api/admin/activity",
                 "/api/admin/system", "/api/admin/notifications"):
        r = s.get(f"{BASE_URL}{path}", headers=_h(admin_token))
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text}"
    ov = s.get(f"{BASE_URL}/api/admin/overview", headers=_h(admin_token)).json()
    for f in ("total_users", "mrr_inr", "plan_breakdown", "months", "user_growth"):
        assert f in ov


def test_admin_routes_forbid_regular(s, user_token):
    r = s.get(f"{BASE_URL}/api/admin/overview", headers=_h(user_token))
    assert r.status_code == 403


def test_admin_block_unblock_flow(s, admin_token, user_creds):
    users = s.get(f"{BASE_URL}/api/admin/users", headers=_h(admin_token)).json()
    target = next((u for u in users if u["email"] == user_creds["email"].lower()), None)
    assert target, "Test user not found in admin users list"
    uid = target["user_id"]
    b = s.post(f"{BASE_URL}/api/admin/users/{uid}/block", headers=_h(admin_token))
    assert b.status_code == 200

    # Login again to fetch a fresh token, then check /me returns 403
    lr = s.post(f"{BASE_URL}/api/auth/login",
                json={"email": user_creds["email"], "password": user_creds["password"]})
    # login itself should be blocked (403)
    assert lr.status_code == 403, lr.text

    ub = s.post(f"{BASE_URL}/api/admin/users/{uid}/unblock", headers=_h(admin_token))
    assert ub.status_code == 200
    lr2 = s.post(f"{BASE_URL}/api/auth/login",
                 json={"email": user_creds["email"], "password": user_creds["password"]})
    assert lr2.status_code == 200
