import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { C } from "../lib/tokens";
import { Logo } from "./Primitives";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/dashboard", icon: "⚡", label: "Dashboard" },
  { to: "/resume", icon: "📄", label: "Resume Studio" },
  { to: "/ats", icon: "🎯", label: "ATS Engine" },
  { to: "/jobs", icon: "🔍", label: "Job Discovery" },
  { to: "/interview", icon: "🎤", label: "Interview Prep" },
  { to: "/career", icon: "🧠", label: "Career Intelligence" },
  { to: "/tracker", icon: "📊", label: "App Tracker" },
  { to: "/linkedin", icon: "💼", label: "LinkedIn Optimizer" },
];

function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside style={{
      width: collapsed ? 76 : 240, transition: "width 0.25s",
      background: C.bgCard, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0,
      flexShrink: 0,
    }} data-testid="user-sidebar">
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {collapsed ? (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
            display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontFamily: "Syne",
          }}>L</div>
        ) : <Logo size={28} />}
        <button onClick={onToggle} className="leo-btn" style={{
          padding: 6, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textMuted,
        }} data-testid="sidebar-toggle">{collapsed ? "›" : "‹"}</button>
      </div>

      <nav style={{ padding: 12, flex: 1, overflowY: "auto" }}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 12px", borderRadius: 10, marginBottom: 4,
              color: isActive ? C.textPrimary : C.textSecondary,
              background: isActive ? C.accentSoft : "transparent",
              borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
              textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "background 0.15s",
            })}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        {!collapsed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {user?.picture ? (
                <img src={user.picture} alt={user.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 13,
                }}>{initials}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{user?.plan || "free"} plan</div>
              </div>
            </div>
            <button data-testid="logout-btn" onClick={async () => { await logout(); navigate("/"); }} className="leo-btn leo-btn-ghost" style={{ width: "100%", padding: "8px 12px", fontSize: 12 }}>Sign out</button>
          </>
        ) : (
          <button onClick={async () => { await logout(); navigate("/"); }} className="leo-btn" style={{
            width: "100%", padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textMuted,
          }} title="Sign out">↩</button>
        )}
      </div>
    </aside>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main style={{ flex: 1, minWidth: 0, padding: "32px 36px" }} data-testid="user-main">
        <Outlet />
      </main>
    </div>
  );
}
