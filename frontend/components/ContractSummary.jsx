import React from "react";
import { AlertTriangle, ShieldCheck, Layers, AlertOctagon } from "lucide-react";

export default function ContractSummary({ importantClauses = [] }) {
  const totalRisky = importantClauses.length;

  const highRisks = importantClauses.filter(
    (c) => c.risk_level?.toUpperCase() === "HIGH"
  ).length;
  
  const medRisks = importantClauses.filter(
    (c) => c.risk_level?.toUpperCase() === "MEDIUM"
  ).length;

  const lowRisks = importantClauses.filter(
    (c) => c.risk_level?.toUpperCase() === "LOW"
  ).length;

  // Calculate overall risk score
  // If no risky clauses, score is 0. Otherwise average of criticality scores, or weighted
  let overallScore = 0;
  if (totalRisky > 0) {
    const totalScore = importantClauses.reduce((acc, curr) => {
      // Use criticality_score if available (0-100), otherwise fallback
      const score = curr.criticality_score !== undefined ? curr.criticality_score : 
                    (curr.risk_level?.toUpperCase() === "HIGH" ? 85 : 
                     curr.risk_level?.toUpperCase() === "MEDIUM" ? 50 : 20);
      return acc + score;
    }, 0);
    overallScore = Math.round(totalScore / totalRisky);
  }

  // Get risk rating text
  let riskRating = "Low Risk";
  let ratingColor = "text-emerald-400";
  let ratingBg = "bg-emerald-950/20 border-emerald-900/40";
  if (overallScore >= 70) {
    riskRating = "Critical Risk";
    ratingColor = "text-red-400";
    ratingBg = "bg-red-950/20 border-red-900/40";
  } else if (overallScore >= 40) {
    riskRating = "Moderate Risk";
    ratingColor = "text-amber-400";
    ratingBg = "bg-amber-950/20 border-amber-900/40";
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Risk Score Gauge */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-400 mb-4">Overall Risk Score</h4>
        <div className="relative flex h-36 w-36 items-center justify-center">
          {/* Circular progress bar background */}
          <svg className="absolute h-full w-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              className={`transition-all duration-1000 ${
                overallScore >= 70 ? "stroke-red-500" : overallScore >= 40 ? "stroke-amber-500" : "stroke-emerald-500"
              }`}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - overallScore / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="text-center z-10">
            <span className="text-4xl font-extrabold text-white">{overallScore}</span>
            <span className="text-sm text-slate-500 block">/ 100</span>
          </div>
        </div>
        <div className={`mt-4 px-3 py-1 rounded-full border text-xs font-semibold ${ratingColor} ${ratingBg}`}>
          {riskRating}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
        {/* Total Clauses */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">Total Analyzed</span>
            <Layers className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">20</span>
            <span className="text-xs text-slate-500 block mt-1">Sections from document tree</span>
          </div>
        </div>

        {/* Risky Clauses */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">Risky Clauses</span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{totalRisky}</span>
            <span className="text-xs text-slate-500 block mt-1">Clauses requiring attention</span>
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">Risk Severity Breakdown</span>
            <AlertOctagon className="h-5 w-5 text-red-400" />
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-400 font-semibold">High Risk</span>
              <span className="text-white font-bold">{highRisks}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold">Medium Risk</span>
              <span className="text-white font-bold">{medRisks}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">Low Risk</span>
              <span className="text-white font-bold">{lowRisks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
