"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("../../../components/PDFViewer"), {
  ssr: false,
});
import ClauseSidebar from "../../../components/ClauseSidebar";
import FloatingChatButton from "../../../components/FloatingChatButton";
import ContractChatDrawer from "../../../components/ContractChatDrawer";
import PageLoader from "../../../components/PageLoader";
import { getPDFUrl } from "../../../lib/api";
import { useAnalysis } from "../../../hooks/useAnalysis";
import { LayoutDashboard, ArrowLeft } from "lucide-react";

export default function ContractReviewPage() {
  const params = useParams();
  const documentId = params.documentId;
  const { data, isLoading, error } = useAnalysis(documentId);
  const [currentPage, setCurrentPage] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-slate-950">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <PageLoader message="Loading original contract and mapping page nodes..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col bg-slate-950">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-400 font-bold mb-2">Error loading contract workspace</p>
          <p className="text-slate-500 text-sm max-w-md">
            Could not retrieve analysis details for this contract. Please check that the server is running.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  const pdfUrl = getPDFUrl(documentId);
  const importantClauses = data.important_clauses || [];

  return (
    <div className="flex h-screen flex-col bg-slate-950 overflow-hidden">
      {/* Review Workspace Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${documentId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-850"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="h-4 w-px bg-slate-800" />
          <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            Evidence Workspace <span className="text-indigo-400 text-[10px] font-mono ml-2 font-normal hidden sm:inline">{documentId}</span>
          </h1>
        </div>

        <Link
          href={`/dashboard/${documentId}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-3 rounded-lg border border-indigo-900 bg-indigo-950/20"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          View Insights Overview
        </Link>
      </header>

      {/* Main Split Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer (70%) */}
        <div className="w-[70%] h-full">
          <PDFViewer pdfUrl={pdfUrl} onPageChange={setCurrentPage} importantClauses={importantClauses} />
        </div>

        {/* AI Explanation Sidebar (30%) */}
        <div className="w-[30%] h-full">
          <ClauseSidebar importantClauses={importantClauses} currentPage={currentPage} />
        </div>
      </div>

      {/* Floating QA Assistant */}
      <FloatingChatButton onClick={() => setChatOpen(!chatOpen)} isOpen={chatOpen} />
      <ContractChatDrawer documentId={documentId} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
