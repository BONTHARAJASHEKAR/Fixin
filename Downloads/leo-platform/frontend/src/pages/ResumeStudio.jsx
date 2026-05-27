import { useEffect, useState } from "react";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Badge, Spinner, EmptyState } from "../components/Primitives";

export default function ResumeStudio() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { const { data } = await api.get("/resumes"); setResumes(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", name || file.name);
        form.append("target_role", targetRole);
        await api.post("/resumes/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/resumes", { name, content, target_role: targetRole });
      }
      setShowCreate(false); setName(""); setContent(""); setFile(null); setTargetRole("");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save resume");
    }
    setSubmitting(false);
  };

  const activate = async (id) => { await api.post(`/resumes/${id}/activate`); await load(); };
  const remove = async (id) => { if (window.confirm("Delete this resume?")) { await api.delete(`/resumes/${id}`); await load(); } };

  return (
    <div className="fade-up" data-testid="resume-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Resume Studio</h1>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>Upload, manage, and version your resumes. Set the active one for ATS scans.</p>
        </div>
        <button data-testid="add-resume-btn" onClick={() => setShowCreate(true)} className="leo-btn leo-btn-primary">+ Add resume</button>
      </div>

      {loading ? <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>
        : resumes.length === 0 ? (
          <EmptyState icon="📄" title="No resumes yet" description="Upload your first resume to start optimizing it for ATS systems."
            action={<button onClick={() => setShowCreate(true)} className="leo-btn leo-btn-primary" style={{ padding: "10px 18px" }}>+ Upload your first resume</button>} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {resumes.map((r) => (
              <div key={r.resume_id} className="leo-card hover" data-testid={`resume-card-${r.resume_id}`} style={{ position: "relative" }}>
                {r.is_active && <div style={{ position: "absolute", top: 12, right: 12 }}><Badge color="teal">ACTIVE</Badge></div>}
                <div style={{ fontSize: 22, marginBottom: 10 }}>📄</div>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: C.textPrimary }}>{r.name}</h3>
                {r.target_role && <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Target: {r.target_role}</p>}
                <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14, lineHeight: 1.5, height: 36, overflow: "hidden" }}>
                  {(r.content || "").slice(0, 100)}...
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!r.is_active && <button data-testid={`activate-${r.resume_id}`} onClick={() => activate(r.resume_id)} className="leo-btn leo-btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>Set active</button>}
                  <button onClick={() => remove(r.resume_id)} className="leo-btn" style={{ fontSize: 11, padding: "6px 10px", background: C.redSoft, color: C.red, borderRadius: 8, border: `1px solid rgba(255,77,109,0.3)` }}>Delete</button>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 12 }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
          <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} className="leo-card" style={{ width: "100%", maxWidth: 540, padding: 28 }} data-testid="resume-modal">
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Add a resume</h3>

            <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Resume name</label>
            <input data-testid="resume-name" required value={name} onChange={(e) => setName(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} placeholder="e.g. Senior Frontend Resume v3" />

            <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Target role (optional)</label>
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} placeholder="e.g. Senior Frontend Engineer" />

            <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Upload PDF / DOCX / TXT</label>
            <input data-testid="resume-file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: 14, color: C.textSecondary, fontSize: 12 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textMuted, fontSize: 11, marginBottom: 8 }}>
              <span style={{ flex: 1, height: 1, background: C.border }} /> OR PASTE TEXT <span style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <textarea data-testid="resume-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your resume content here..." rows={8} className="leo-input" style={{ resize: "vertical", marginBottom: 14, fontFamily: "monospace", fontSize: 12 }} />

            {error && <div style={{ padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowCreate(false)} className="leo-btn leo-btn-ghost">Cancel</button>
              <button data-testid="resume-save" type="submit" disabled={submitting || (!file && !content)} className="leo-btn leo-btn-primary">
                {submitting ? <Spinner color="#fff" /> : "Save resume"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
