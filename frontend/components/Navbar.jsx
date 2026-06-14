import React from "react";
import Link from "next/link";
import { Shield, FileText, Compass, Settings } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-150 to-slate-400 bg-clip-text text-transparent tracking-tight">
            Contract<span className="text-indigo-400 font-extrabold">Lens</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Home
          </Link>
          <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="https://pageindex.ai" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            PageIndex.ai
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-950 bg-emerald-950/30 text-emerald-400 text-xs font-semibold">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Pipeline Active
          </div>
        </div>
      </div>
    </header>
  );
}
