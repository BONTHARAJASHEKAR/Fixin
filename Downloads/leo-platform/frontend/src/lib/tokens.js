// Shared design tokens (mirror of the artifact palette).
export const C = {
  bg: "#0A0B0F",
  bgCard: "#111318",
  bgElevated: "#16181F",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.15)",
  accent: "#6C63FF",
  accentGlow: "rgba(108,99,255,0.3)",
  accentSoft: "rgba(108,99,255,0.12)",
  teal: "#00D4AA",
  tealSoft: "rgba(0,212,170,0.12)",
  amber: "#F5A623",
  amberSoft: "rgba(245,166,35,0.12)",
  red: "#FF4D6D",
  redSoft: "rgba(255,77,109,0.12)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.12)",
  purple: "#A78BFA",
  purpleSoft: "rgba(167,139,250,0.12)",
  blue: "#38BDF8",
  blueSoft: "rgba(56,189,248,0.12)",
  textPrimary: "#F0F0F5",
  textSecondary: "#8B8B9E",
  textMuted: "#4A4A60",
};

export const fmt = (n) => {
  if (n == null) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
};

export const fmtINR = (n) => {
  if (n == null) return "₹0";
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + "Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + "L";
  if (n >= 1e3) return "₹" + (n / 1e3).toFixed(1) + "K";
  return "₹" + n;
};
