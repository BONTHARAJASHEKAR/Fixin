"""Razorpay payment routes: plans, create order, verify, webhook, history."""
import os
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
import razorpay
from typing import List
from models import CreateOrderRequest, VerifyPaymentRequest, PLANS, Payment
from auth_utils import get_current_user
from db import users, payments, subscriptions

router = APIRouter(prefix="/api/payments", tags=["payments"])

RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RZP_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

_client = None


def _rzp():
    global _client
    if _client is None:
        _client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET))
    return _client


@router.get("/plans")
async def list_plans():
    from routes_settings import get_effective_plans
    plans = await get_effective_plans()
    return [{"id": k, **v} for k, v in plans.items()]


@router.post("/create-order")
async def create_order(body: CreateOrderRequest, user: dict = Depends(get_current_user)):
    from routes_settings import get_effective_plan
    plan = await get_effective_plan(body.plan)
    if not plan or body.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    amount_inr = plan["price_inr"]
    amount_paise = amount_inr * 100
    receipt = f"rcpt_{user['user_id'][:8]}_{int(datetime.now(timezone.utc).timestamp())}"[:40]

    # Detect placeholder credentials -> mock order (lets the UI flow work end-to-end in dev/demo)
    is_mock = not RZP_KEY_ID or RZP_KEY_ID.endswith("placeholder")
    if is_mock:
        order = {
            "id": f"order_mock_{int(datetime.now(timezone.utc).timestamp())}",
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "_mock": True,
        }
    else:
        try:
            order = _rzp().order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
                "notes": {"plan": body.plan, "user_id": user["user_id"]},
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay order failed: {e}")

    p = Payment(
        user_id=user["user_id"], plan=body.plan, amount_inr=amount_inr,
        razorpay_order_id=order["id"], status="created",
    )
    await payments.insert_one(p.model_dump())
    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RZP_KEY_ID,
        "plan": body.plan,
        "mock": is_mock,
    }


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not RZP_KEY_SECRET:
        return False
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(RZP_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/verify")
async def verify_payment(body: VerifyPaymentRequest, user: dict = Depends(get_current_user)):
    # Look up the original order created on our side to prevent plan/amount tampering
    order_doc = await payments.find_one(
        {"razorpay_order_id": body.razorpay_order_id, "user_id": user["user_id"]},
        {"_id": 0},
    )
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    plan = order_doc["plan"]  # trust the server-stored plan, not request body

    is_mock = body.razorpay_order_id.startswith("order_mock_")
    if not is_mock and not _verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        await payments.update_one({"razorpay_order_id": body.razorpay_order_id}, {"$set": {"status": "failed"}})
        raise HTTPException(status_code=400, detail="Signature verification failed")

    # Mark payment success
    await payments.update_one(
        {"razorpay_order_id": body.razorpay_order_id},
        {"$set": {"status": "success", "razorpay_payment_id": body.razorpay_payment_id}},
    )
    # Activate subscription
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"plan": plan, "plan_expires_at": expires_at,
                  "ats_scans_used": 0, "ai_rewrites_used": 0}},
    )
    await subscriptions.insert_one({
        "user_id": user["user_id"], "plan": plan, "started_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at, "active": True,
        "razorpay_payment_id": body.razorpay_payment_id,
    })
    user_doc = await users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user_doc}


@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("x-razorpay-signature") or request.headers.get("X-Razorpay-Signature") or ""
    if RZP_WEBHOOK_SECRET and not RZP_WEBHOOK_SECRET.endswith("placeholder"):
        expected = hmac.new(RZP_WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Bad webhook signature")
    try:
        data = await request.json()
    except Exception:
        data = {}
    event = data.get("event", "")
    payment_id = data.get("payload", {}).get("payment", {}).get("entity", {}).get("id")
    if payment_id:
        status = "success" if "captured" in event else ("failed" if "failed" in event else event)
        await payments.update_one(
            {"razorpay_payment_id": payment_id},
            {"$set": {"status": status}},
        )
    return {"ok": True}


@router.get("/history", response_model=List[Payment])
async def history(user: dict = Depends(get_current_user)):
    items = await payments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Payment(**x) for x in items]
