import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../lib/tokens";
import { Logo, Spinner } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally { setLoading(false); }
  };

  const googleAuth = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 24 }} className="leo-bg-grid">
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo size={36} /></Link>
        <div className="leo-card" style={{ padding: 36 }}>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24 }}>Sign in to continue optimizing your career.</p>

          <button onClick={googleAuth} data-testid="google-login-btn" className="leo-btn leo-btn-ghost" style={{ width: "100%", marginBottom: 14, padding: "12px" }}>
            <span style={{ fontSize: 14 }}>🔐</span> Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: C.textMuted, fontSize: 11 }}>
            <span style={{ flex: 1, height: 1, background: C.border }} /> OR <span style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <form onSubmit={submit}>
            <label style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, display: "block" }}>Email</label>
            <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} placeholder="you@example.com" />
            <label style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, display: "block" }}>Password</label>
            <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="leo-input" placeholder="••••••••" />

            {error && (
              <div data-testid="login-error" style={{ marginTop: 14, padding: 10, background: C.redSoft, border: `1px solid rgba(255,77,109,0.3)`, borderRadius: 8, fontSize: 12, color: C.red }}>
                {error}
              </div>
            )}

            <button data-testid="login-submit" type="submit" disabled={loading} className="leo-btn leo-btn-primary" style={{ width: "100%", marginTop: 18, padding: "13px" }}>
              {loading ? <Spinner color="#fff" /> : "Sign in"} →
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: C.textMuted }}>
            New to Leomote? <Link to="/signup" data-testid="link-signup" style={{ color: C.accent, textDecoration: "none", fontWeight: 600 }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
