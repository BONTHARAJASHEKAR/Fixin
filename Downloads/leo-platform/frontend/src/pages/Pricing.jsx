import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, Logo } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

const COMPARISON_ROWS = [
  { feat: "Job links per day", key: "jobs_per_day", format: (v) => v >= 1000 ? "∞ Unlimited" : `${v} / day` },
  { feat: "ATS scans", key: "ats_quota", format: (v) => v >= 1000 ? "∞ Unlimited" : `${v}` },
  { feat: "AI suggestions", key: "ai_quota", format: (v) => v >= 1000 ? "∞ Unlimited" : `${v}` },
  { feat: "Sources", key: "sources", format: (v) => v.length },
  { feat: "Startup priority feed", key: "startup_priority", format: (v) => v ? "✓" : "—" },
  { feat: "AI resume rewrite", key: "ai_rewrite", format: (v) => v ? "✓" : "—" },
  { feat: "Hiring probability", key: "hiring_probability", format: (v) => v ? "✓" : "—" },
  { feat: "Interview prep AI", key: "interview_prep", format: (v) => v ? "✓" : "—" },
  { feat: "LinkedIn optimizer", key: "linkedin_optimizer", format: (v) => v ? "✓" : "—" },
];

function PlanCard({ plan, isCurrent, onSubscribe, paying, highlight }) {
  return (
    <div className="leo-card hover" data-testid={`plan-card-${plan.id}`} style={{
      padding: 28, position: "relative", overflow: "visible",
      border: highlight ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
      boxShadow: highlight ? `0 0 60px ${C.accentGlow}` : "none",
      background: highlight ? `linear-gradient(180deg, ${C.bgCard} 60%, rgba(108,99,255,0.08))` : C.bgCard,
      transform: highlight ? "translateY(-8px)" : "none",
    }}>
      {highlight && (
        <div style={{
          position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff",
          padding: "5px 14px", borderRadius: 100, fontSize: 10, fontWeight: 800, letterSpacing: "0.15em",
          boxShadow: `0 0 24px ${C.accentGlow}`,
        }}>★ MOST POPULAR</div>
      )}

      <div className="font-display" style={{
        fontSize: 13, fontWeight: 700, letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: highlight ? C.accent : C.textSecondary,
      }}>{plan.name}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14, marginBottom: 6 }}>
        <span className="font-display" style={{ fontSize: 44, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em" }}>₹{plan.price_inr}</span>
        <span style={{ fontSize: 13, color: C.textMuted }}>/month</span>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, color: highlight ? C.teal : C.accent,
        background: highlight ? C.tealSoft : C.accentSoft,
        padding: "5px 10px", borderRadius: 6, display: "inline-block",
        marginBottom: 18, letterSpacing: "0.05em",
      }}>
        {plan.jobs_per_day >= 1000 ? "∞ UNLIMITED JOB LINKS" : `${plan.jobs_per_day} JOB LINKS / DAY`}
      </div>

      <ul style={{ listStyle: "none", padding: 0, marginBottom: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
            <span style={{ color: highlight ? C.teal : C.accent, marginTop: 1, fontWeight: 700 }}>✓</span> {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button disabled className="leo-btn leo-btn-ghost" style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 600 }}>✓ Current plan</button>
      ) : plan.id === "free" ? (
        <button onClick={onSubscribe} className="leo-btn leo-btn-ghost" style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 600 }}>Continue free</button>
      ) : (
        <button data-testid={`subscribe-${plan.id}`} onClick={onSubscribe} disabled={paying} className="leo-btn"
          style={{
            width: "100%", padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 13, letterSpacing: "0.02em",
            background: highlight
              ? `linear-gradient(135deg, ${C.accent}, ${C.teal})`
              : C.accent,
            color: "#fff", border: "none",
            boxShadow: highlight ? `0 0 32px ${C.accentGlow}` : "none",
            animation: highlight && !paying ? "glow 2.4s ease-in-out infinite" : "none",
          }}>
          {paying ? <Spinner color="#fff" /> : `Choose ${plan.name} →`}
        </button>
      )}
    </div>
  );
}

