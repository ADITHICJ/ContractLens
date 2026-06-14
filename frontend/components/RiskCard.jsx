import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { RISK_LEVELS } from "../lib/constants";

export default function RiskCard({ clause }) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedLevel = clause.risk_level?.toUpperCase() || "LOW";
  const levelConfig = RISK_LEVELS[normalizedLevel] || RISK_LEVELS.LOW;

  const confidencePct = clause.confidence !== undefined 
    ? Math.round(clause.confidence * 100) 
    : 100;

  return (
    <div className={`rounded-xl border bg-slate-900/40 transition-all duration-300 shadow-sm ${levelConfig.borderClass} ${levelConfig.glowClass}`}>
      {/* Header (Always Visible) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-slate-950/40 ${levelConfig.textClass} ${levelConfig.borderClass}`}>
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              {clause.section_title || "Unnamed Section"}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <RiskBadge level={clause.risk_level} />
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-semibold text-slate-400 capitalize">
                Type: {clause.risk_type || "General"}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-400">
                Page {clause.page !== undefined ? clause.page : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence Indicator */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-500">Confidence</span>
            <span className="text-xs font-bold text-slate-300">{confidencePct}%</span>
          </div>
          
          <button className="text-slate-500 hover:text-slate-300 transition-colors">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isOpen && (
        <div className="border-t border-slate-800/60 p-5 space-y-4 bg-slate-950/20">
          {/* Simple Explanation */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Why It Matters (Simple Explanation)
            </span>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/40">
              {clause.simple_reason || clause.legal_reason || "No explanation provided."}
            </p>
          </div>

          {/* Legal Explanation (if available) */}
          {clause.legal_reason && clause.legal_reason !== clause.simple_reason && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Legal Reason / Context
              </span>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/20">
                {clause.legal_reason}
              </p>
            </div>
          )}

          {/* Recommendation */}
          {clause.recommendation && (
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Recommendation
              </span>
              <p className="text-sm text-indigo-300 leading-relaxed bg-indigo-950/20 p-3.5 rounded-lg border border-indigo-900/30 font-medium">
                {clause.recommendation}
              </p>
            </div>
          )}

          {/* Quotes if available */}
          {clause.highlighted_quotes && clause.highlighted_quotes.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Original Quote(s)
              </span>
              <div className="space-y-1.5">
                {clause.highlighted_quotes.map((item, idx) => (
                  <div key={idx} className="text-xs text-slate-400 italic bg-slate-950 border-l-2 border-slate-700 p-2.5 rounded-r-md">
                    "{item.quote}" (Page {item.page})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
