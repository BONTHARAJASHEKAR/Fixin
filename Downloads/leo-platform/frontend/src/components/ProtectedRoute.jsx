import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../lib/tokens";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg }} data-testid="auth-loading">
        <div style={{
          width: 28, height: 28, border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }
  if (!user) {
    const target = adminOnly ? "/admin/login" : "/login";
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }
  if (adminOnly && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
