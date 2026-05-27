import { useState } from "react";
import { Link } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, EmptyState } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function InterviewPrep() {
  const { user } = useAuth();
  const [role, setRole] = useState("Software Engineer");
  const [level, setLevel] = useState("mid");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");

  const gated = !["premium", "hero"].includes(user?.plan);

  const generate = async () => {
    setError(""); setLoading(true); setQuestions([]);
    try {
      const { data } = await api.post("/ai/interview", { role, level, company: company || null });
      setQuestions(data.questions || []);
    } catch (err) { setError(err.response?.data?.detail || "Failed to generate questions"); }
    setLoading(false);
  };

  return (
    <div className="fade-up" data-testid="interview-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Interview Prep</h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>Role-specific, AI-generated interview questions with tips.</p>
      </div>

      {gated ? (
        <EmptyState icon="🔒" title="Premium feature" description="Interview Prep is available on Premium and Hero plans."
          action={<Link to="/pricing"><button className="leo-btn leo-btn-primary" style={{ padding: "10px 18px" }}>Upgrade plan →</button></Link>} />
      ) : (
        <>
          <div className="leo-card" style={{ marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Target role</label>
                <input data-testid="iv-role" value={role} onChange={(e) => setRole(e.target.value)} className="leo-input" style={{ marginTop: 6 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Level</label>
                <select data-testid="iv-level" value={level} onChange={(e) => setLevel(e.target.value)} className="leo-input" style={{ marginTop: 6 }}>
                  <option value="junior" style={{ background: C.bgCard }}>Junior</option>
                  <option value="mid" style={{ background: C.bgCard }}>Mid</option>
                  <option value="senior" style={{ background: C.bgCard }}>Senior</option>
                  <option value="staff" style={{ background: C.bgCard }}>Staff+</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Company (optional)</label>
                <input data-testid="iv-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Meta, Razorpay..." className="leo-input" style={{ marginTop: 6 }} />
              </div>
              <button data-testid="iv-generate" onClick={generate} disabled={loading} className="leo-btn leo-btn-primary" style={{ padding: "12px 18px", fontSize: 13 }}>
                {loading ? <Spinner color="#fff" /> : "✦ Generate"}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>{error}</div>}
          </div>

          {loading && <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, i) => {
              const color = q.category === "technical" ? "accent" : q.category === "coding" ? "teal" : q.category === "system_design" ? "amber" : "purple";
              return (
                <div key={i} className="leo-card hover" data-testid={`iv-q-${i}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <Badge color={color}>{q.category?.replace("_", " ")}</Badge>
                    <span style={{ fontSize: 11, color: C.textMuted }}>Q{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.6, fontWeight: 500 }}>{q.question}</p>
                  {q.tips && (
                    <div style={{ marginTop: 12, padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginRight: 6 }}>TIP</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{q.tips}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
