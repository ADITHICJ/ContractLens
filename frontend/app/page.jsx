"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import UploadZone from "../components/UploadZone";
import LoadingOverlay from "../components/LoadingOverlay";
import { useUpload } from "../hooks/useUpload";
import { ShieldAlert, BookOpen, Scale, Landmark } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const uploadMutation = useUpload();

  const handleUpload = (file) => {
    uploadMutation.mutate(file, {
      onSuccess: (data) => {
        if (data.documentId) {
          router.push(`/dashboard/${data.documentId}`);
        }
      },
    });
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-1 pb-16">
        <HeroSection />
        
        {/* Upload Contract */}
        <UploadZone onUpload={handleUpload} isLoading={uploadMutation.isPending} />
        
        {/* Loading Overlay */}
        <LoadingOverlay isVisible={uploadMutation.isPending} />

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
