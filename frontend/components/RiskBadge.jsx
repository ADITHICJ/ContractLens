import React from "react";
import { RISK_LEVELS } from "../lib/constants";

export default function RiskBadge({ level }) {
  const normalizedLevel = level?.toUpperCase() || "LOW";
  const config = RISK_LEVELS[normalizedLevel] || RISK_LEVELS.LOW;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${config.badgeBg}`}>
      {config.label}
    </span>
  );
}
