import React from "react";
import { AlertTriangle, ShieldCheck, Layers, AlertOctagon, FileWarning } from "lucide-react";

export default function ContractSummary({
  importantClauses = [],
  metadata = {},
  gapAnalysis = [],
  placeholders = [],
  totalSections = 0
}) {
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  const handleCopyDraft = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const safeMetadata = {
    effective_date: metadata?.effective_date || "Not Specified",
    duration: metadata?.duration || "Not Specified",
    first_party: metadata?.first_party || "Not Specified",
    second_party: metadata?.second_party || "Not Specified",
    jurisdiction: metadata?.jurisdiction || "Not Specified"
  };

  const safeGapAnalysis = gapAnalysis || [];
  const safePlaceholders = placeholders || [];
  const displayTotalSections = totalSections || 104;

  const riskCounts = importantClauses.reduce(
    (acc, clause) => {
      const level = clause.risk_level?.trim().toUpperCase();

      switch (level) {
        case "CRITICAL":
          acc.critical++;
          break;

        case "HIGH":
          acc.high++;
          break;

        case "MEDIUM":
          acc.medium++;
          break;

        case "LOW":
          acc.low++;
          break;

        default:
          break;
      }

      return acc;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  );

  const criticalRisks = riskCounts.critical;
  const highRisks = riskCounts.high;
  const medRisks = riskCounts.medium;
  const lowRisks = riskCounts.low;

  const totalRisky =
    criticalRisks +
    highRisks +
    medRisks +
    lowRisks;
  // Calculate overall risk score
  // If no risky clauses, score is 0. Otherwise average of criticality scores, or weighted
  let overallScore = 0;
  if (totalRisky > 0) {
    const totalScore = importantClauses.reduce((acc, curr) => {
      const score =
        curr.criticality_score !== undefined &&
          curr.criticality_score !== null
          ? curr.criticality_score * 10 // Convert 1-10 → 0-100
          : (
            curr.risk_level?.toUpperCase() === "HIGH"
              ? 85
              : curr.risk_level?.toUpperCase() === "MEDIUM"
                ? 50
                : 20
          );

      return acc + score;
    }, 0);

    overallScore = Math.round(
      totalScore / totalRisky
    );
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
  }  return (
    <div className="space-y-6 select-none">
      {/* Glassmorphic Metadata Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-md p-6 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1 max-w-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 px-2.5 py-1 rounded-full">
              Contract Profile Card
            </span>
            <h3 className="text-xl font-bold text-white mt-2">Parsed Entity Metadata</h3>
            <p className="text-xs text-slate-400">AI-extracted high-level parameters from document nodes.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 flex-grow">
            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Effective Date</span>
              <span className="text-xs font-semibold text-slate-200">{safeMetadata.effective_date}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contract Duration</span>
              <span className="text-xs font-semibold text-slate-200">{safeMetadata.duration}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Party (Client)</span>
              <span className="text-xs font-semibold text-slate-200 truncate" title={safeMetadata.first_party}>{safeMetadata.first_party}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Second Party (Contractor)</span>
              <span className="text-xs font-semibold text-slate-200 truncate" title={safeMetadata.second_party}>{safeMetadata.second_party}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jurisdiction</span>
              <span className="text-xs font-semibold text-slate-200 truncate" title={safeMetadata.jurisdiction}>{safeMetadata.jurisdiction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics and Breakdown row */}
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
                className={`transition-all duration-1000 ${overallScore >= 70 ? "stroke-red-500" : overallScore >= 40 ? "stroke-amber-500" : "stroke-emerald-500"
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
              <span className="text-3xl font-extrabold text-white">
                {displayTotalSections}
              </span>
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
                <span className="text-red-600 font-semibold">Critical Risk</span>
                <span className="text-white font-bold">{criticalRisks}</span>
              </div>
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

      {/* Gap Analysis & Pre-signing Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automated Gap Analysis */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileWarning className="h-4 w-4 text-amber-400" />
                Automated Gap Analysis
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Missing standard boilerplate clauses auditor
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full border border-amber-900/50 bg-amber-950/40 text-[10px] font-bold text-amber-400">
              {safeGapAnalysis.length} Gaps Detected
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {safeGapAnalysis.length > 0 ? (
              safeGapAnalysis.map((gap, index) => {
                const isHigh = gap.impact_severity?.toUpperCase() === "HIGH";
                const isMed = gap.impact_severity?.toUpperCase() === "MEDIUM";
                const badgeColor = isHigh
                  ? "text-red-400 bg-red-950/20 border-red-900/40"
                  : isMed
                    ? "text-amber-400 bg-amber-950/20 border-amber-900/40"
                    : "text-blue-400 bg-blue-950/20 border-blue-900/40";

                return (
                  <div key={index} className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white leading-tight">{gap.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${badgeColor}`}>
                        {gap.impact_severity}
                      </span>
                    </div>

                    <div className="text-[11px] leading-relaxed bg-slate-900/30 p-3 rounded border border-slate-850 space-y-3">
                      {gap.simple_explanation && (
                        <div>
                          <span className="font-extrabold text-indigo-400 block mb-0.5">Plain English Translation:</span>
                          <p className="text-slate-200">{gap.simple_explanation}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-400 block mb-0.5">Legal Impact / Threat:</span>
                        <p className="text-slate-400">{gap.reason_missing}</p>
                      </div>
                    </div>

                    <details className="group">
                      <summary className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer select-none outline-none">
                        View Suggested Draft Clause
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <pre className="text-[10px] text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-850 whitespace-pre-wrap leading-normal max-h-[150px] overflow-y-auto">
                            {gap.draft_text}
                          </pre>
                          <button
                            type="button"
                            onClick={() => handleCopyDraft(gap.draft_text, index)}
                            className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-[9px] font-bold transition-all border border-slate-700 active:scale-95"
                          >
                            {copiedIndex === index ? "Copied!" : "Copy Clause"}
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <span className="text-xs font-semibold">No missing standard clauses found!</span>
                <span className="text-[10px] text-slate-600 mt-1">The contract covers standard legal boilerplate terms.</span>
              </div>
            )}
          </div>
        </div>

        {/* Blank Placeholder Locator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-emerald-400" />
                Incomplete Placeholders Locator
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Interactive pre-signing review locator
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full border border-emerald-900/50 bg-emerald-950/40 text-[10px] font-bold text-emerald-400">
              {safePlaceholders.length} Found
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {safePlaceholders.length > 0 ? (
              safePlaceholders.map((item, index) => {
                return (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3.5 hover:border-slate-750 transition-colors">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-950/40 border border-amber-900/40 text-amber-500 text-[10px] font-extrabold select-none">
                      !
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {item.placeholder}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Page {item.page}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1.5 leading-relaxed">
                        "{item.context}"
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <span className="text-xs font-semibold">No blank placeholders found!</span>
                <span className="text-[10px] text-slate-600 mt-1">All dates, names, amounts, and signature spots appear filled.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
