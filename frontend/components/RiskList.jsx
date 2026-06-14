import React, { useState, useMemo } from "react";
import RiskCard from "./RiskCard";
import SearchBar from "./SearchBar";
import { Filter } from "lucide-react";

export default function RiskList({ importantClauses = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");

  const filteredClauses = useMemo(() => {
    return importantClauses.filter((clause) => {
      // 1. Search Query Filter (checks title, type, simple explanation, recommendation)
      const matchesSearch = 
        (clause.section_title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clause.risk_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clause.simple_reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clause.recommendation || "").toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Risk Level Filter
      const matchesLevel = levelFilter === "ALL" || clause.risk_level?.toUpperCase() === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [importantClauses, searchQuery, levelFilter]);

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-slate-800 bg-slate-900/30 p-4 rounded-xl">
        <div className="flex-1 max-w-md">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Severity:
          </span>
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  levelFilter === level
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {level.charAt(0) + level.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clauses List */}
      {filteredClauses.length > 0 ? (
        <div className="space-y-4">
          {filteredClauses.map((clause, index) => (
            <RiskCard key={index} clause={clause} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-850 rounded-xl bg-slate-900/10">
          <p className="text-sm text-slate-505 font-medium">No risky clauses match your filters.</p>
        </div>
      )}
    </div>
  );
}
