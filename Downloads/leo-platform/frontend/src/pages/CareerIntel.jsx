import { useEffect, useState } from "react";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, EmptyState } from "../components/Primitives";

export default function CareerIntel() {
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [goals, setGoals] = useState("Career growth toward senior engineering roles");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/resumes");
      setResumes(data);
      const a = data.find((r) => r.is_active) || data[0];
      if (a) setResumeId(a.resume_id);
    })();
  }, []);

  const generate = async () => {
    setError(""); setLoading(true); setInsights(null);
    try {
      const { data } = await api.post("/ai/insights", { resume_id: resumeId || null, goals });
      setInsights(data);
    } catch (err) { setError(err.response?.data?.detail || "Failed to fetch insights"); }
    setLoading(false);
  };

  return (
    <div className="fade-up" data-testid="career-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Career Intelligence</h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>AI-powered career insights based on your resume and goals.</p>
      </div>

      <div className="leo-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Resume (optional)</label>
            <select data-testid="ci-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="leo-input" style={{ marginTop: 6 }}>
              <option value="" style={{ background: C.bgCard }}>— None —</option>
              {resumes.map((r) => <option key={r.resume_id} value={r.resume_id} style={{ background: C.bgCard }}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Career goals</label>
            <input data-testid="ci-goals" value={goals} onChange={(e) => setGoals(e.target.value)} className="leo-input" style={{ marginTop: 6 }} />
          </div>
          <button data-testid="ci-generate" onClick={generate} disabled={loading} className="leo-btn leo-btn-primary" style={{ padding: "12px 18px", fontSize: 13 }}>
            {loading ? <Spinner color="#fff" /> : "✦ Generate"}
          </button>
        </div>
        {error && <div style={{ marginTop: 12, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>{error}</div>}
      </div>

      {loading && <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>}

      {!loading && !insights && (
        <EmptyState icon="🧠" title="Get a career strategy" description="Pick a resume and goal, then generate insights." />
      )}

      {insights && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} data-testid="ci-result">
          <div className="leo-card" style={{ gridColumn: "1 / -1" }}>
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Summary</h3>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{insights.summary}</p>
            <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Badge color="teal">Salary band · {insights.salary_estimate_inr}</Badge>
              {(insights.recommended_roles || []).map((r, i) => <Badge key={i} color="accent">{r}</Badge>)}
            </div>
          </div>

          <div className="leo-card">
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}><span style={{ color: C.green }}>✓</span> Strengths</h3>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {(insights.strengths || []).map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5, padding: "8px 12px", background: C.greenSoft, borderRadius: 8, borderLeft: `2px solid ${C.green}` }}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="leo-card">
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}><span style={{ color: C.amber }}>!</span> Gaps to close</h3>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {(insights.gaps || []).map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5, padding: "8px 12px", background: C.amberSoft, borderRadius: 8, borderLeft: `2px solid ${C.amber}` }}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="leo-card" style={{ gridColumn: "1 / -1" }}>
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Next steps</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(insights.next_steps || []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <Badge color={s.priority === "high" ? "red" : s.priority === "medium" ? "amber" : "teal"}>{s.priority}</Badge>
                  <span style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>{s.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
