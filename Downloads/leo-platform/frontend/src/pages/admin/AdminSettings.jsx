import { useEffect, useState } from "react";
import { C } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge } from "../../components/Primitives";

const FIELDS = [
  { key: "price_inr", label: "Price (INR)", type: "number" },
  { key: "ats_quota", label: "ATS scans / month", type: "number" },
  { key: "ai_quota", label: "AI calls / month", type: "number" },
  { key: "jobs_per_day", label: "Jobs / day", type: "number" },
];

const FLAGS = [
  { key: "startup_priority", label: "Startup priority feed" },
  { key: "ai_rewrite", label: "AI resume rewrite" },
  { key: "hiring_probability", label: "Hiring probability" },
  { key: "interview_prep", label: "Interview prep AI" },
  { key: "linkedin_optimizer", label: "LinkedIn optimizer" },
];

export default function AdminSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/plans");
    setPlans(data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setField = (planId, key, value) => {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, [key]: value } : p));
  };

  const addFeature = (planId) => {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, features: [...(p.features || []), "New feature"] } : p));
  };

  const editFeature = (planId, idx, value) => {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, features: p.features.map((f, i) => i === idx ? value : f) } : p));
  };

  const removeFeature = (planId, idx) => {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, features: p.features.filter((_, i) => i !== idx) } : p));
  };

  const save = async (plan) => {
    setSaving(plan.id); setMsg("");
    try {
      const payload = { name: plan.name, features: plan.features, sources: plan.sources };
      FIELDS.forEach((f) => payload[f.key] = Number(plan[f.key]));
      FLAGS.forEach((f) => payload[f.key] = !!plan[f.key]);
      await api.put(`/admin/plans/${plan.id}`, payload);
      setMsg(`✓ ${plan.name} plan updated`);
    } catch (err) { setMsg(`Failed: ${err.response?.data?.detail || err.message}`); }
    setSaving(null);
    setTimeout(() => setMsg(""), 3000);
  };

  const reset = async (plan) => {
    if (!window.confirm(`Reset ${plan.name} to defaults?`)) return;
    setSaving(plan.id);
    try { await api.delete(`/admin/plans/${plan.id}/overrides`); await load(); }
    finally { setSaving(null); }
  };

  if (loading) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;

  return (
    <div className="fade-up" data-testid="admin-settings-page">
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>Pricing & Plans</h2>
          <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Edit pricing, quotas, sources, features — changes are live instantly. No code deploys required.</p>
        </div>
        {msg && <Badge color={msg.startsWith("✓") ? "green" : "red"}>{msg}</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
        {plans.map((plan) => (
          <div key={plan.id} className="leo-card" data-testid={`plan-editor-${plan.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</h3>
                <code style={{ fontSize: 11, color: C.textMuted }}>{plan.id}</code>
              </div>
              <Badge color={plan.id === "premium" ? "accent" : plan.id === "hero" ? "amber" : "teal"}>
                ₹{plan.price_inr}/mo
              </Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{f.label}</label>
                  <input
                    data-testid={`field-${plan.id}-${f.key}`}
                    type={f.type}
                    value={plan[f.key] ?? 0}
                    onChange={(e) => setField(plan.id, f.key, e.target.value)}
                    className="leo-input"
                    style={{ marginTop: 4, padding: "8px 10px", fontSize: 13 }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {FLAGS.map((f) => (
                <label key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: C.textPrimary }}>
                  {f.label}
                  <input
                    data-testid={`flag-${plan.id}-${f.key}`}
                    type="checkbox"
                    checked={!!plan[f.key]}
                    onChange={(e) => setField(plan.id, f.key, e.target.checked)}
                    style={{ accentColor: C.accent }}
                  />
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Features (bulleted on landing/pricing)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(plan.features || []).map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 6 }}>
                    <input value={f} onChange={(e) => editFeature(plan.id, i, e.target.value)} className="leo-input" style={{ padding: "7px 10px", fontSize: 12 }} />
                    <button onClick={() => removeFeature(plan.id, i)} className="leo-btn" style={{ padding: "0 10px", background: C.redSoft, color: C.red, borderRadius: 6, fontSize: 12 }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addFeature(plan.id)} className="leo-btn leo-btn-ghost" style={{ padding: "7px", fontSize: 11 }}>+ Add feature</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button data-testid={`save-${plan.id}`} onClick={() => save(plan)} disabled={saving === plan.id} className="leo-btn leo-btn-primary" style={{ flex: 1, padding: "10px", fontSize: 12 }}>
                {saving === plan.id ? <Spinner color="#fff" /> : "Save changes"}
              </button>
              <button onClick={() => reset(plan)} disabled={saving === plan.id} className="leo-btn leo-btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>Reset</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
