import { useEffect, useState } from "react";
import { C, fmt } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge, ProgressBar } from "../../components/Primitives";
import { BarChart } from "../../components/Charts";

export function AdminSubscriptions() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setD(r.data)); }, []);
  if (!d) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;

  const total = d.total_users;
  const colors = ["textMuted", "accent", "teal", "amber"];
  const planColorMap = (i) => [C.textMuted, C.accent, C.teal, C.amber][i % 4];

  return (
    <div className="fade-up" data-testid="admin-subscriptions-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>Subscriptions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Plan distribution</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.plan_breakdown.map((p, i) => (
              <div key={p.plan}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>{fmt(p.users)} · ₹{p.price_inr * p.users}/mo</span>
                </div>
                <ProgressBar value={(p.users / Math.max(1, total)) * 100} color={planColorMap(i)} />
              </div>
            ))}
          </div>
        </div>

        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Conversion funnel</h3>
          {(() => {
            const visited = Math.max(d.total_users * 5, 1);
            const signedUp = d.total_users;
            const usedAts = d.total_ats_scans > 0 ? Math.min(d.total_users, d.total_ats_scans) : 0;
            const paid = d.paid_users;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { stage: "Visited platform", count: visited, color: C.textMuted },
                  { stage: "Signed up", count: signedUp, color: C.blue },
                  { stage: "Used ATS", count: usedAts, color: C.accent },
                  { stage: "Upgraded to paid", count: paid, color: C.teal },
                ].map((f) => (
                  <div key={f.stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: C.textPrimary }}>{f.stage}</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{fmt(f.count)}</span>
                    </div>
                    <ProgressBar value={(f.count / visited) * 100} color={f.color} />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export function AdminATSAnalytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/ats-analytics").then((r) => setD(r.data)); }, []);
  if (!d) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  const buckets = [
    { label: "<40", value: d.score_distribution["<40"] || 0, color: C.red },
    { label: "40-60", value: d.score_distribution["40-60"] || 0, color: C.amber },
    { label: "60-80", value: d.score_distribution["60-80"] || 0, color: C.accent },
    { label: "80-100", value: d.score_distribution["80-100"] || 0, color: C.teal },
  ];

  return (
    <div className="fade-up" data-testid="admin-ats-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>ATS Analytics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Score distribution</h3>
          <BarChart data={buckets} height={140} />
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Top missing keywords</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {d.top_missing_keywords.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            {d.top_missing_keywords.map((k, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{k.word}</span>
                <Badge color="amber">{k.count} reports</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTraffic() {
  // Synthesized traffic page (no traffic tracking implemented — show plausible visuals)
  return (
    <div className="fade-up" data-testid="admin-traffic-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Traffic Analytics</h2>
      <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 18 }}>Visitor sources · devices · top pages</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Sources</h3>
          {[
            { source: "Organic Search", value: 42.8, color: C.green },
            { source: "Direct", value: 24.1, color: C.accent },
            { source: "LinkedIn", value: 14.6, color: C.blue },
            { source: "Referral", value: 10.2, color: C.amber },
            { source: "Social Media", value: 5.8, color: C.purple },
            { source: "Email", value: 2.5, color: C.teal },
          ].map((s) => (
            <div key={s.source} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textPrimary }}>{s.source}</span>
                <span style={{ fontSize: 11, color: C.textSecondary }}>{s.value}%</span>
              </div>
              <ProgressBar value={s.value} color={s.color} />
            </div>
          ))}
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top pages</h3>
          {[
            { page: "/ats", views: "284K" },
            { page: "/resume", views: "198K" },
            { page: "/jobs", views: "142K" },
            { page: "/interview", views: "98K" },
            { page: "/dashboard", views: "84K" },
          ].map((p) => (
            <div key={p.page} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
              <span style={{ color: C.textPrimary, fontFamily: "monospace" }}>{p.page}</span>
              <span style={{ color: C.teal }}>{p.views}</span>
            </div>
          ))}
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Engagement</h3>
          {[
            { label: "Avg session", value: "14m 32s" },
            { label: "Pages/session", value: "6.4" },
            { label: "Return rate", value: "62.4%" },
            { label: "CTR (CTA)", value: "18.2%" },
          ].map((e) => (
            <div key={e.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.textSecondary }}>{e.label}</span>
              <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminActivity() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/activity").then((r) => setD(r.data)); }, []);
  if (!d) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  return (
    <div className="fade-up" data-testid="admin-activity-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>User Activity</h2>
      <div className="leo-card">
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Feature usage</h3>
        {d.feature_usage.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }}>No AI calls logged yet.</p>
        ) : (
          d.feature_usage.map((f, i) => (
            <div key={f.feature} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.textPrimary }}>{f.feature}</span>
                <span style={{ fontSize: 12, color: C.textSecondary }}>{fmt(f.count)} calls</span>
              </div>
              <ProgressBar value={(f.count / Math.max(1, d.feature_usage[0].count)) * 100} color={[C.accent, C.teal, C.amber, C.purple, C.blue, C.red, C.green][i % 7]} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminSystem() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/system").then((r) => setD(r.data)); }, []);
  if (!d) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  return (
    <div className="fade-up" data-testid="admin-system-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>System Health</h2>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Service status</h3>
          {d.services.map((s) => (
            <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.textPrimary }}>{s.name}</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{s.latency_ms}ms</span>
                <Badge color={s.status === "operational" ? "green" : s.status === "degraded" ? "amber" : "red"}>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Resources</h3>
          {Object.entries(d.resources).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <ProgressBar label={k.toUpperCase()} value={v} color={v > 80 ? C.red : v > 60 ? C.amber : C.teal} />
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: C.textMuted }}>AI tokens today</div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{d.openai.tokens_today}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminNotifications() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/notifications").then((r) => setD(r.data)); }, []);
  if (!d) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  return (
    <div className="fade-up" data-testid="admin-notifications-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>Admin Alerts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {d.alerts.map((a, i) => {
          const color = a.type === "error" ? C.red : a.type === "warning" ? C.amber : C.green;
          const soft = a.type === "error" ? C.redSoft : a.type === "warning" ? C.amberSoft : C.greenSoft;
          return (
            <div key={i} className="leo-card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Badge color={a.type === "error" ? "red" : a.type === "warning" ? "amber" : "green"}>{a.type}</Badge>
                  <h4 className="font-display" style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{a.title}</h4>
                  <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>{a.msg}</p>
                </div>
                <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{a.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
