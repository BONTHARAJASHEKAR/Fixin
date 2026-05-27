import { useEffect, useState } from "react";
import { C, fmt } from "../../lib/tokens";
import api from "../../lib/api";
import { StatCard, Spinner, ProgressBar, Badge } from "../../components/Primitives";
import { BarChart } from "../../components/Charts";

export default function AdminConversion() {
  const [d, setD] = useState(null);
  const [j, setJ] = useState(null);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([api.get("/admin/conversion"), api.get("/admin/jobs-analytics")]);
      setD(a.data); setJ(b.data);
    })();
  }, []);

  if (!d || !j) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;

  const planColor = (p) => ({ free: "purple", basic: "accent", premium: "teal", hero: "amber" }[p] || "accent");

  return (
    <div className="fade-up" data-testid="admin-conversion-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Conversion & Jobs Intelligence</h2>
      <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 20 }}>Free → Paid conversion · ATS-driven upgrades · Job engagement</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard testid="kpi-free-to-paid" label="Free → Paid conversion" value={`${d.free_to_paid_pct}%`} icon="📈" color={C.teal} />
        <StatCard testid="kpi-upgrade-after-ats" label="Upgrade after free ATS" value={`${d.upgrade_after_ats_pct}%`} icon="🎯" color={C.accent} />
        <StatCard testid="kpi-used-free-ats" label="Users who tried ATS" value={fmt(d.used_free_ats)} icon="🔍" color={C.amber} />
        <StatCard testid="kpi-used-jobs" label="Used Job Discovery" value={fmt(d.used_jobs)} icon="🧲" color={C.purple} />
        <StatCard testid="kpi-most-popular" label="Most popular plan" value={d.most_popular_plan?.toUpperCase()} icon="⭐" color={C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Conversion funnel</h3>
          {[
            { stage: "Total users (signed up)", count: d.total_users, color: C.blue },
            { stage: "Used free ATS scan", count: d.used_free_ats, color: C.accent },
            { stage: "Used Job Discovery", count: d.used_jobs, color: C.amber },
            { stage: "Upgraded to paid", count: d.paid_users, color: C.teal },
            { stage: "Paid AFTER ATS", count: d.paid_with_ats, color: C.green },
          ].map((s, i) => {
            const pct = d.total_users ? Math.round((s.count / d.total_users) * 100) : 0;
            return (
              <div key={s.stage} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{i + 1}. {s.stage}</span>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>{fmt(s.count)} <span style={{ color: C.textMuted }}>· {pct}%</span></span>
                </div>
                <ProgressBar value={pct} color={s.color} />
              </div>
            );
          })}
        </div>

        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Plan breakdown</h3>
          {d.plan_counts.map((p) => {
            const pct = d.total_users ? Math.round((p.count / d.total_users) * 100) : 0;
            return (
              <div key={p.plan} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                <Badge color={planColor(p.plan)}>{p.plan?.toUpperCase()}</Badge>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{fmt(p.count)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Top searched skills</h3>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>From job discovery matches</p>
          {j.top_skills.length === 0 ? <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p> : (
            j.top_skills.map((s, i) => (
              <div key={s.skill} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.textPrimary }}>{i + 1}. {s.skill}</span>
                <Badge color="accent">{s.count}</Badge>
              </div>
            ))
          )}
        </div>

        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Top companies in matches</h3>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>Companies appearing most often</p>
          {j.top_companies.length === 0 ? <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p> : (
            j.top_companies.map((c, i) => (
              <div key={c.company} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.textPrimary }}>{i + 1}. {c.company}</span>
                <Badge color="teal">{c.count}</Badge>
              </div>
            ))
          )}
        </div>

        <div className="leo-card" style={{ gridColumn: "1 / -1" }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Job source breakdown</h3>
          {j.source_breakdown.length === 0 ? <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p> : (
            <BarChart data={j.source_breakdown.map((s) => ({ label: s.source, value: s.count, color: C.accent }))} height={140} />
          )}
        </div>
      </div>
    </div>
  );
}
