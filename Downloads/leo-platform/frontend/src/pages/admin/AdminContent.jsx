import { useEffect, useState } from "react";
import { C } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge } from "../../components/Primitives";

const FIELDS = [
  { key: "hero_badge", label: "Hero badge text", multiline: false },
  { key: "hero_title_line1", label: "Hero title (line 1)", multiline: false },
  { key: "hero_title_line2", label: "Hero title (line 2, gradient)", multiline: false },
  { key: "hero_subtitle", label: "Hero subtitle", multiline: true },
  { key: "hero_cta", label: "Hero CTA button text", multiline: false },
  { key: "stat_1_label", label: "Stat 1 label", multiline: false },
  { key: "stat_1_value", label: "Stat 1 value", multiline: false },
  { key: "stat_2_label", label: "Stat 2 label", multiline: false },
  { key: "stat_2_value", label: "Stat 2 value", multiline: false },
  { key: "stat_3_label", label: "Stat 3 label", multiline: false },
  { key: "stat_3_value", label: "Stat 3 value", multiline: false },
  { key: "stat_4_label", label: "Stat 4 label", multiline: false },
  { key: "stat_4_value", label: "Stat 4 value", multiline: false },
  { key: "footer_tagline", label: "Footer tagline", multiline: false },
];

export default function AdminContent() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const r = await api.get("/admin/content");
      setData(r.data); setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const r = await api.put("/admin/content", data);
      setData(r.data); setMsg("✓ Landing page updated");
    } catch (err) { setMsg(`Failed: ${err.response?.data?.detail || err.message}`); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  if (loading) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;

  return (
    <div className="fade-up" data-testid="admin-content-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>Landing Page Content</h2>
          <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Edit hero copy, CTA, stats and footer. Changes go live the instant you save.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <Badge color={msg.startsWith("✓") ? "green" : "red"}>{msg}</Badge>}
          <button data-testid="save-content" onClick={save} disabled={saving} className="leo-btn leo-btn-primary">{saving ? <Spinner color="#fff" /> : "Save all"}</button>
        </div>
      </div>

      <div className="leo-card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>{f.label}</label>
              {f.multiline ? (
                <textarea data-testid={`field-${f.key}`} value={data[f.key] || ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} rows={3} className="leo-input" style={{ resize: "vertical", fontSize: 13 }} />
              ) : (
                <input data-testid={`field-${f.key}`} value={data[f.key] || ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} className="leo-input" style={{ fontSize: 13 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
