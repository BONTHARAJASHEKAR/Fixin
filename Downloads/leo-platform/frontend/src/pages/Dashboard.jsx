import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C, fmt } from "../lib/tokens";
import api from "../lib/api";
import { StatCard, ScoreRing, ProgressBar, Spinner, Badge } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/dashboard/summary"); setData(data); }
      catch { /* noop */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  const d = data || {};
  const first = user?.name?.split(" ")[0] || "there";
  const score = d.latest_ats_score ?? 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fade-up" data-testid="dashboard-page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{today}</div>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, marginTop: 6, color: C.textPrimary, letterSpacing: "-0.02em" }}>
          Good day, {first} 👋
        </h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>
          {score ? `Your latest resume scored ${score}/100. Keep iterating to climb the rankings.` : "Upload a resume to start optimizing."}
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard testid="stat-ats" label="Latest ATS Score" value={score ? `${score}/100` : "—"} icon="🎯" color={C.accent} change="+12" />
        <StatCard testid="stat-resumes" label="Resumes" value={d.resume_count ?? 0} icon="📄" color={C.teal} />
        <StatCard testid="stat-apps" label="Applications" value={d.apps_total ?? 0} icon="📊" color={C.amber} change="+8" />
        <StatCard testid="stat-interviews" label="Interviews + Offers" value={d.apps_interview_or_offer ?? 0} icon="🎤" color={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* ATS overview */}
          <div className="leo-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Resume Health</h2>
                <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Based on the latest ATS report</p>
              </div>
              <Badge color="teal">{d.plan_name || "Free"} plan</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 20 }}>
              <ScoreRing score={score} size={140} strokeWidth={12} color={score >= 80 ? C.teal : score >= 60 ? C.accent : C.amber} label="ATS score" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <ProgressBar label="ATS quota used" value={Math.round(((d.ats_used || 0) / (d.ats_quota || 1)) * 100)} sublabel={`${d.ats_used || 0} / ${d.ats_quota || 0} scans`} color={C.accent} />
                <ProgressBar label="AI quota used" value={Math.round(((d.ai_used || 0) / (d.ai_quota || 1)) * 100)} sublabel={`${d.ai_used || 0} / ${d.ai_quota || 0} AI calls`} color={C.teal} />
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <Link to="/ats" data-testid="dashboard-cta-ats"><button className="leo-btn leo-btn-primary" style={{ padding: "10px 16px", fontSize: 12 }}>✦ Run ATS analysis</button></Link>
                  <Link to="/resume" data-testid="dashboard-cta-resume"><button className="leo-btn leo-btn-ghost" style={{ padding: "10px 16px", fontSize: 12 }}>Manage resumes</button></Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent reports */}
          <div className="leo-card">
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Recent ATS Reports</h2>
            {(d.recent_reports || []).length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: 13 }}>No reports yet — upload a resume and run your first ATS scan.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(d.recent_reports || []).map((r) => (
                  <div key={r.report_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>Match {r.match_score}% · ATS {r.ats_score}/100</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <Badge color={r.ats_score >= 80 ? "teal" : r.ats_score >= 60 ? "accent" : "amber"}>{r.ats_score}/100</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Plan card */}
          <div className="leo-card" style={{
            background: `linear-gradient(135deg, ${C.bgCard}, rgba(108,99,255,0.06))`,
            border: `1px solid ${C.accent}`,
          }}>
            <Badge color="accent">CURRENT PLAN</Badge>
            <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>{d.plan_name || "Free"} plan</h3>
            <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>{d.ai_used || 0} AI calls · {d.ats_used || 0} ATS scans this period</p>
            <Link to="/pricing"><button data-testid="upgrade-btn" className="leo-btn leo-btn-primary" style={{ width: "100%", marginTop: 16, padding: "11px", fontSize: 12 }}>Upgrade plan →</button></Link>
          </div>

          {/* Quick links */}
          <div className="leo-card">
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Jump back in</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { to: "/resume", icon: "📄", label: "Resume Studio" },
                { to: "/ats", icon: "🎯", label: "ATS Engine" },
                { to: "/jobs", icon: "🔍", label: "Job Discovery" },
                { to: "/interview", icon: "🎤", label: "Interview Prep" },
                { to: "/career", icon: "🧠", label: "Career Insights" },
                { to: "/tracker", icon: "📊", label: "App Tracker" },
              ].map((x) => (
                <Link key={x.to} to={x.to} data-testid={`quick-${x.label.toLowerCase().replace(/\s+/g, "-")}`} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
                  color: C.textPrimary, textDecoration: "none", fontSize: 13, transition: "background 0.15s",
                }}><span style={{ fontSize: 14 }}>{x.icon}</span> {x.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
