# Leomote — AI Career Optimization Platform

## Original problem statement
Build a complete production-ready AI SaaS called **Leomote** that helps users:
- Check ATS score
- Optimize resumes
- Analyze resumes
- Get keyword suggestions
- Match resumes with job descriptions
- AI resume rewriting
- Track applications
- AI career insights
- Premium AI features via subscriptions
Branding: futuristic, premium, modern SaaS, glassmorphism UI, Silicon Valley startup style.

## Stack (chosen with user)
- Frontend: React (CRA) + Tailwind + custom dark theme (Syne + DM Sans) + shadcn/ui primitives
- Backend: Python FastAPI
- DB: MongoDB
- AI: OpenAI **GPT-5.2** via Emergent Universal Key (`emergentintegrations`)
- Auth: JWT email/password **+** Emergent-managed Google OAuth
- Payments: **Razorpay** (mock mode in dev — placeholder keys)

## User personas
- **Job seeker (free)** — runs limited ATS scans, basic templates
- **Job seeker (paid)** — Basic / Premium / Hero plans, AI rewrite, job match, interview prep
- **Admin / Super Admin** — platform-wide analytics, user management, system health

## Core requirements (implemented)
### Backend
- JWT signup/login, Google OAuth session exchange (`/api/auth/session`), `/auth/me`, `/logout`
- Resume CRUD + PDF/DOCX/TXT upload
- ATS analyze (GPT-5.2): match score, ATS score, keywords present/missing, suggestions
- AI rewrite, keyword extract, job match, career insights, interview prep, LinkedIn optimizer
- Razorpay create-order, verify (HMAC), webhook, plans listing, payment history
- Mock mode auto-activated when Razorpay keys are placeholders
- Application tracker CRUD + stats (interview rate)
- Dashboard summary
- Admin analytics: overview (MRR, growth, plan mix), users (block/unblock), payments, ATS analytics, traffic, activity, system health, notifications
- Quota enforcement per plan; 402 returned on exceed
- Admin user is auto-seeded on startup
- LLM failures wrapped → 503 with friendly message

### Frontend (matching uploaded artifact design)
- Dark theme (#0A0B0F), accent #6C63FF, teal #00D4AA, Syne + DM Sans
- Landing (hero, features, pricing, testimonials, footer CTA)
- Pricing with mock-Razorpay flow + real Razorpay checkout integration
- Auth (Login, Signup, Google OAuth callback handler)
- User app shell with sidebar + 9 protected pages
- Admin shell with sidebar + topbar + 10 protected pages
- All interactive elements carry `data-testid`

## Implementation log
- **2026-02 (initial build)** — Full MVP delivered: backend (8 modules), frontend (24 pages/components), seeded admin, dashboard widgets, full Razorpay mock-flow, GPT-5.2 ATS analysis verified live.
- Bug-fix round 1: month bucketing in admin overview, LLM error handling → 503, payment verify trust-server-plan (security), 3 test-id renames.
- **2026-02 (Job Discovery upgrade)** — New AI Job Discovery engine: `/api/jobs/discover` generates curated jobs via GPT-5.2 with deep-link Apply URLs (LinkedIn / Naukri / Wellfound / Indeed / Internshala), per-plan daily quota (5/25/75/∞), save/unsave, stats, hiring probability, missing-skills analysis. New pricing tiers: Free ₹0 → Basic ₹79 → Premium ₹119 → Hero ₹199.
- **2026-02 (Job hardening)** — Strict server-side remote_type post-filter for /discover.
- **2026-02 (Admin management layer)** — Added: (1) **Dynamic pricing editor** — admin edits price/quotas/features/flags per plan, overrides stored in `plan_overrides` collection; defaults from PLANS merged via `get_effective_plans()`; effective immediately on `/api/payments/plans`. (2) **Reviews CRUD** — admin creates/edits/deletes testimonials; only `featured=true` shown on landing via `/api/reviews`. (3) **Site content manager** — 14 editable copy fields (hero/CTA/stats/footer) via `/api/admin/content` ↔ `/api/content`. (4) **Conversion analytics** — `/api/admin/conversion`: free→paid %, upgrade-after-ATS %, plan funnel. (5) **Jobs analytics** — `/api/admin/jobs-analytics`: top skills, top companies, source breakdown. Landing.jsx now fetches reviews + content with graceful defaults. Tests: 17/17 backend + 100% frontend.

## Backlog (deferred)
### P1 (next iteration)
- File storage for uploaded resumes (object storage / S3) so PDFs persist beyond text-only extraction
- Real Razorpay subscription objects (recurring billing) — currently treats payment as 30-day pass
- Sentry / Winston structured logging
- Redis-backed rate limit + cache (currently in-process)

### P2 (future)
- Background job queue for AI rewrite (long-running)
- LinkedIn Easy Apply integration
- Calendar export for interviews
- Mobile app (React Native)
- A/B testing for landing page
- Affiliate / referral program for revenue lift
- SEO / open-graph for landing page
- Multi-resume comparison view
- Recruiter portal (B2B revenue stream)

## Next tasks
- Add Razorpay live keys (when user is ready) → real billing kicks in automatically
- Production deployment via Emergent Deploy
- Add /api/admin/export for CSV downloads (referenced in admin UI)
