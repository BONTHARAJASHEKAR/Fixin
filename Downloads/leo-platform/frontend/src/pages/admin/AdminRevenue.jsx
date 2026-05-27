import { useEffect, useState } from "react";
import { C, fmt, fmtINR } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge } from "../../components/Primitives";
import { LineChart } from "../../components/Charts";

export default function AdminRevenue() {
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, p] = await Promise.all([api.get("/admin/overview"), api.get("/admin/payments")]);
      setOverview(o.data); setPayments(p.data); setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>;

  return (
    <div className="fade-up" data-testid="admin-revenue-page">
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Revenue Analytics</h2>
      <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 18 }}>Razorpay · Subscription revenue intelligence</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Monthly revenue (12 months)</h3>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Total: {fmtINR(overview.total_revenue_inr)}</p>
          <LineChart labels={overview.months}
            datasets={[{ data: overview.revenue_series, color: C.teal }]} height={180} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {overview.months.map((m) => <span key={m} style={{ fontSize: 10, color: C.textMuted }}>{m}</span>)}
          </div>
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Stats</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Row label="Total revenue" value={fmtINR(overview.total_revenue_inr)} color={C.teal} />
            <Row label="MRR" value={fmtINR(overview.mrr_inr)} color={C.accent} />
            <Row label="Successful" value={overview.successful_payments} color={C.green} />
            <Row label="Failed" value={overview.failed_payments} color={C.red} />
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="leo-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Recent transactions</h3>
          <span style={{ fontSize: 12, color: C.textMuted }}>{payments.length} payments</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.02)" }}>
                {["Order ID", "User", "Email", "Plan", "Amount", "Method", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id} className="row-hover" data-testid={`pay-${p.payment_id}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>{(p.razorpay_order_id || p.payment_id).slice(0, 16)}</td>
                  <td style={{ padding: "12px 16px" }}>{p.user_name}</td>
                  <td style={{ padding: "12px 16px", color: C.textSecondary }}>{p.user_email}</td>
                  <td style={{ padding: "12px 16px" }}><Badge color="accent">{p.plan?.toUpperCase()}</Badge></td>
                  <td style={{ padding: "12px 16px", color: C.teal, fontWeight: 600 }}>₹{p.amount_inr}</td>
                  <td style={{ padding: "12px 16px" }}>{p.method}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge color={p.status === "success" ? "green" : p.status === "failed" ? "red" : "amber"}>{p.status}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.textSecondary }}>{p.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No transactions yet.</div>}
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
      <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
