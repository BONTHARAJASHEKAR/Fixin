import { C } from "../lib/tokens";

export function SparkLine({ data = [], color = C.accent, height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

export function LineChart({ datasets = [], labels = [], height = 180 }) {
  const allVals = datasets.flatMap((d) => d.data);
  const max = (Math.max(...allVals, 0) * 1.15) || 100;
  const w = 560, h = height;
  const xStep = w / Math.max(1, labels.length - 1);
  const toY = (v) => h - (v / max) * h * 0.88 - h * 0.06;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      {[0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1="0" y1={h * t} x2={w} y2={h * t} stroke={C.border} strokeDasharray="2 4" />
      ))}
      {datasets.map((ds, di) => {
        const pts = ds.data.map((v, i) => `${i * xStep},${toY(v)}`).join(" ");
        const area = `0,${h} ${pts} ${(ds.data.length - 1) * xStep},${h}`;
        return (
          <g key={di}>
            <polygon fill={ds.color} opacity={0.07} points={area} />
            <polyline fill="none" stroke={ds.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" points={pts} />
            {ds.data.map((v, i) => (
              <circle key={i} cx={i * xStep} cy={toY(v)} r={2.5} fill={ds.color} opacity={0.85} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ data = [], color = C.accent, height = 140 }) {
  const max = Math.max(...data.map((d) => d.value), 0) * 1.1 || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, marginTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            width: "100%", maxWidth: 36, height: `${(d.value / max) * 100}%`,
            background: d.color || color, borderRadius: "6px 6px 2px 2px",
            transition: "height 1.2s cubic-bezier(.25,.8,.25,1)",
          }} />
          <span style={{ fontSize: 10, color: C.textMuted }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ segments = [], size = 110 }) {
  const r = size / 2 - 8, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth={10} fill="none" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} stroke={seg.color} strokeWidth={10} fill="none"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 1s" }} />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fill={C.textPrimary} fontSize={14} fontWeight={700} fontFamily="Syne">
        {total >= 1000 ? (total / 1000).toFixed(1) + "K" : total}
      </text>
    </svg>
  );
}
