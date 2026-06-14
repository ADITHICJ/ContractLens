"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import ContractSummary from "../../../components/ContractSummary";
import RiskList from "../../../components/RiskList";
import ConflictPanel from "../../../components/ConflictPanel";
import FloatingChatButton from "../../../components/FloatingChatButton";
import ContractChatDrawer from "../../../components/ContractChatDrawer";
import PageLoader from "../../../components/PageLoader";
import { useAnalysis } from "../../../hooks/useAnalysis";
import { FileText, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const documentId = params.documentId;
  const { data, isLoading, error } = useAnalysis(documentId);
  const [chatOpen, setChatOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageLoader message="Analyzing contract sections and compiling dashboard..." />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <p className="text-red-400 font-bold mb-2">Error loading contract analysis</p>
          <p className="text-slate-500 text-sm max-w-md">
            Could not retrieve the analysis file for this document ID. Please verify the backend is running and the document ID is valid.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Back to Upload
          </Link>
        </div>
      </>
    );
  }

  const importantClauses = data.important_clauses || [];

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 select-none">
        
        {/* Page Title & Dashboard Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Contract Intelligence Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Doc ID: <span className="font-mono text-slate-500">{documentId}</span>
            </p>
          </div>
          <Link
            href={`/contract-review/${documentId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 active:scale-95 transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Open Evidence Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* SECTION 1: Contract Summary */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            1. Contract Health & Metrics
          </h2>
          <ContractSummary importantClauses={importantClauses} />
        </section>

        {/* SECTION 2: Risk Analysis */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-400" />
            2. Identified Risks & Negotiation Redlines
          </h2>
          <RiskList importantClauses={importantClauses} />
        </section>

        {/* SECTION 3: Conflict Detection */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-indigo-400" />
            3. Cross-Clause Contradiction Mapping
          </h2>
          <ConflictPanel importantClauses={importantClauses} />
        </section>

        {/* SECTION 4: View Contract Evidence CTA */}
        <section className="border border-indigo-900/30 bg-gradient-to-r from-indigo-950/20 via-transparent to-transparent rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">4. View Contract Evidence Workspace</h3>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Inspect the original uploaded contract PDF alongside page-synced AI explanations. As you scroll, 
              the sidebar automatically highlights relevant risky clauses on that page.
            </p>
          </div>
          <Link
            href={`/contract-review/${documentId}`}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-all duration-200"
          >
            Open Evidence Workspace
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </section>

      </main>

      {/* Floating Contract AI Chat Assistant */}
      <FloatingChatButton onClick={() => setChatOpen(!chatOpen)} isOpen={chatOpen} />
      <ContractChatDrawer documentId={documentId} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
