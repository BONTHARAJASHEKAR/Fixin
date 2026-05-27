"""Backend tests for new admin management layer (plans, reviews, content, analytics)."""
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


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_token(s):
    suf = uuid.uuid4().hex[:8]
    creds = {"name": f"NA {suf}", "email": f"TEST_admchk_{suf}@example.com", "password": "Passw0rd!"}
    r = s.post(f"{BASE_URL}/api/auth/signup", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Plans ----------
PLAN_FIELDS = ["id", "name", "price_inr", "ats_quota", "ai_quota", "jobs_per_day", "sources",
               "startup_priority", "ai_rewrite", "hiring_probability", "interview_prep",
               "linkedin_optimizer", "features"]


def test_admin_list_plans(s, admin_token):
    r = s.get(f"{BASE_URL}/api/admin/plans", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    plans = r.json()
    ids = {p["id"] for p in plans}
    assert {"free", "basic", "premium", "hero"}.issubset(ids)
    for p in plans:
        for f in PLAN_FIELDS:
            assert f in p, f"missing field {f} in plan {p.get('id')}"


def test_admin_update_plan_price_and_public_reflects(s, admin_token):
    # Update premium price to 149
    r = s.put(f"{BASE_URL}/api/admin/plans/premium", json={"price_inr": 149}, headers=_h(admin_token))
    assert r.status_code == 200, r.text
    assert r.json()["price_inr"] == 149
    # Public endpoint reflects
    pub = s.get(f"{BASE_URL}/api/payments/plans").json()
    premium = next(p for p in pub if p["id"] == "premium")
    assert premium["price_inr"] == 149


def test_admin_update_basic_jobs_per_day(s, admin_token):
    r = s.put(f"{BASE_URL}/api/admin/plans/basic", json={"jobs_per_day": 40}, headers=_h(admin_token))
    assert r.status_code == 200, r.text
    assert r.json()["jobs_per_day"] == 40
    pub = s.get(f"{BASE_URL}/api/payments/plans").json()
    basic = next(p for p in pub if p["id"] == "basic")
    assert basic["jobs_per_day"] == 40


def test_admin_reset_plan_overrides(s, admin_token):
    r = s.delete(f"{BASE_URL}/api/admin/plans/premium/overrides", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    pub = s.get(f"{BASE_URL}/api/payments/plans").json()
    premium = next(p for p in pub if p["id"] == "premium")
    assert premium["price_inr"] == 119  # back to default
    # reset basic too
    s.delete(f"{BASE_URL}/api/admin/plans/basic/overrides", headers=_h(admin_token))


def test_admin_update_unknown_plan_404(s, admin_token):
    r = s.put(f"{BASE_URL}/api/admin/plans/unknown", json={"price_inr": 1}, headers=_h(admin_token))
    assert r.status_code == 404


def test_admin_plans_forbidden_for_non_admin(s, user_token):
    r = s.put(f"{BASE_URL}/api/admin/plans/premium", json={"price_inr": 1}, headers=_h(user_token))
    assert r.status_code == 403
    r2 = s.delete(f"{BASE_URL}/api/admin/plans/premium/overrides", headers=_h(user_token))
    assert r2.status_code == 403
    r3 = s.get(f"{BASE_URL}/api/admin/plans", headers=_h(user_token))
    assert r3.status_code == 403


def test_admin_plans_unauthenticated_401(s):
    r = s.get(f"{BASE_URL}/api/admin/plans")
    assert r.status_code in (401, 403)


# ---------- Reviews ----------
def test_admin_reviews_crud_and_public_filter(s, admin_token):
    # CREATE
    payload = {"author": "TEST_Reviewer", "role": "QA", "company": "TestCo",
               "quote": "Solid product!", "rating": 5, "featured": True}
    c = s.post(f"{BASE_URL}/api/admin/reviews", json=payload, headers=_h(admin_token))
    assert c.status_code == 200, c.text
    created = c.json()
    rid = created["review_id"]
    assert created["author"] == "TEST_Reviewer"

    # LIST (admin)
    l = s.get(f"{BASE_URL}/api/admin/reviews", headers=_h(admin_token))
    assert l.status_code == 200
    assert any(r["review_id"] == rid for r in l.json())

    # Public should include it (featured=True)
    pub = s.get(f"{BASE_URL}/api/reviews").json()
    assert any(r["review_id"] == rid for r in pub)

    # UPDATE to featured=False
    u = s.put(f"{BASE_URL}/api/admin/reviews/{rid}",
              json={**payload, "featured": False, "quote": "Updated quote"}, headers=_h(admin_token))
    assert u.status_code == 200, u.text
    assert u.json()["featured"] is False
    assert u.json()["quote"] == "Updated quote"

    # Public should NOT include it now
    pub2 = s.get(f"{BASE_URL}/api/reviews").json()
    assert not any(r["review_id"] == rid for r in pub2)

    # DELETE
    d = s.delete(f"{BASE_URL}/api/admin/reviews/{rid}", headers=_h(admin_token))
    assert d.status_code == 200


def test_admin_reviews_forbidden_for_non_admin(s, user_token):
    r = s.get(f"{BASE_URL}/api/admin/reviews", headers=_h(user_token))
    assert r.status_code == 403
    r2 = s.post(f"{BASE_URL}/api/admin/reviews",
                json={"author": "x", "quote": "y"}, headers=_h(user_token))
    assert r2.status_code == 403


# ---------- Site content ----------
CONTENT_KEYS = ["hero_badge", "hero_title_line1", "hero_title_line2", "hero_subtitle", "hero_cta",
                "footer_tagline", "stat_1_label", "stat_1_value", "stat_2_label", "stat_2_value",
                "stat_3_label", "stat_3_value", "stat_4_label", "stat_4_value"]


def test_admin_get_content_has_all_keys(s, admin_token):
    r = s.get(f"{BASE_URL}/api/admin/content", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    data = r.json()
    for k in CONTENT_KEYS:
        assert k in data, f"missing content key {k}"


def test_admin_update_content_and_public_reflects(s, admin_token):
    new_title = f"Custom title {uuid.uuid4().hex[:6]}"
    r = s.put(f"{BASE_URL}/api/admin/content", json={"hero_title_line1": new_title}, headers=_h(admin_token))
    assert r.status_code == 200, r.text
    assert r.json()["hero_title_line1"] == new_title
    pub = s.get(f"{BASE_URL}/api/content").json()
    assert pub["hero_title_line1"] == new_title
    # Restore default
    s.put(f"{BASE_URL}/api/admin/content", json={"hero_title_line1": "Beat the bots."},
          headers=_h(admin_token))


def test_admin_update_content_unknown_keys_400(s, admin_token):
    r = s.put(f"{BASE_URL}/api/admin/content", json={"bogus_key": "x"}, headers=_h(admin_token))
    assert r.status_code == 400
    assert "No valid fields" in r.text


def test_admin_content_forbidden_for_non_admin(s, user_token):
    r = s.get(f"{BASE_URL}/api/admin/content", headers=_h(user_token))
    assert r.status_code == 403


# ---------- Analytics ----------
def test_admin_conversion_analytics(s, admin_token):
    r = s.get(f"{BASE_URL}/api/admin/conversion", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    data = r.json()
    for f in ("total_users", "free_users", "paid_users", "used_free_ats", "used_jobs",
              "paid_with_ats", "free_to_paid_pct", "upgrade_after_ats_pct",
              "most_popular_plan", "plan_counts"):
        assert f in data, f"missing field {f}"
    assert isinstance(data["plan_counts"], list)


def test_admin_jobs_analytics(s, admin_token):
    r = s.get(f"{BASE_URL}/api/admin/jobs-analytics", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    data = r.json()
    for f in ("total_jobs_viewed", "total_jobs_saved", "startup_jobs", "remote_jobs",
              "top_skills", "top_companies", "source_breakdown"):
        assert f in data
    assert isinstance(data["top_skills"], list)


def test_admin_analytics_forbidden_for_non_admin(s, user_token):
    r = s.get(f"{BASE_URL}/api/admin/conversion", headers=_h(user_token))
    assert r.status_code == 403
    r2 = s.get(f"{BASE_URL}/api/admin/jobs-analytics", headers=_h(user_token))
    assert r2.status_code == 403


def test_admin_analytics_unauth_401(s):
    r = s.get(f"{BASE_URL}/api/admin/conversion")
    assert r.status_code in (401, 403)
