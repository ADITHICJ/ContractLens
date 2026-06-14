import React from "react";
import { MessageSquare, ShieldAlert } from "lucide-react";

export default function MessageBubble({ message }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Bot Icon */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 shadow-sm">
          <MessageSquare className="h-4 w-4" />
        </div>
      )}

      {/* Message Text Bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-none"
            : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        <span className="text-[10px] text-slate-500 block mt-1.5 text-right">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
        </span>
      </div>

      {/* User Avatar Placeholder if we want, or nothing */}
    </div>
  );
}
