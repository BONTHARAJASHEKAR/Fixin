"""Tests for new Job Discovery + Pricing tier changes.

Covers:
- New PLANS prices/jobs_per_day/sources via /api/payments/plans
- /api/jobs/usage and /api/jobs/discover
- Job listing, filters, save/unsave, delete
- Daily quota enforcement (402)
- Dashboard summary includes jobs_per_day / jobs_today / jobs_saved
- Auth enforcement on /api/jobs/discover
"""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ADMIN_EMAIL = "admin@leomote.ai"
ADMIN_PASS = "Admin@2026"

EXPECTED_PRICES = {"free": 0, "basic": 79, "premium": 119, "hero": 199}
EXPECTED_JOBS_PER_DAY = {"free": 5, "basic": 25, "premium": 75, "hero": 100000}
ALL_KNOWN_SOURCES = {"linkedin", "naukri", "wellfound", "indeed", "internshala", "ycombinator"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def fresh_user(s):
    """Fresh free-plan user for quota testing."""
    suf = uuid.uuid4().hex[:8]
    creds = {"name": f"Quota User {suf}", "email": f"TEST_quota_{suf}@example.com", "password": "Passw0rd!"}
    r = s.post(f"{BASE_URL}/api/auth/signup", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "user": r.json()["user"], "creds": creds}


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Pricing / Plans ----------
def test_plans_new_prices_and_quotas(s):
    r = s.get(f"{BASE_URL}/api/payments/plans")
    assert r.status_code == 200
    plans = {p["id"]: p for p in r.json()}
    assert set(plans.keys()) >= {"free", "basic", "premium", "hero"}
    for pid, price in EXPECTED_PRICES.items():
        assert plans[pid]["price_inr"] == price, f"{pid} price mismatch -> {plans[pid]['price_inr']}"
        assert plans[pid]["jobs_per_day"] == EXPECTED_JOBS_PER_DAY[pid], (
            f"{pid} jobs_per_day mismatch -> {plans[pid]['jobs_per_day']}"
        )
        assert isinstance(plans[pid].get("sources"), list) and len(plans[pid]["sources"]) > 0
        for src in plans[pid]["sources"]:
            assert src in ALL_KNOWN_SOURCES


# ---------- /api/jobs/usage ----------
def test_jobs_usage_free_user(s, fresh_user):
    r = s.get(f"{BASE_URL}/api/jobs/usage", headers=_h(fresh_user["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("plan", "jobs_per_day", "jobs_used_today", "remaining", "unlimited", "sources"):
        assert k in d, f"missing field {k}"
    assert d["plan"] == "free"
    assert d["jobs_per_day"] == 5
    assert d["jobs_used_today"] == 0
    assert d["remaining"] == 5
    assert d["unlimited"] is False
    assert isinstance(d["sources"], list) and len(d["sources"]) > 0


# ---------- /api/jobs/discover auth ----------
def test_discover_requires_auth(s):
    r = s.post(f"{BASE_URL}/api/jobs/discover", json={"role": "Engineer", "count": 3})
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


# ---------- Discover + quota enforcement ----------
@pytest.fixture(scope="module")
def first_discover(s, fresh_user):
    """Trigger discover with count=10 — should cap at 5 due to free quota."""
    body = {
        "role": "Backend Engineer",
        "location": "Bengaluru",
        "remote_type": "any",
        "experience_level": "mid",
        "startup_focus": True,
        "count": 10,
    }
    r = s.post(f"{BASE_URL}/api/jobs/discover", json=body, headers=_h(fresh_user["token"]), timeout=180)
    return r


def test_discover_shapes_and_cap(s, fresh_user, first_discover):
    r = first_discover
    if r.status_code == 502:
        pytest.skip(f"AI temporarily unavailable: {r.text}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "jobs" in data and isinstance(data["jobs"], list)
    jobs = data["jobs"]
    # Free plan cap is 5 → can never exceed 5
    assert 1 <= len(jobs) <= 5, f"expected ≤5 jobs (free cap), got {len(jobs)}"
    # Get usage plan sources to validate
    usage = s.get(f"{BASE_URL}/api/jobs/usage", headers=_h(fresh_user["token"])).json()
    allowed_sources = set(usage["sources"])
    for j in jobs:
        for k in ("job_id", "role", "company", "company_domain", "location", "remote_type",
                  "experience_level", "match_pct", "hiring_probability", "matched_skills",
                  "missing_skills", "source", "apply_url", "alt_urls", "is_startup", "posted_label"):
            assert k in j, f"job missing field {k}"
        assert j["source"] in allowed_sources, f"source {j['source']} not in plan sources {allowed_sources}"
        assert j["apply_url"].startswith("http"), j["apply_url"]
        assert any(host in j["apply_url"] for host in
                   ("linkedin.com", "naukri.com", "wellfound.com", "indeed.com", "internshala.com")), j["apply_url"]
        assert isinstance(j["alt_urls"], dict) and len(j["alt_urls"]) >= 3


def test_discover_quota_402_on_second_call(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed — skipping quota follow-up")
    assert first_discover.status_code == 200
    # second call should be capped at 0 remaining → 402
    r = s.post(
        f"{BASE_URL}/api/jobs/discover",
        json={"role": "Engineer", "count": 10, "remote_type": "any", "experience_level": "mid"},
        headers=_h(fresh_user["token"]),
        timeout=60,
    )
    assert r.status_code == 402, f"expected 402 quota error, got {r.status_code}: {r.text}"
    detail = (r.json().get("detail") or "").lower()
    assert "limit" in detail or "quota" in detail or "upgrade" in detail


# ---------- /api/jobs listing + filters ----------
def test_jobs_list_returns_persisted(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed")
    r = s.get(f"{BASE_URL}/api/jobs", headers=_h(fresh_user["token"]))
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    # no _id leaks
    assert all("_id" not in it for it in items)


def test_jobs_stats(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed")
    r = s.get(f"{BASE_URL}/api/jobs/stats", headers=_h(fresh_user["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("total", "saved", "startup", "remote", "avg_match"):
        assert k in d
    assert d["total"] >= 1
    assert 0 <= d["avg_match"] <= 100


def test_save_and_unsave_and_filter(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed")
    listed = s.get(f"{BASE_URL}/api/jobs", headers=_h(fresh_user["token"])).json()
    job_id = listed[0]["job_id"]
    sv = s.post(f"{BASE_URL}/api/jobs/{job_id}/save", headers=_h(fresh_user["token"]))
    assert sv.status_code == 200 and sv.json()["saved"] is True

    saved_only = s.get(f"{BASE_URL}/api/jobs?saved_only=true", headers=_h(fresh_user["token"])).json()
    assert any(j["job_id"] == job_id for j in saved_only)
    assert all(j["saved"] is True for j in saved_only)

    us = s.post(f"{BASE_URL}/api/jobs/{job_id}/unsave", headers=_h(fresh_user["token"]))
    assert us.status_code == 200 and us.json()["saved"] is False


def test_jobs_filter_by_remote_type(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed")
    r = s.get(f"{BASE_URL}/api/jobs?remote_type=remote", headers=_h(fresh_user["token"]))
    assert r.status_code == 200
    for j in r.json():
        assert j["remote_type"] == "remote"


def test_delete_job(s, fresh_user, first_discover):
    if first_discover.status_code == 502:
        pytest.skip("first discover failed")
    listed = s.get(f"{BASE_URL}/api/jobs", headers=_h(fresh_user["token"])).json()
    if not listed:
        pytest.skip("no jobs to delete")
    jid = listed[-1]["job_id"]
    d = s.delete(f"{BASE_URL}/api/jobs/{jid}", headers=_h(fresh_user["token"]))
    assert d.status_code == 200
    # Verify gone
    after = s.get(f"{BASE_URL}/api/jobs", headers=_h(fresh_user["token"])).json()
    assert not any(j["job_id"] == jid for j in after)


# ---------- Dashboard summary new fields ----------
def test_dashboard_summary_jobs_fields(s, fresh_user):
    r = s.get(f"{BASE_URL}/api/dashboard/summary", headers=_h(fresh_user["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("jobs_per_day", "jobs_today", "jobs_saved"):
        assert k in d, f"dashboard summary missing {k}"
    assert d["jobs_per_day"] == 5  # free user
    assert isinstance(d["jobs_today"], int) and d["jobs_today"] >= 0
    assert isinstance(d["jobs_saved"], int) and d["jobs_saved"] >= 0


# ---------- Admin Hero plan unlimited ----------
def test_admin_unlimited_jobs(s, admin_token):
    r = s.get(f"{BASE_URL}/api/jobs/usage", headers=_h(admin_token))
    assert r.status_code == 200
    d = r.json()
    assert d["unlimited"] is True
    assert d["jobs_per_day"] >= 1000
