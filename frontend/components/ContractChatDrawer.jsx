import React, { useState, useEffect, useRef } from "react";
import { X, AlertCircle, Bot } from "lucide-react";
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

  const suggestionQuestions = [
    "What are the termination conditions?",
    "Is there a liability cap in this contract?",
    "Are there any financial penalties or late fees?",
    "What is the governing law and jurisdiction?"
  ];

  const handleSend = (text) => {
    // 1. Add user message
    const userMsg = {
      id: `user-${messages.length}`,
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
            id: `assistant-${messages.length + 1}`,
            sender: "assistant",
            text: data.answer,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err) => {
          const errorMsg = {
            id: `error-${messages.length + 1}`,
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
    <div className="fixed bottom-24 right-4 md:right-6 z-[80] flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-indigo-950/20 overflow-hidden w-[90vw] md:w-[400px] h-[65vh] max-h-[calc(100vh-120px)] min-h-[400px] md:h-[550px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-850 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow shadow-indigo-600/30">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-tight leading-none">Contract AI</h4>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Analysis Context
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

        {messages.length === 1 && !chatMutation.isPending && (
          <div className="space-y-2 mt-2">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block pl-1">
              Suggested Queries
            </span>
            <div className="grid grid-cols-1 gap-2">
              {suggestionQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="text-left text-[11px] font-semibold text-slate-350 bg-slate-900/60 hover:bg-slate-850/85 border border-slate-850 hover:border-indigo-900/60 px-3.5 py-2.5 rounded-xl transition-all duration-200 active:scale-98 leading-normal shadow-sm hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

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
