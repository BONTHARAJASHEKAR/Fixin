import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { ScoreRing, Badge, Spinner, Tag, EmptyState } from "../components/Primitives";

const SAMPLE_JD = `We are looking for a Senior Frontend Engineer with 4+ years of experience in React, TypeScript, and modern web technologies.

Requirements:
• Expert in React.js, Next.js, TypeScript
• Strong understanding of REST APIs and GraphQL
• Experience with state management (Redux, Zustand, or Recoil)
• Proficiency in CSS-in-JS and Tailwind CSS
• Knowledge of CI/CD pipelines and Docker
• Experience with unit testing (Jest, React Testing Library)
• Strong problem-solving and communication skills`;

export default function ATSEngine() {
  const [tab, setTab] = useState("analyze");
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [jd, setJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/resumes");
      setResumes(data);
      const active = data.find((r) => r.is_active) || data[0];
      if (active) setResumeId(active.resume_id);
    })();
  }, []);

  const analyze = async () => {
    if (!jd.trim() || !resumeId) { setError("Pick a resume and paste a job description."); return; }
    setError(""); setAnalyzing(true); setResult(null);
    try {
      const { data } = await api.post("/ats/analyze", { resume_id: resumeId, job_description: jd });
      setResult(data); setTab("result");
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed");
    }
    setAnalyzing(false);
  };

  return (
    <div className="fade-up" data-testid="ats-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>ATS Engine</h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>Analyze your resume against any job description with military-grade ATS intelligence.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[{ id: "analyze", label: "JD Matcher" }, { id: "result", label: "Analysis Report" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="leo-btn" data-testid={`tab-${t.id}`}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: tab === t.id ? C.accentSoft : "rgba(255,255,255,0.04)",
              border: `1px solid ${tab === t.id ? C.accent : C.border}`,
              color: tab === t.id ? C.accent : C.textSecondary,
            }}>{t.label}</button>
        ))}
      </div>

      {tab === "analyze" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {/* Resume picker */}
          <div className="leo-card">
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Choose resume</h3>
            {resumes.length === 0 ? (
              <EmptyState icon="📄" title="No resumes yet" description="Upload one to start analyzing."
                action={<Link to="/resume"><button className="leo-btn leo-btn-primary" style={{ padding: "10px 16px" }}>Upload resume</button></Link>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {resumes.map((r) => (
                  <label key={r.resume_id} data-testid={`pick-${r.resume_id}`} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: 12,
                    borderRadius: 10, cursor: "pointer",
                    background: resumeId === r.resume_id ? C.accentSoft : "rgba(255,255,255,0.02)",
                    border: `1px solid ${resumeId === r.resume_id ? C.accent : C.border}`,
                  }}>
                    <input type="radio" checked={resumeId === r.resume_id} onChange={() => setResumeId(r.resume_id)} style={{ accentColor: C.accent }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{r.target_role || "No target role"}</div>
                    </div>
                    {r.is_active && <Badge color="teal">ACTIVE</Badge>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* JD input */}
          <div className="leo-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Job description</h3>
              <button data-testid="jd-sample-btn" onClick={() => setJd(SAMPLE_JD)} className="leo-btn" style={{ fontSize: 11, padding: "4px 10px", background: C.accentSoft, color: C.accent, borderRadius: 6 }}>Use sample</button>
            </div>
            <textarea data-testid="jd-textarea" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here..."
              rows={12} className="leo-input" style={{ resize: "vertical", fontSize: 13, lineHeight: 1.6 }} />
            {error && <div style={{ padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12, marginTop: 12 }}>{error}</div>}
            <button data-testid="analyze-btn" onClick={analyze} disabled={analyzing} className="leo-btn leo-btn-primary" style={{ width: "100%", marginTop: 14, padding: "12px", fontSize: 13 }}>
              {analyzing ? <><Spinner color="#fff" /> Analyzing with GPT-5.2...</> : "✦ Run ATS analysis"}
            </button>
          </div>
        </div>
      )}

      {tab === "result" && (
        <>
          {!result ? <EmptyState icon="🎯" title="No analysis yet" description="Run an analysis first to see your report." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }} data-testid="ats-result">
              <div className="leo-card" style={{ display: "flex", gap: 28, alignItems: "center" }}>
                <ScoreRing score={result.match_score} size={130} strokeWidth={12} color={C.accent} label="Match" />
                <ScoreRing score={result.ats_score} size={130} strokeWidth={12} color={C.teal} label="ATS Score" />
                <div style={{ flex: 1 }}>
                  <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Your resume scored {result.ats_score}/100</h3>
                  <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                    Match rate <strong style={{ color: C.accent }}>{result.match_score}%</strong>. Below is what's already strong and what needs work.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div className="leo-card">
                  <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                    ✓ Keywords present <Badge color="green">{result.keywords_present.length}</Badge>
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.keywords_present.map((k, i) => <Tag key={i}><span style={{ color: C.green }}>✓</span>{k}</Tag>)}
                  </div>
                </div>
                <div className="leo-card">
                  <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                    ✕ Keywords missing <Badge color="red">{result.keywords_missing.length}</Badge>
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.keywords_missing.map((k, i) => <Tag key={i}><span style={{ color: C.red }}>✕</span>{k}</Tag>)}
                  </div>
                </div>
              </div>

              <div className="leo-card">
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>✦ AI suggestions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(result.suggestions || []).map((s, i) => {
                    const color = s.type === "add" ? C.green : s.type === "rewrite" ? C.amber : C.red;
                    return (
                      <div key={i} style={{ display: "flex", gap: 12, padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                        <Badge color={s.type === "add" ? "green" : s.type === "rewrite" ? "amber" : "red"}>{s.type.toUpperCase()}</Badge>
                        <p style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5, flex: 1 }}>{s.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
