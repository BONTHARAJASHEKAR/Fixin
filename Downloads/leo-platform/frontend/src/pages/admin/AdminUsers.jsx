import { useEffect, useState } from "react";
import { C, fmt } from "../../lib/tokens";
import api from "../../lib/api";
import { Spinner, Badge } from "../../components/Primitives";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setUsers(data); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = async (u) => {
    const action = u.is_blocked ? "unblock" : "block";
    await api.post(`/admin/users/${u.user_id}/${action}`);
    load();
  };

  const planColor = { hero: "amber", premium: "teal", basic: "accent", free: "purple" };

  return (
    <div className="fade-up" data-testid="admin-users-page">
      <div style={{ marginBottom: 18 }}>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>User Management</h2>
        <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Search · block · manage plans</p>
      </div>

      <div className="leo-card" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <input data-testid="user-search" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="🔍 Search by name or email..."
          className="leo-input" style={{ flex: 1 }} />
        <button onClick={load} data-testid="user-search-btn" className="leo-btn leo-btn-primary">Search</button>
      </div>

      {loading ? <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div> : (
        <div className="leo-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.02)" }}>
                  {["User ID", "Name", "Email", "Plan", "ATS Scans", "Joined", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="row-hover" data-testid={`urow-${u.user_id}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", color: C.textMuted, fontFamily: "monospace", fontSize: 11 }}>{u.user_id.slice(0, 12)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                          color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700,
                        }}>{(u.name || "?")[0]}</div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.textSecondary }}>{u.email}</td>
                    <td style={{ padding: "12px 16px" }}><Badge color={planColor[u.plan] || "accent"}>{u.plan?.toUpperCase()}</Badge></td>
                    <td style={{ padding: "12px 16px" }}>{u.scans}</td>
                    <td style={{ padding: "12px 16px", color: C.textSecondary }}>{u.created_at?.slice(0, 10)}</td>
                    <td style={{ padding: "12px 16px" }}><Badge color={u.is_blocked ? "red" : "green"}>{u.is_blocked ? "BLOCKED" : "ACTIVE"}</Badge></td>
                    <td style={{ padding: "12px 16px" }}>
                      {u.role !== "super_admin" && (
                        <button data-testid={`toggle-${u.user_id}`} onClick={() => toggle(u)} className="leo-btn" style={{
                          padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: u.is_blocked ? C.greenSoft : C.redSoft,
                          color: u.is_blocked ? C.green : C.red,
                          border: `1px solid ${u.is_blocked ? "rgba(34,197,94,0.3)" : "rgba(255,77,109,0.3)"}`,
                        }}>{u.is_blocked ? "Unblock" : "Block"}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No users found.</div>}
        </div>
      )}
    </div>
  );
}