export default function Pricing() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Leomote · Pricing";
    (async () => {
      const { data } = await api.get("/payments/plans");
      setPlans(data); setLoading(false);
    })();
  }, []);

  const subscribe = async (planId) => {
    if (!user) { navigate("/signup"); return; }
    setError(""); setPaying(planId);
    try {
      const { data } = await api.post("/payments/create-order", { plan: planId });
      if (data.mock) {
        await api.post("/payments/verify", {
          razorpay_order_id: data.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "mock_signature",
          plan: planId,
        });
        await refresh();
        navigate("/dashboard");
        return;
      }
      const open = () => {
        const opts = {
          key: data.key_id, amount: data.amount, currency: data.currency,
          name: "Leomote", description: `${planId} subscription`,
          order_id: data.order_id,
          handler: async (resp) => {
            try {
              await api.post("/payments/verify", {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                plan: planId,
              });
              await refresh();
              navigate("/dashboard");
            } catch (err) { setError(err.response?.data?.detail || "Verification failed"); }
          },
          prefill: { name: user.name, email: user.email },
          theme: { color: "#6C63FF" },
        };
        new window.Razorpay(opts).open();
      };
      if (window.Razorpay) open();
      else {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = open;
        document.body.appendChild(s);
      }
    } catch (err) { setError(err.response?.data?.detail || "Order failed"); }
    setPaying(null);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.textPrimary }} className="leo-bg-grid">
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <Link to="/" style={{ textDecoration: "none" }}><Logo /></Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {user ? <Link to="/dashboard" style={{ color: C.textPrimary, fontSize: 13, textDecoration: "none" }}>Dashboard →</Link>
            : <Link to="/login" style={{ color: C.textPrimary, fontSize: 13, textDecoration: "none" }}>Sign in</Link>}
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "40px 32px 40px", maxWidth: 1260, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }} data-testid="pricing-header">
          <Badge color="accent">★ MORE PLAN = MORE JOBS</Badge>
          <h1 className="font-display" style={{ fontSize: "clamp(34px, 5vw, 58px)", fontWeight: 700, marginTop: 18, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            One subscription. <br />
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Hundreds of startup jobs.
            </span>
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 16, marginTop: 16, maxWidth: 600, marginInline: "auto", lineHeight: 1.6 }}>
            Unlock more job recommendations, deeper AI optimization, and priority access to startup hiring feeds. Cancel anytime.
          </p>
        </div>

        {error && <div data-testid="pricing-error" style={{ maxWidth: 680, margin: "0 auto 18px", padding: 12, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 13, textAlign: "center" }}>{error}</div>}

        {loading ? <div style={{ padding: 60, display: "grid", placeItems: "center" }}><Spinner size={28} /></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18, alignItems: "stretch" }}>
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p}
                isCurrent={user?.plan === p.id}
                highlight={p.id === "premium"}
                paying={paying === p.id}
                onSubscribe={() => p.id === "free" ? navigate(user ? "/dashboard" : "/signup") : subscribe(p.id)}
              />
            ))}
          </div>
        )}

        {/* Comparison table */}
        {plans.length > 0 && (
          <div style={{ marginTop: 60 }} data-testid="comparison-table">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <Badge color="teal">SIDE-BY-SIDE</Badge>
              <h2 className="font-display" style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 700, marginTop: 12, letterSpacing: "-0.02em" }}>Compare plans</h2>
            </div>
            <div className="leo-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <th style={{ textAlign: "left", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Feature</th>
                      {plans.map((p) => (
                        <th key={p.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, textAlign: "center", minWidth: 120 }}>
                          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: p.id === "premium" ? C.accent : C.textPrimary }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>₹{p.price_inr}/mo</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((r) => (
                      <tr key={r.feat} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "14px 20px", color: C.textPrimary, fontWeight: 500 }}>{r.feat}</td>
                        {plans.map((p) => {
                          const v = r.format(p[r.key]);
                          const positive = v === "✓" || (typeof v === "string" && v.includes("Unlimited"));
                          return (
                            <td key={p.id} style={{ padding: "14px 20px", textAlign: "center", color: positive ? C.teal : v === "—" ? C.textMuted : C.textPrimary, fontWeight: positive ? 700 : 500 }}>{v}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginTop: 64, maxWidth: 720, margin: "64px auto 0" }}>
          <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 24, letterSpacing: "-0.02em" }}>Frequently asked</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { q: "Are the job links real?", a: "Yes — every job has Apply buttons that deep-link into LinkedIn, Naukri, Wellfound, Indeed, or Internshala search for that exact role and company. You click → you land on the live listing." },
              { q: "Can I cancel anytime?", a: "Yes. Your plan stays active until the end of the billing cycle, then drops back to Free." },
              { q: "What payment methods?", a: "All major UPI apps, cards, net banking, and wallets via Razorpay." },
              { q: "Do I need to upload a resume?", a: "It's optional for Job Discovery, but with a resume the AI matches jobs 3-4× more accurately." },
            ].map((f, i) => (
              <details key={i} className="leo-card" style={{ padding: 18, cursor: "pointer" }}>
                <summary style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, listStyle: "none" }}>{f.q}</summary>
                <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 10 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 40, color: C.textMuted, fontSize: 12 }}>
          Payments via Razorpay · Secure · GST-compliant · 7-day money-back guarantee
        </p>
      </section>
    </div>
  );
}
