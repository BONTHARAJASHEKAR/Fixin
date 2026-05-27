import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../lib/tokens";
import { Logo, Spinner } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  const googleAuth = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 24 }} className="leo-bg-grid">
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo size={36} /></Link>
        <div className="leo-card" style={{ padding: 36 }}>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>Create your account</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24 }}>Free forever. No card needed.</p>

          <button onClick={googleAuth} data-testid="google-signup-btn" className="leo-btn leo-btn-ghost" style={{ width: "100%", marginBottom: 14, padding: "12px" }}>
            <span style={{ fontSize: 14 }}>🔐</span> Continue with Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: C.textMuted, fontSize: 11 }}>
            <span style={{ flex: 1, height: 1, background: C.border }} /> OR <span style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <form onSubmit={submit}>
            <label style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, display: "block" }}>Full name</label>
            <input data-testid="signup-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} placeholder="Arjun Sharma" />
            <label style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, display: "block" }}>Email</label>
            <input data-testid="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="leo-input" style={{ marginBottom: 14 }} placeholder="you@example.com" />
            <label style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, display: "block" }}>Password</label>
            <input data-testid="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="leo-input" placeholder="At least 6 characters" />

            {error && (
              <div data-testid="signup-error" style={{ marginTop: 14, padding: 10, background: C.redSoft, border: `1px solid rgba(255,77,109,0.3)`, borderRadius: 8, fontSize: 12, color: C.red }}>{error}</div>
            )}

            <button data-testid="signup-submit" type="submit" disabled={loading} className="leo-btn leo-btn-primary" style={{ width: "100%", marginTop: 18, padding: "13px" }}>
              {loading ? <Spinner color="#fff" /> : "Create account"} →
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: C.textMuted }}>
            Already have an account? <Link to="/login" data-testid="link-login" style={{ color: C.accent, textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
