import { useEffect, useState } from "react";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, EmptyState } from "../components/Primitives";

const STATUSES = [
  { id: "applied", label: "Applied", color: "blue" },
  { id: "screening", label: "Screening", color: "accent" },
  { id: "interview", label: "Interview", color: "amber" },
  { id: "offer", label: "Offer", color: "green" },
  { id: "rejected", label: "Rejected", color: "red" },
];

export default function AppTracker() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, by_status: {}, interview_rate: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied", location: "", salary: "", notes: "", job_url: "" });

  const load = async () => {
    const [a, s] = await Promise.all([api.get("/tracker"), api.get("/tracker/stats")]);
    setApps(a.data); setStats(s.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/tracker", form);
    setShowCreate(false);
    setForm({ company: "", role: "", status: "applied", location: "", salary: "", notes: "", job_url: "" });
    load();
  };

  const move = async (id, status) => { await api.patch(`/tracker/${id}`, { company: "", role: "", status }); load(); };
  const del = async (id) => { if (window.confirm("Delete this application?")) { await api.delete(`/tracker/${id}`); load(); } };

  return (
    <div className="fade-up" data-testid="tracker-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Application Tracker</h1>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>{stats.total} total · {stats.interview_rate}% interview rate</p>
        </div>
        <button data-testid="add-app-btn" onClick={() => setShowCreate(true)} className="leo-btn leo-btn-primary">+ Add application</button>
      </div>

      {loading ? <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>
        : apps.length === 0 ? (
          <EmptyState icon="📊" title="No applications yet" description="Track every application from first apply to offer letter."
            action={<button onClick={() => setShowCreate(true)} className="leo-btn leo-btn-primary" style={{ padding: "10px 18px" }}>+ Add your first one</button>} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, overflowX: "auto" }}>
            {STATUSES.map((s) => {
              const items = apps.filter((a) => a.status === s.id);
              return (
                <div key={s.id} style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, minHeight: 200, padding: 12 }} data-testid={`column-${s.id}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <Badge color={s.color}>{s.label}</Badge>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{items.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((a) => (
                      <div key={a.app_id} className="leo-card" data-testid={`app-${a.app_id}`} style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{a.role}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{a.company}{a.location ? ` · ${a.location}` : ""}</div>
                        {a.salary && <div style={{ fontSize: 11, color: C.teal, marginTop: 4 }}>{a.salary}</div>}
                        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                          <select value={a.status} onChange={(e) => move(a.app_id, e.target.value)} style={{
                            background: "rgba(255,255,255,0.04)", color: C.textSecondary,
                            border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, padding: "3px 6px",
                          }}>
                            {STATUSES.map((x) => <option key={x.id} value={x.id} style={{ background: C.bgCard }}>{x.label}</option>)}
                          </select>
                          <button onClick={() => del(a.app_id)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 11 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="leo-card" style={{ width: "100%", maxWidth: 480, padding: 24 }}>
            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Add application</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input data-testid="app-company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className="leo-input" />
              <input data-testid="app-role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role" className="leo-input" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="leo-input" />
              <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Salary (e.g. 30L)" className="leo-input" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="leo-input" style={{ gridColumn: "1 / -1" }}>
                {STATUSES.map((s) => <option key={s.id} value={s.id} style={{ background: C.bgCard }}>{s.label}</option>)}
              </select>
              <input value={form.job_url} onChange={(e) => setForm({ ...form, job_url: e.target.value })} placeholder="Job URL" className="leo-input" style={{ gridColumn: "1 / -1" }} />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} className="leo-input" style={{ gridColumn: "1 / -1", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setShowCreate(false)} className="leo-btn leo-btn-ghost">Cancel</button>
              <button data-testid="app-save" type="submit" className="leo-btn leo-btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
