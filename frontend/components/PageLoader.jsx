import React from "react";
import { Loader2 } from "lucide-react";

export default function PageLoader({ message = "Retrieving analysis data..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}
