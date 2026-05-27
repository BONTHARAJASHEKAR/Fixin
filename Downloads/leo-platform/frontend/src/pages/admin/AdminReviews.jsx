import { useEffect, useState } from "react";
import { C } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge } from "../../components/Primitives";

const EMPTY = { author: "", role: "", company: "", quote: "", rating: 5, featured: true, avatar_url: "" };

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/reviews");
    setReviews(data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing("new"); setForm(EMPTY); setError(""); };
  const openEdit = (r) => { setEditing(r.review_id); setForm(r); setError(""); };
  const close = () => { setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const payload = { ...form, rating: Number(form.rating) };
      if (editing === "new") await api.post("/admin/reviews", payload);
      else await api.put(`/admin/reviews/${editing}`, payload);
      close(); await load();
    } catch (err) { setError(err.response?.data?.detail || "Save failed"); }
    setSaving(false);
  };

  const del = async (r) => {
    if (!window.confirm(`Delete review by ${r.author}?`)) return;
    await api.delete(`/admin/reviews/${r.review_id}`); load();
  };

  const toggleFeatured = async (r) => {
    await api.put(`/admin/reviews/${r.review_id}`, { ...r, featured: !r.featured });
    load();
  };

  return (
    <div className="fade-up" data-testid="admin-reviews-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>Reviews & Testimonials</h2>
          <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Featured reviews appear on the landing page automatically.</p>
        </div>
        <button data-testid="add-review-btn" onClick={openNew} className="leo-btn leo-btn-primary">+ New review</button>
      </div>

      {loading ? <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {reviews.map((r) => (
            <div key={r.review_id} className="leo-card" data-testid={`review-${r.review_id}`} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", fontWeight: 700, display: "grid", placeItems: "center" }}>
                    {r.author[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{r.author}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{r.role} · {r.company}</div>
                  </div>
                </div>
                <Badge color={r.featured ? "teal" : "red"}>{r.featured ? "LIVE" : "DRAFT"}</Badge>
              </div>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 12, minHeight: 60 }}>"{r.quote}"</p>
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < r.rating ? C.amber : C.textMuted, fontSize: 13 }}>★</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button data-testid={`edit-${r.review_id}`} onClick={() => openEdit(r)} className="leo-btn leo-btn-ghost" style={{ flex: 1, fontSize: 11, padding: 8 }}>Edit</button>
                <button onClick={() => toggleFeatured(r)} className="leo-btn" style={{ padding: "8px 12px", fontSize: 11, background: r.featured ? C.redSoft : C.greenSoft, color: r.featured ? C.red : C.green, borderRadius: 8 }}>{r.featured ? "Unpublish" : "Publish"}</button>
                <button onClick={() => del(r)} className="leo-btn" style={{ padding: "8px 12px", fontSize: 11, background: C.redSoft, color: C.red, borderRadius: 8 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="leo-card" style={{ width: "100%", maxWidth: 520, padding: 28 }} data-testid="review-modal">
            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{editing === "new" ? "Add" : "Edit"} review</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input required placeholder="Author name" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="leo-input" data-testid="review-author" />
              <input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="leo-input" />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="leo-input" />
              <input type="number" min={1} max={5} placeholder="Rating 1-5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="leo-input" />
              <textarea required placeholder="Quote" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={4} className="leo-input" style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid="review-quote" />
              <input placeholder="Avatar URL (optional)" value={form.avatar_url || ""} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="leo-input" style={{ gridColumn: "1 / -1" }} />
              <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSecondary }}>
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} style={{ accentColor: C.accent }} />
                Show on landing page (featured)
              </label>
            </div>
            {error && <div style={{ marginTop: 12, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={close} className="leo-btn leo-btn-ghost">Cancel</button>
              <button data-testid="review-save" type="submit" disabled={saving} className="leo-btn leo-btn-primary">{saving ? <Spinner color="#fff" /> : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
