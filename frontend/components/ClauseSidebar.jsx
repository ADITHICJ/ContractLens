import React from "react";
import RiskBadge from "./RiskBadge";
import { RISK_LEVELS } from "../lib/constants";
import { Sparkles, FileWarning, Lightbulb, AlertTriangle } from "lucide-react";

export default function ClauseSidebar({ importantClauses = [], currentPage }) {
  // Find clauses matching current page
  const pageClauses = importantClauses.filter(
    (clause) =>
      Number(clause.page) === Number(currentPage) ||
      clause.highlighted_quotes?.some(
        q => Number(q.page || clause.page) === Number(currentPage)
      )
  );

  return (
    <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 text-white select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            AI Explanation Sidebar
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
            Explaining Page {currentPage}
          </span>
        </div>
        <div className="px-2 py-0.5 rounded-full border border-indigo-900 bg-indigo-950/40 text-[10px] font-bold text-indigo-400">
          {pageClauses.length} {pageClauses.length === 1 ? "Issue" : "Issues"} Found
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-900/40 scroll-smooth">
        {pageClauses.length > 0 ? (
          pageClauses.map((clause, idx) => {
            const levelConfig = RISK_LEVELS[clause.risk_level?.toUpperCase()] || RISK_LEVELS.LOW;
            return (
              <div
                key={idx}
                className={`rounded-xl border bg-slate-950/40 p-4 space-y-3 shadow-md transition-all duration-300 ${levelConfig.borderClass}`}
              >
                {/* Title and Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-white leading-tight">
                    {clause.section_title || "Risk Item"}
                  </h4>
                  <RiskBadge level={clause.risk_level} />
                </div>

                {/* Risk Type */}
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                  Category: {clause.risk_type || "General"}
                </span>

                {/* Original Quote */}
                {clause.highlighted_quotes &&
                  clause.highlighted_quotes.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-2">
                        Original Quotes:
                      </span>

                      <div className="space-y-2">
                        {clause.highlighted_quotes.map(
                          (quoteObj, quoteIdx) => (
                            <p
                              key={quoteIdx}
                              className="text-xs text-slate-400 italic bg-slate-950/80 border-l border-slate-800 p-2 rounded-r-md"
                            >
                              "{quoteObj.quote}"
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Explanation */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    Why It Matters:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 p-2.5 rounded-md border border-slate-850">
                    {clause.simple_reason || clause.legal_reason}
                  </p>
                </div>

                {/* Recommendation */}
                {clause.recommendation && (
                  <div className="border-t border-indigo-900/20 pt-2.5">
                    <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mb-1">
                      <Lightbulb className="h-3 w-3" />
                      Recommendation:
                    </span>
                    <p className="text-xs text-indigo-300 leading-relaxed bg-indigo-950/20 p-2.5 rounded-md border border-indigo-900/20">
                      {clause.recommendation}
                    </p>
                  </div>
                )}

                {/* Conflicts if present */}
                {clause.cross_clause_conflicts && clause.cross_clause_conflicts.length > 0 && (
                  <div className="border-t border-red-900/20 pt-2.5">
                    <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Contradicts other clauses:
                    </span>
                    {clause.cross_clause_conflicts.map((conflict, cIdx) => (
                      <p key={cIdx} className="text-xs text-red-300 leading-relaxed bg-red-950/15 p-2.5 rounded-md border border-red-900/20 mb-1">
                        {conflict.simple_conflict_reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-500 mb-3">
              <FileWarning className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-400">No Risks Identified on Page {currentPage}</h4>
            <p className="text-[10px] text-slate-500 mt-1 max-w-xs px-4">
              Scroll to a different page of the contract to inspect other clauses and AI explanations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
