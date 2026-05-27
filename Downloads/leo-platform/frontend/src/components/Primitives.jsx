import { C } from "../lib/tokens";

export function Badge({ children, color = "accent", size = "sm" }) {
  const palette = {
    accent: [C.accentSoft, C.accent],
    teal: [C.tealSoft, C.teal],
    amber: [C.amberSoft, C.amber],
    red: [C.redSoft, C.red],
    green: [C.greenSoft, C.green],
    purple: [C.purpleSoft, C.purple],
    blue: [C.blueSoft, C.blue],
  };
  const [bg, fg] = palette[color] || palette.accent;
  return (
    <span style={{
      background: bg, color: fg,
      padding: size === "sm" ? "3px 8px" : "5px 12px",
      borderRadius: 6, fontSize: size === "sm" ? 11 : 12,
      fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
      letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

export function Spinner({ size = 16, color = C.accent }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid rgba(255,255,255,0.1)`,
      borderTopColor: color, borderRadius: "50%", animation: "spin 0.85s linear infinite",
      display: "inline-block",
    }} />
  );
}

export function ScoreRing({ score = 0, size = 120, strokeWidth = 10, color = C.accent, label }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.25,.8,.25,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div className="font-display" style={{ fontSize: size * 0.32, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
          {Math.round(score)}
        </div>
        {label && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, color = C.accent, label, sublabel }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        {label && <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{label}</span>}
        <span style={{ fontSize: 12, color: C.textSecondary }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100, transition: "width 1.2s cubic-bezier(.25,.8,.25,1)" }} />
      </div>
      {sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

export function StatCard({ label, value, change, icon, color = C.accent, testid }) {
  const up = !change || !String(change).startsWith("-");
  return (
    <div className="leo-card hover" data-testid={testid}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${color}1f`, color,
          display: "grid", placeItems: "center", fontSize: 16,
        }}>{icon}</div>
        {change && (
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600,
            background: up ? C.greenSoft : C.redSoft, color: up ? C.green : C.red,
          }}>{up ? "↑" : "↓"} {String(change).replace("-", "")}</span>
        )}
      </div>
      <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>{label}</div>
    </div>
  );
}

export function Tag({ children, removable, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6, fontSize: 12,
      background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
      color: C.textSecondary,
    }}>
      {children}
      {removable && (
        <button onClick={onRemove} style={{
          background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 0, fontSize: 14,
        }}>×</button>
      )}
    </span>
  );
}

export function Logo({ size = 32 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
        display: "grid", placeItems: "center", color: "#fff",
        fontWeight: 800, fontSize: size * 0.5, fontFamily: "'Syne', sans-serif",
        boxShadow: `0 0 32px ${C.accentGlow}`,
      }}>L</div>
      <span className="font-display" style={{ fontSize: size * 0.55, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Leomote</span>
    </div>
  );
}

export function EmptyState({ icon = "✦", title, description, action }) {
  return (
    <div style={{
      padding: 40, textAlign: "center", color: C.textMuted,
      border: `1px dashed ${C.border}`, borderRadius: 16,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>{icon}</div>
      <div className="font-display" style={{ fontSize: 18, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: action ? 18 : 0 }}>{description}</div>}
      {action}
    </div>
  );
}
