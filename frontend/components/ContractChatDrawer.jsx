import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, AlertCircle, Bot } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useChat } from "../hooks/useChat";

export default function ContractChatDrawer({ documentId, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your ContractLens AI assistant. I have processed this contract and the PageIndex tree structure. Ask me anything about its clauses, risks, or conditions.",
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef(null);
  const chatMutation = useChat();

  const handleSend = (text) => {
    // 1. Add user message
    const userMsg = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Call backend chat endpoint
    chatMutation.mutate(
      { documentId, question: text },
      {
        onSuccess: (data) => {
          const assistantMsg = {
            id: Math.random().toString(36).substring(7),
            sender: "assistant",
            text: data.answer,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err) => {
          const errorMsg = {
            id: Math.random().toString(36).substring(7),
            sender: "assistant",
            text: `⚠️ Failed to get answer: ${err.message || "Something went wrong. Please check if your backend is running."}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        },
      }
    );
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 md:right-6 z-[80] flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-indigo-950/20 overflow-hidden w-[90vw] md:w-[420px] h-[80vh] md:h-[650px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-850 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow shadow-indigo-600/30">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-none">Contract Intelligence</h4>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected to Contract Context
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing Indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-1 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={chatMutation.isPending} />
    </div>
  );
}
