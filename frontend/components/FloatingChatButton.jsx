import React from "react";
import { MessageSquareCode, Sparkles } from "lucide-react";

export default function FloatingChatButton({ onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm px-5 py-3.5 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all duration-200 border border-indigo-400/30 ${
        isOpen ? "scale-90 opacity-90" : "scale-100"
      }`}
    >
      <MessageSquareCode className="h-5 w-5 animate-pulse" />
      <span>Ask Contract AI</span>
      <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
    </button>
  );
}
