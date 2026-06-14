import React from "react";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-12 md:pt-28 md:pb-16 text-center">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="absolute top-1/3 left-1/3 -z-10 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[80px]" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-900 bg-indigo-950/40 px-3.5 py-1 text-xs font-semibold text-indigo-400 mb-6 shadow-sm shadow-indigo-950/50">
          <Sparkles className="h-3.5 w-3.5" />
          Next-Gen Legal intelligence
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Contract<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent">Lens</span>
        </h1>
        
        <p className="mt-4 text-xl sm:text-2xl font-semibold text-slate-200 max-w-2xl mx-auto">
          AI-Powered Contract Risk Detection and Legal Analysis
        </p>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Upload any contract and instantly identify legal risks, hidden obligations, arbitration concerns, 
          payment issues, termination risks, liability transfers, and conflicting clauses in seconds.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            Vectorless RAG Retrieval
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            PageIndex.ai Hierarchy Tree
          </div>
        </div>
      </div>
    </section>
  );
}
