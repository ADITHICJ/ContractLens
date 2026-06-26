"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import UploadZone from "../components/UploadZone";
import LoadingOverlay from "../components/LoadingOverlay";
import { uploadContract } from "../lib/api";
import { 
  ShieldAlert, 
  BookOpen, 
  Scale, 
  Landmark, 
  AlertCircle
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const handleUpload = async (file) => {
    setIsProcessing(true);
    setAnalysisError(null);
    try {
      // Step 1: Upload and get structural tree reference
      const data = await uploadContract(file);
      if (!data.documentId) {
        throw new Error("Invalid response from parse server.");
      }

      // Step 2: Redirect directly to the dashboard page once data is fully available
      router.push(`/dashboard/${data.documentId}`);
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || "Failed to analyze contract. Please verify backend is active.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-1 pb-16">
        <HeroSection />
        
        {/* Upload Contract */}
        <UploadZone onUpload={handleUpload} isLoading={isProcessing} />

        {analysisError && (
          <div className="mx-auto max-w-2xl px-4 mt-6">
            <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/30 border border-red-900/40 p-4 rounded-xl">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Processing Failed:</span>
                <p className="mt-1">{analysisError}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        <LoadingOverlay isVisible={isProcessing} />

        {/* Feature Cards Section */}
        <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
              Advanced Contract Risk Detection Pipeline
            </h2>
            <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
              Powered by PageIndex.ai document hierarchy trees and Vectorless RAG retrieval.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Risk Detection */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-950/40 border border-red-900/30 text-red-400 mb-4">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Risk Detection</h3>
              <p className="text-xs text-slate-450 leading-relaxed text-slate-400">
                Identify indemnification liabilities, termination concerns, penalties, and payment risks automatically.
              </p>
            </div>

            {/* Conflict Analysis */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950/40 border border-amber-900/30 text-amber-400 mb-4">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Contradiction Flags</h3>
              <p className="text-xs text-slate-450 leading-relaxed text-slate-400">
                Find hidden conflicts and contradicting obligations between clauses across different pages.
              </p>
            </div>

            {/* RAG Context Retrieval */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">PageIndex RAG</h3>
              <p className="text-xs text-slate-450 leading-relaxed text-slate-400">
                Uses document tree structures instead of random vectors, preserving true legal context.
              </p>
            </div>

            {/* Actionable Remedies */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/40 border border-purple-900/30 text-purple-400 mb-4">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Legal Remedies</h3>
              <p className="text-xs text-slate-450 leading-relaxed text-slate-400">
                Get clear, plain-language recommendations and suggested negotiation redlines for risk mitigation.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} ContractLens Legal Intelligence Platform. Built using PageIndex.ai.</p>
      </footer>
    </>
  );
}
