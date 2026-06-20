import React, { useMemo } from "react";
import { AlertCircle, ArrowRightLeft, Sparkles } from "lucide-react";

export default function ConflictPanel({ importantClauses = [] }) {
  // Aggregate conflicts across all clauses
  const conflicts = useMemo(() => {
    const list = [];
    const seen = new Set();

    importantClauses.forEach((clause) => {
      if (clause.cross_clause_conflicts && Array.isArray(clause.cross_clause_conflicts)) {
        clause.cross_clause_conflicts.forEach((conflict) => {
          if (!conflict.simple_conflict_reason) return;

          // Unique key to prevent duplicates
          const betweenKey = [...(conflict.conflict_between || [])].sort().join("||");

          if (betweenKey && !seen.has(betweenKey)) {
            seen.add(betweenKey);
            
            // Extract Clause A and B
            const items = conflict.conflict_between || [];
            list.push({
              clauseA: items[0] || clause.section_title || "Current Clause",
              clauseB: items[1] || "Another clause in contract",
              explanation: conflict.simple_conflict_reason
            });
          }
        });
      }
    });

    return list;
  }, [importantClauses]);

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 mb-3 shadow-inner">
          <Sparkles className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">No Contradictions Detected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          No conflicting clauses or obligations were detected in the analyzed sections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conflicts.map((conflict, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-red-900/30 bg-gradient-to-r from-red-950/10 to-transparent p-5 shadow-sm"
        >
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950/40 border border-red-800/40 text-red-400">
              <ArrowRightLeft className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">
                  Contradictory Obligation
                </span>
                
                {/* Visual conflict between A and B */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-300 font-semibold bg-slate-950 border border-slate-800/40 p-3 rounded-lg">
                  <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                    Clause A
                  </div>
                  <span className="text-slate-100">{conflict.clauseA}</span>
                  <div className="text-indigo-400 font-bold shrink-0 self-center hidden sm:block">⚡ VS</div>
                  <div className="text-indigo-400 font-bold shrink-0 block sm:hidden">⚡ VS</div>
                  <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                    Clause B
                  </div>
                  <span className="text-slate-100">{conflict.clauseB}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Conflict Explanation
                </span>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/20">
                  {conflict.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
