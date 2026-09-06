"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, AlertCircle, FileText, CheckCircle2, Info, AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { AIResponse, GroundingStatus, ConversationContext } from "@/types/ai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AIResponse;
  error?: string;
  timestamp: string;
}

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AICopilotCard({ location }: { location?: NormalizedLocation | null }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastContext, setLastContext] = useState<ConversationContext | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendQuery = async (userMessageText: string) => {
    const trimmed = userMessageText.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId("user"),
      role: "user",
      content: trimmed,
      timestamp: getCurrentTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          location: location
            ? {
                name: location.displayName,
                city: location.displayName.split(",")[0],
                country: location.country,
                lat: location.latitude,
                lon: location.longitude,
                timezone: location.timezone,
              }
            : undefined,
          context: lastContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error?.message || "Failed to process chat query";
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId("err"),
            role: "assistant",
            content: errorMsg,
            error: errorMsg,
            timestamp: getCurrentTimestamp(),
          },
        ]);
      } else {
        const aiData = data as AIResponse;
        if (aiData.metadata?.conversationContext) {
          setLastContext(aiData.metadata.conversationContext);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: aiData.id || generateMessageId("ai"),
            role: "assistant",
            content: aiData.answer,
            response: aiData,
            timestamp: getCurrentTimestamp(),
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error contacting weather service";
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId("err"),
          role: "assistant",
          content: errorMsg,
          error: errorMsg,
          timestamp: getCurrentTimestamp(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSendQuery(query);
  };

  const clearSession = () => {
    setMessages([]);
    setQuery("");
    setLastContext(undefined);
  };

  const locationLabel = location?.name || "your location";

  if (expanded) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-cyan-500/30 relative flex flex-col h-[520px] shadow-2xl shadow-cyan-900/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-1.5">
                WeatherGPT Copilot
                <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/40 text-cyan-300 font-normal">
                  Live
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">Grounded intelligence for {locationLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearSession}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors text-xs flex items-center gap-1"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              onClick={() => setExpanded(false)}
              aria-label="Collapse Copilot"
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 text-sm">
          {messages.length === 0 && !loading && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                  <Sparkles size={14} />
                  <span>AI Meteorological Copilot</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  How can I help you understand the weather and regional intelligence for <span className="text-white font-medium">{locationLabel}</span>?
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Suggested Inquiries</span>
                <div className="flex flex-col gap-2">
                  {[
                    `What is the weather in ${locationLabel} right now?`,
                    "Will it rain today?",
                    "Are there any severe weather warnings nearby?",
                    "Could active hazard events affect my region?",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSendQuery(p)}
                      className="text-left text-xs bg-white/5 hover:bg-white/10 p-2.5 rounded-xl text-neutral-300 hover:text-white transition-colors border border-white/5 flex items-center justify-between group"
                    >
                      <span>{p}</span>
                      <Send size={12} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[85%] bg-cyan-600/20 border border-cyan-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-white">
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <span className="text-[10px] text-cyan-300/60 mt-1 block text-right">{m.timestamp}</span>
                </div>
              ) : (
                <div className="max-w-[92%] space-y-3">
                  {m.error ? (
                    <div className="flex gap-3 text-red-400 text-xs p-3.5 bg-red-950/20 rounded-2xl border border-red-900/40">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-red-300">Service Notice</div>
                        <p>{m.content}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          You can still view verified live weather cards and hourly forecasts directly on the dashboard.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm p-4 space-y-3">
                      <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">{m.content}</p>

                      {/* Status Badges */}
                      {m.response && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                          <GroundingBadge status={m.response.groundingStatus} />
                          {m.response.metadata?.isFallback && (
                            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                              Deterministic observation backup
                            </span>
                          )}
                        </div>
                      )}

                      {/* Insufficient Evidence Notice */}
                      {m.response?.groundingStatus === "insufficient_evidence" && (
                        <div className="flex gap-2 items-start text-xs text-amber-400 bg-amber-950/20 p-3 rounded-xl border border-amber-900/30">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <p>Insufficient evidence to provide a fully verified answer.</p>
                        </div>
                      )}

                      {/* Uncertainty Note */}
                      {m.response?.uncertainty && (
                        <div className="flex gap-2 items-start text-xs text-neutral-400 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                          <AlertTriangle size={14} className="shrink-0 text-amber-400 mt-0.5" />
                          <p>{m.response.uncertainty}</p>
                        </div>
                      )}

                      {/* Citations */}
                      {m.response?.citations && m.response.citations.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <h4 className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
                            <FileText size={12} /> Sources
                          </h4>
                          <div className="flex flex-col gap-1">
                            {m.response.citations.map((c, i) => (
                              <div key={i} className="text-xs text-neutral-400 flex items-baseline gap-1.5">
                                <span className="text-cyan-500">&bull;</span>
                                <span className="font-medium text-neutral-300">{c.source}:</span>
                                {c.url ? (
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-cyan-400 underline decoration-cyan-900/50 underline-offset-2 break-all"
                                  >
                                    {c.title}
                                  </a>
                                ) : (
                                  <span>{c.title}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] text-neutral-500 block text-right">{m.timestamp}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-cyan-400 text-xs p-3.5 bg-cyan-950/20 rounded-2xl border border-cyan-900/30">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
              <span>Analyzing verified weather and event data...</span>
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="relative mt-auto">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ask WeatherGPT..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Send message"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors rounded-xl hover:bg-white/5"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      onClick={() => setExpanded(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(true)}
      aria-label="Open WeatherGPT Copilot"
      className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between h-48 cursor-pointer hover:border-cyan-500/30 transition-all group focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
    >
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl" />

      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <MessageSquare size={16} />
          </div>
          <h3 className="font-bold text-cyan-400">WeatherGPT Copilot</h3>
        </div>
        <span className="text-[10px] bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800/40">
          Interactive
        </span>
      </div>

      <div className="z-10 mt-4 p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-cyan-500/20 transition-colors">
        <p className="text-xs text-neutral-400 italic">
          &quot;Analyzing verified weather and event data...&quot;
        </p>
      </div>
    </div>
  );
}

function GroundingBadge({ status }: { status: GroundingStatus }) {
  switch (status) {
    case "grounded":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/40">
          <CheckCircle2 size={11} /> Verified Grounded
        </span>
      );
    case "general_knowledge":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-sky-950/60 text-sky-400 px-2 py-0.5 rounded-full border border-sky-800/40">
          <Info size={11} /> General Knowledge
        </span>
      );
    case "partially_grounded":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-950/60 text-purple-400 px-2 py-0.5 rounded-full border border-purple-800/40">
          <Sparkles size={11} /> Partially Grounded
        </span>
      );
    case "insufficient_evidence":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800/40">
          <AlertCircle size={11} /> Insufficient Evidence
        </span>
      );
    default:
      return null;
  }
}
