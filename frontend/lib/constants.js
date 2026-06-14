export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const RISK_LEVELS = {
  HIGH: {
    label: "High Risk",
    badgeBg: "bg-red-950/40 text-red-400 border-red-800/60",
    textClass: "text-red-400",
    borderClass: "border-red-900/50",
    glowClass: "shadow-red-950/20",
    color: "#ef4444"
  },
  MEDIUM: {
    label: "Medium Risk",
    badgeBg: "bg-amber-950/40 text-amber-400 border-amber-800/60",
    textClass: "text-amber-400",
    borderClass: "border-amber-900/50",
    glowClass: "shadow-amber-950/20",
    color: "#f59e0b"
  },
  LOW: {
    label: "Low Risk",
    badgeBg: "bg-emerald-950/40 text-emerald-400 border-emerald-800/60",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-900/50",
    glowClass: "shadow-emerald-950/20",
    color: "#10b981"
  }
};
