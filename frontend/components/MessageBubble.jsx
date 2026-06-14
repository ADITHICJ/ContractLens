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
        {(() => {
          const text = message.text || "";
          if (isUser) {
            return <p className="whitespace-pre-wrap">{text}</p>;
          }

          // Matches [Label](citation://page=X) or [Label](page-X)
          const regex = /\[([^\]]+)\]\((?:citation:\/\/page=|page-)(\d+)\)/g;
          const parts = [];
          let lastIndex = 0;
          let match;

          while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
              parts.push(text.substring(lastIndex, matchIndex));
            }

            const label = match[1];
            const pageNum = parseInt(match[2], 10);

            parts.push(
              <button
                key={matchIndex}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("scroll-to-pdf-page", {
                      detail: { page: pageNum },
                    })
                  );
                }}
                className="inline-flex items-center mx-1 px-2 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-850 text-indigo-400 font-bold text-[11px] active:scale-95 transition-all select-none hover:text-indigo-300"
              >
                {label}
              </button>
            );

            lastIndex = regex.lastIndex;
          }

          if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
          }

          if (parts.length === 0) {
            return <p className="whitespace-pre-wrap">{text}</p>;
          }

          return (
            <p className="whitespace-pre-wrap">
              {parts.map((part, i) => (
                typeof part === "string" ? part : <span key={i}>{part}</span>
              ))}
            </p>
          );
        })()}
        <span className="text-[10px] text-slate-500 block mt-1.5 text-right">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
        </span>
      </div>

      {/* User Avatar Placeholder if we want, or nothing */}
    </div>
  );
}
