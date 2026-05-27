import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../../lib/tokens";
import { Logo, Spinner } from "../../components/Primitives";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await login(email, password);
      if (!["admin", "super_admin"].includes(u.role)) {
        setError("Not an admin account."); setLoading(false); return;
      }
      navigate("/admin/overview");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 24 }} className="leo-bg-grid">
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo size={36} /></Link>
        <div className="leo-card" style={{ padding: 36, border: `1px solid ${C.amber}`, boxShadow: `0 0 32px ${C.amberSoft}` }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: C.amber, letterSpacing: "0.18em", fontWeight: 700 }}>ADMIN ACCESS</div>
            <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: C.textPrimary }}>Control Center</h1>
            <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>Restricted area · Internal use only</p>
          </div>

          <form onSubmit={submit}>
            <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Admin email</label>
            <input data-testid="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} />
            <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Password</label>
            <input data-testid="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="leo-input" />

            {error && <div data-testid="admin-error" style={{ marginTop: 14, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>⚠ {error}</div>}

            <button data-testid="admin-login-submit" type="submit" disabled={loading} className="leo-btn leo-btn-primary" style={{ width: "100%", marginTop: 18, padding: 13 }}>
              {loading ? <Spinner color="#fff" /> : "🔐 Sign in to admin"}
            </button>
          </form>

          <p style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: C.textMuted }}>
          </p>
        </div>
      </div>
    </div>
  );
}
