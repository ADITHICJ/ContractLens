import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

const STEPS = [
  "Uploading Contract...",
  "Generating PageIndex Tree...",
  "Building Document Structure...",
  "Running Legal Analysis...",
  "Detecting Risks...",
  "Generating Recommendations...",
  "Detecting Conflicts...",
  "Preparing Dashboard..."
];

export default function LoadingOverlay({ isVisible }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStepIndex(0);
      return;
    }

    // Cycle through steps roughly simulating backend progress
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3500); // 3.5 seconds per step

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md p-8 text-center">
        {/* Glowing Spinner */}
        <div className="relative mx-auto h-20 w-20 flex items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full border border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
          <Loader2 className="h-8 w-8 text-indigo-400 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Analyzing your contract</h3>
        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
          Our AI pipeline is reading sections, building the tree, and checking risks.
        </p>

        {/* Step List */}
        <div className="space-y-3.5 text-left border border-slate-800/60 bg-slate-900/40 rounded-xl p-5 shadow-inner">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  isCompleted ? "opacity-60" : isActive ? "opacity-100" : "opacity-30"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 shrink-0 text-indigo-400 animate-spin" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-slate-800" />
                )}
                <span
                  className={`text-sm ${
                    isActive ? "font-semibold text-indigo-300" : "text-slate-300"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
