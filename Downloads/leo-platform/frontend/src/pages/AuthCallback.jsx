import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "../components/Primitives";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const sessionId = params.get("session_id");
    if (!sessionId) { navigate("/login"); return; }

    (async () => {
      try {
        const { data } = await api.get("/auth/session", { headers: { "X-Session-ID": sessionId } });
        setSessionFromToken(data.token, data.user);
        // strip hash
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (err) {
        setError(err.response?.data?.detail || "Authentication failed");
        setTimeout(() => navigate("/login"), 2000);
      }
    })();
  }, [navigate, setSessionFromToken]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Spinner size={32} />
        <p style={{ marginTop: 16, color: C.textSecondary, fontSize: 13 }}>
          {error ? `❌ ${error}` : "Completing sign-in..."}
        </p>
      </div>
    </div>
  );
}
