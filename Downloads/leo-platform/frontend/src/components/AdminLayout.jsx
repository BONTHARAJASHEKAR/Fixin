import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { C } from "../lib/tokens";
import { Logo, Badge } from "./Primitives";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/admin/overview", icon: "⚡", label: "Overview" },
  { to: "/admin/conversion", icon: "📈", label: "Conversion" },
  { to: "/admin/users", icon: "👥", label: "User Analytics" },
  { to: "/admin/revenue", icon: "💰", label: "Revenue" },
  { to: "/admin/subscriptions", icon: "📋", label: "Subscriptions" },
  { to: "/admin/ats", icon: "🎯", label: "ATS Analytics" },
  { to: "/admin/traffic", icon: "📊", label: "Traffic" },
  { to: "/admin/activity", icon: "🔥", label: "User Activity" },
  { to: "/admin/system", icon: "🖥", label: "System Health" },
  { to: "/admin/manage", icon: "🛠", label: "User Management" },
  { to: "/admin/settings", icon: "💎", label: "Pricing Editor" },
  { to: "/admin/reviews", icon: "⭐", label: "Reviews" },
  { to: "/admin/content", icon: "✏️", label: "Landing Content" },
  { to: "/admin/notifications", icon: "🔔", label: "Alerts", badge: 4 },
];

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  return (
    <aside style={{
      width: collapsed ? 76 : 240, transition: "width 0.25s",
      background: C.bgCard, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0,
    }} data-testid="admin-sidebar">
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {collapsed ? (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800 }}>L</div>
        ) : (
          <div>
            <Logo size={28} />
            <div style={{ fontSize: 10, color: C.amber, marginTop: 6, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Admin Console</div>
          </div>
        )}
        <button onClick={onToggle} className="leo-btn" style={{ padding: 6, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textMuted }} data-testid="admin-sidebar-toggle">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav style={{ padding: 12, flex: 1, overflowY: "auto" }}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 12px", borderRadius: 10, marginBottom: 4,
              color: isActive ? C.textPrimary : C.textSecondary,
              background: isActive ? C.accentSoft : "transparent",
              borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
              textDecoration: "none", fontSize: 13, fontWeight: 500,
            })}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
            {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            {!collapsed && item.badge && <Badge color="red">{item.badge}</Badge>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Signed in as</div>
          <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>{user?.role}</div>
        </div>
      )}
    </aside>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px", borderBottom: `1px solid ${C.border}`,
      background: "rgba(10,11,15,0.6)", backdropFilter: "blur(20px)",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Admin Control Center</h1>
        <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Live · Platform-wide intelligence</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.greenSoft, borderRadius: 100, fontSize: 11, color: C.green, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} /> All systems operational
        </span>
        <button data-testid="admin-logout-btn" onClick={async () => { await logout(); navigate("/admin/login"); }} className="leo-btn leo-btn-ghost" style={{ fontSize: 12 }}>Sign out · {user?.email}</button>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ padding: "28px 32px" }} data-testid="admin-main"><Outlet /></div>
      </main>
    </div>
  );
}
