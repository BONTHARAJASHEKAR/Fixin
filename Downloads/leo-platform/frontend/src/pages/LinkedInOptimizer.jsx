import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, EmptyState, Tag } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function LinkedInOptimizer() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [target, setTarget] = useState("Senior Software Engineer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const gated = !["premium", "hero"].includes(user?.plan);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/resumes");
      setResumes(data);
      const a = data.find((r) => r.is_active) || data[0];
      if (a) setResumeId(a.resume_id);
    })();
  }, []);

  const generate = async () => {
    if (!resumeId) { setError("Add a resume first"); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const { data } = await api.post("/ai/linkedin", { resume_id: resumeId, query: target });
      setResult(data);
    } catch (err) { setError(err.response?.data?.detail || "Failed to generate"); }
    setLoading(false);
  };

  return (
    <div className="fade-up" data-testid="li-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>LinkedIn Optimizer</h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>Premium headline, About section, and skills tuned to your role.</p>
      </div>

      {gated ? (
        <EmptyState icon="🔒" title="Premium feature" description="LinkedIn Optimizer is available on Premium and Hero plans."
          action={<Link to="/pricing"><button className="leo-btn leo-btn-primary" style={{ padding: "10px 18px" }}>Upgrade plan →</button></Link>} />
      ) : (
        <>
          <div className="leo-card" style={{ marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted }}>Resume</label>
                <select data-testid="li-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="leo-input" style={{ marginTop: 6 }}>
                  {resumes.map((r) => <option key={r.resume_id} value={r.resume_id} style={{ background: C.bgCard }}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted }}>Target role</label>
                <input data-testid="li-target" value={target} onChange={(e) => setTarget(e.target.value)} className="leo-input" style={{ marginTop: 6 }} />
              </div>
              <button data-testid="li-generate" onClick={generate} disabled={loading} className="leo-btn leo-btn-primary">{loading ? <Spinner color="#fff" /> : "✦ Optimize"}</button>
            </div>
            {error && <div style={{ marginTop: 12, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>{error}</div>}
          </div>

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="li-result">
              <div className="leo-card">
                <Badge color="accent">HEADLINE</Badge>
                <p className="font-display" style={{ fontSize: 18, fontWeight: 600, marginTop: 10, color: C.textPrimary, lineHeight: 1.4 }}>{result.headline}</p>
              </div>
              <div className="leo-card">
                <Badge color="teal">ABOUT</Badge>
                <p style={{ fontSize: 14, color: C.textPrimary, marginTop: 10, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result.about}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="leo-card">
                  <Badge color="amber">SKILLS TO ADD</Badge>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {(result.skills_to_add || []).map((s, i) => <Tag key={i}>{s}</Tag>)}
                  </div>
                </div>
                <div className="leo-card">
                  <Badge color="purple">PRO TIPS</Badge>
                  <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {(result.tips || []).map((t, i) => (
                      <li key={i} style={{ fontSize: 13, color: C.textPrimary, padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>✦ {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
