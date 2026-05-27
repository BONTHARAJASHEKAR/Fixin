import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../lib/tokens";
import { Logo, Badge } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

function Section({ children, style }) {
  return <section style={{ padding: "80px 32px", maxWidth: 1280, margin: "0 auto", ...style }}>{children}</section>;
}

function Feature({ icon, title, desc, color = C.accent }) {
  return (
    <div className="leo-card hover" style={{ padding: 28 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}1f`, color, display: "grid", placeItems: "center", fontSize: 20, marginBottom: 18 }}>{icon}</div>
      <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function PriceCard({ name, price, period, features, highlight, cta, planId, navigate }) {
  return (
    <div className="leo-card hover" style={{
      padding: 32, border: highlight ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
      boxShadow: highlight ? `0 0 48px ${C.accentGlow}` : "none",
      position: "relative",
    }} data-testid={`price-${planId}`}>
      {highlight && (
        <div style={{ position: "absolute", top: -1, right: 24, background: C.accent, color: "#fff", padding: "4px 10px", borderRadius: "0 0 8px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>POPULAR</div>
      )}
      <div className="font-display" style={{ fontSize: 14, color: highlight ? C.accent : C.textSecondary, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 22 }}>
        <span className="font-display" style={{ fontSize: 40, fontWeight: 700, color: C.textPrimary }}>{price}</span>
        <span style={{ fontSize: 13, color: C.textMuted }}>{period}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 26, display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
            <span style={{ color: C.teal, marginTop: 1 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button onClick={() => navigate(planId === "free" ? "/signup" : "/pricing")} className="leo-btn"
        style={{
          width: "100%", padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: highlight ? C.accent : "rgba(255,255,255,0.04)",
          color: highlight ? "#fff" : C.textPrimary,
          border: highlight ? "none" : `1px solid ${C.border}`,
        }}>{cta}</button>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    document.title = "Leomote · AI Career Optimization";
    Promise.all([api.get("/content"), api.get("/reviews")])
      .then(([c, r]) => { setContent(c.data); setReviews(r.data); })
      .catch(() => { /* keep defaults */ });
  }, []);

  const c = content || {};
  const stats = [
    { label: c.stat_1_label || "Avg ATS lift",       value: c.stat_1_value || "+18.4 pts", color: C.teal },
    { label: c.stat_2_label || "Interview rate",      value: c.stat_2_value || "31.4%",      color: C.accent },
    { label: c.stat_3_label || "Resumes optimized",   value: c.stat_3_value || "847K+",     color: C.amber },
    { label: c.stat_4_label || "Hiring success",      value: c.stat_4_value || "73%",       color: C.green },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.textPrimary }}>
      {/* Nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px", maxWidth: 1280, margin: "0 auto",
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#features" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>Features</a>
          <Link to="/pricing" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>Pricing</Link>
          <a href="#testimonials" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>Stories</a>
          {user ? (
            <button onClick={() => navigate("/dashboard")} data-testid="nav-dashboard-btn" className="leo-btn leo-btn-primary">Dashboard →</button>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-btn" style={{ fontSize: 13, color: C.textPrimary, textDecoration: "none" }}>Sign in</Link>
              <button onClick={() => navigate("/signup")} data-testid="nav-signup-btn" className="leo-btn leo-btn-primary">Get started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <Section style={{ padding: "60px 32px 100px" }}>
        <div className="leo-bg-grid leo-grain" style={{ borderRadius: 24, padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden", border: `1px solid ${C.border}` }}>
          <Badge color="accent">{c.hero_badge || "✦ Powered by GPT-5.2 · Trusted by 19,000+ professionals"}</Badge>
          <h1 className="font-display fade-up" style={{ fontSize: "clamp(40px, 7vw, 84px)", fontWeight: 700, lineHeight: 1.02, marginTop: 24, letterSpacing: "-0.04em" }}>
            {c.hero_title_line1 || "Beat the bots."}<br />
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {c.hero_title_line2 || "Land the offer."}
            </span>
          </h1>
          <p style={{ fontSize: 17, color: C.textSecondary, maxWidth: 620, margin: "24px auto 36px", lineHeight: 1.6 }}>
            {c.hero_subtitle || "Leomote is the AI co-pilot for your career."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => navigate(user ? "/dashboard" : "/signup")} data-testid="hero-cta-btn" className="leo-btn leo-btn-primary" style={{ padding: "14px 28px", fontSize: 14, fontWeight: 600 }}>
              {user ? "Open dashboard" : (c.hero_cta || "Start free — no card needed")} →
            </button>
            <Link to="/pricing" data-testid="hero-pricing-btn"><button className="leo-btn leo-btn-ghost" style={{ padding: "14px 24px", fontSize: 14 }}>See pricing</button></Link>
          </div>

          {/* Floating preview stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16, maxWidth: 880, margin: "60px auto 0",
          }}>
            {stats.map((s, i) => (
              <div key={i} className="leo-glass" style={{ padding: 20, textAlign: "left" }}>
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
                <div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section style={{ paddingTop: 20 }}>
        <div id="features" style={{ textAlign: "center", marginBottom: 56 }}>
          <Badge color="teal">FEATURES</Badge>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, marginTop: 16, letterSpacing: "-0.03em" }}>Built for the modern job seeker</h2>
          <p style={{ color: C.textSecondary, fontSize: 15, maxWidth: 580, margin: "12px auto 0" }}>
            Every step of your career, accelerated by AI. From ATS to offer letter.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <Feature icon="🔍" color={C.accent} title="AI Job Discovery"
            desc="Get matched to real jobs from LinkedIn, Naukri, Wellfound, Indeed, Internshala. Up to ∞ links/day on Hero plan." />
          <Feature icon="⚡" color={C.amber} title="Startup Hiring Feed"
            desc="Priority access to Razorpay, Zepto, CRED, Meesho, PhonePe, Swiggy, and 100+ Indian + remote-first startups." />
          <Feature icon="🎯" color={C.teal} title="ATS Engine"
            desc="Score your resume against 847+ ATS systems. Get keyword gaps, format issues, and one-click fixes." />
          <Feature icon="✦" color={C.purple} title="AI Resume Rewrite"
            desc="Rewrite bullets with metrics, action verbs, and recruiter-tested phrasing — tuned to your target role." />
          <Feature icon="🎤" color={C.blue} title="Interview Prep"
            desc="Practice with role-specific questions. Get instant feedback on technical, behavioral, and system design." />
          <Feature icon="🧠" color={C.red} title="Career Intelligence"
            desc="AI-powered insights: salary ranges, skill gaps, next moves. Like a career coach, in your pocket." />
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Badge color="amber">PRICING</Badge>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, marginTop: 16, letterSpacing: "-0.03em" }}>Choose your launch pad</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          <PriceCard planId="free" name="Free" price="₹0" period="/forever" cta="Start free" navigate={navigate}
            features={["5 job links / day", "5 ATS scans / month", "Basic startup feed"]} />
          <PriceCard planId="basic" name="Basic" price="₹79" period="/month" cta="Choose Basic" navigate={navigate}
            features={["25 job links / day", "LinkedIn + Naukri + Wellfound", "AI resume improvements", "Save jobs"]} />
          <PriceCard planId="premium" name="Premium" price="₹119" period="/month" cta="Choose Premium" highlight navigate={navigate}
            features={["75 job links / day", "Priority startup feed", "AI resume rewrite", "Interview prep", "Hiring probability"]} />
          <PriceCard planId="hero" name="Hero" price="₹199" period="/month" cta="Choose Hero" navigate={navigate}
            features={["∞ Unlimited job links", "Early-access startups", "Premium AI rebuild", "Skill gap analysis", "Priority AI"]} />
        </div>
      </Section>

      {/* Testimonials */}
      <Section>
        <div id="testimonials" style={{ textAlign: "center", marginBottom: 48 }}>
          <Badge color="purple">TRUSTED BY</Badge>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, marginTop: 16, letterSpacing: "-0.03em" }}>Stories from the offer letters</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {[
            { q: "Went from 0 callbacks to 7 interviews in 3 weeks. The ATS engine is unreal.", a: "Arjun Sharma", r: "SDE-2 at Zepto" },
            { q: "AI rewrite turned my resume from a wall of text into a recruiter magnet.", a: "Priya Menon", r: "Frontend at Razorpay" },
            { q: "The interview prep section literally got me through my Meta loop.", a: "Karan Mehta", r: "L4 at Meta" },
          ].map((t, i) => (
            <div key={i} className="leo-card hover">
              <div style={{ fontSize: 22, color: C.accent, marginBottom: 12 }}>"</div>
              <p style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.6, marginBottom: 16 }}>{t.q}</p>
              <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{t.a}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{t.r}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer CTA */}
      <Section>
        <div className="leo-card" style={{ padding: "60px 40px", textAlign: "center", background: `linear-gradient(135deg, ${C.bgCard}, rgba(108,99,255,0.08))`, border: `1px solid ${C.accent}` }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em" }}>Your next offer is one resume away.</h2>
          <p style={{ color: C.textSecondary, fontSize: 15, maxWidth: 520, margin: "16px auto 28px" }}>Start free. Upgrade when you're ready.</p>
          <button onClick={() => navigate(user ? "/dashboard" : "/signup")} data-testid="footer-cta-btn" className="leo-btn leo-btn-primary" style={{ padding: "14px 32px", fontSize: 14 }}>
            {user ? "Open dashboard" : "Get started — it's free"} →
          </button>
        </div>
      </Section>

      <footer style={{ padding: "32px", borderTop: `1px solid ${C.border}`, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
        {c.footer_tagline || "© 2026 Leomote · Made with care for job seekers in India and beyond."}
        {" · "}<Link to="/admin/login" style={{ color: C.textMuted, textDecoration: "underline" }}>Admin</Link>
      </footer>
    </div>
  );
}
