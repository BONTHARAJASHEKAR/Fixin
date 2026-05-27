import { useEffect, useState } from "react";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { user, refresh } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/payments/history"); setHistory(data); } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fade-up" data-testid="settings-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>Account, plan, and billing.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Account</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Row label="Name" value={user?.name} />
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={user?.role} />
            <Row label="Member since" value={user?.created_at?.slice(0, 10)} />
          </div>
        </div>
        <div className="leo-card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Plan</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Row label="Current" value={<Badge color="accent">{user?.plan?.toUpperCase()}</Badge>} />
            <Row label="ATS scans used" value={user?.ats_scans_used} />
            <Row label="AI calls used" value={user?.ai_rewrites_used} />
            <Row label="Renews on" value={user?.plan_expires_at?.slice(0, 10) || "—"} />
          </div>
          <button data-testid="refresh-account" onClick={refresh} className="leo-btn leo-btn-ghost" style={{ marginTop: 14, fontSize: 12 }}>Refresh</button>
        </div>
      </div>

      <div className="leo-card" style={{ marginTop: 18 }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Billing history</h3>
        {loading ? <Spinner size={20} /> : history.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }}>No payments yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {["Date", "Plan", "Amount", "Method", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.payment_id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 12px" }}>{p.created_at?.slice(0, 10)}</td>
                  <td style={{ padding: "10px 12px" }}>{p.plan}</td>
                  <td style={{ padding: "10px 12px", color: C.teal, fontWeight: 600 }}>₹{p.amount_inr}</td>
                  <td style={{ padding: "10px 12px" }}>{p.method}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Badge color={p.status === "success" ? "green" : p.status === "failed" ? "red" : "amber"}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}
