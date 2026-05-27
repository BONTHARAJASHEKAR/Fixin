import { useEffect, useState } from "react";
import { C, fmt, fmtINR } from "../../lib/tokens";
import api from "../../lib/api";
import { StatCard, Spinner, Badge } from "../../components/Primitives";
import { LineChart, DonutChart, BarChart, SparkLine } from "../../components/Charts";

export default function AdminOverview() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/admin/overview"); setD(data); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;
  if (!d) return null;

  return (
    <div className="fade-up" data-testid="admin-overview">
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard testid="kpi-users" label="Total Users" value={fmt(d.total_users)} icon="👥" color={C.accent} change="+12.4%" />
        <StatCard testid="kpi-revenue" label="Total Revenue" value={fmtINR(d.total_revenue_inr)} icon="💰" color={C.teal} change="+24%" />
        <StatCard testid="kpi-mrr" label="MRR" value={fmtINR(d.mrr_inr)} icon="📈" color={C.amber} change="+8.2%" />
        <StatCard testid="kpi-scans" label="ATS Scans" value={fmt(d.total_ats_scans)} icon="🎯" color={C.purple} change="+18%" />
        <StatCard testid="kpi-ai" label="AI Calls" value={fmt(d.ai_calls)} icon="✦" color={C.blue} change="+32%" />
        <StatCard testid="kpi-payments" label="Successful payments" value={d.successful_payments} icon="✓" color={C.green} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Platform Growth</h3>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Users · Revenue · Scans — last 12 months</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ label: "Users", color: C.accent }, { label: "Revenue", color: C.teal }, { label: "Scans", color: C.amber }].map((l) => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSecondary }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} /> {l.label}
                </span>
              ))}
            </div>
          </div>
          <LineChart
            labels={d.months}
            datasets={[
              { data: d.user_growth.map((v) => v / Math.max(1, Math.max(...d.user_growth)) * 100), color: C.accent },
              { data: d.revenue_series.map((v) => v / Math.max(1, Math.max(...d.revenue_series)) * 100), color: C.teal },
              { data: d.scan_series.map((v) => v / Math.max(1, Math.max(...d.scan_series)) * 100), color: C.amber },
            ]}
            height={200}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingLeft: 4 }}>
            {d.months.map((m) => <span key={m} style={{ fontSize: 10, color: C.textMuted }}>{m}</span>)}
          </div>
        </div>

        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Subscription Mix</h3>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>{fmt(d.total_users)} total users</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <DonutChart
              size={130}
              segments={d.plan_breakdown.map((p, i) => ({
                color: [C.textMuted, C.accent, C.teal, C.amber][i % 4],
                value: Math.max(1, p.users),
              }))}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.plan_breakdown.map((p, i) => {
              const color = [C.textMuted, C.accent, C.teal, C.amber][i % 4];
              const pct = ((p.users / Math.max(1, d.total_users)) * 100).toFixed(1);
              return (
                <div key={p.plan} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.textPrimary }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} /> {p.name}
                  </span>
                  <span style={{ color: C.textSecondary }}>{fmt(p.users)} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="leo-card" style={{ marginTop: 18 }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Platform highlights</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { label: "Resumes uploaded", value: fmt(d.total_resumes), icon: "📄", color: C.accent },
            { label: "AI rewrites processed", value: fmt(d.ai_calls), icon: "✦", color: C.purple },
            { label: "ATS reports", value: fmt(d.total_ats_scans), icon: "🎯", color: C.teal },
            { label: "Blocked users", value: d.blocked_users, icon: "🚫", color: C.red },
            { label: "Failed payments", value: d.failed_payments, icon: "⚠", color: C.amber },
          ].map((h) => (
            <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${h.color}1f`, color: h.color, display: "grid", placeItems: "center" }}>{h.icon}</div>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{h.label}</div>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }}>{h.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
