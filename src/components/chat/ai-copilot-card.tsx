"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, AlertCircle, FileText, CheckCircle2, Info, AlertTriangle, RotateCcw, Sparkles, Sprout, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { AIResponse, GroundingStatus, ConversationContext } from "@/types/ai";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AIResponse;
  error?: string;
  timestamp: string;
}

const CHAT_STORAGE_KEY = "weathergpt_chat_history_v2";

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getFollowUpSuggestions(cityName?: string, isFarmer?: boolean): string[] {
  const city = cityName ? cityName.split(",")[0] : "this location";
  if (isFarmer) {
    return [
      `Will it rain in ${city} in the next 24 hours?`,
      `Is it safe to spray crops today?`,
      `What is the 3-day soil moisture & irrigation outlook?`,
    ];
  }
  return [
    `Will it rain today in ${city}?`,
    `Do I need an umbrella today?`,
    `Are there any active weather alerts?`,
    `What will the temperature be tonight?`,
  ];
}

export function AICopilotCard({
  location,
  initialExpanded = false,
  fullHeight = false,
  hideCollapse = false,
}: {
  location?: NormalizedLocation | null;
  initialExpanded?: boolean;
  fullHeight?: boolean;
  hideCollapse?: boolean;
}) {
  const { t } = useLanguage();
  const { isFarmer } = useAuth();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastContext, setLastContext] = useState<ConversationContext | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist chat history to localStorage (retain last 20 messages)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
      } catch {}
    }
  }, [messages]);

  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    isPlaying,
    speak,
    cancel: cancelSpeech,
  } = useVoiceAssistant({
    onFinalTranscript: (spokenText) => {
      setQuery(spokenText);
      handleSendQuery(spokenText);
    },
  });

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
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
  };

  const locationLabel = location?.displayName || location?.name || "your location";

  if (expanded) {
    return (
      <div
        className="flex flex-col relative rounded-[32px] overflow-hidden"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--accent-border)",
          height: fullHeight ? "calc(100vh - 10rem)" : "520px",
          minHeight: fullHeight ? "560px" : undefined,
          boxShadow: "0 24px 64px -12px hsla(192, 85%, 56%, 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-6 py-5 z-10"
          style={{ background: "hsla(var(--surface-1-hsl), 0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent-surface)", color: "var(--accent)" }}
            >
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-bold text-[15px] flex items-center gap-2 tracking-tight" style={{ color: "var(--accent)" }}>
                {t("copilot.title", "Copilot")}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider"
                  style={{
                    background: "var(--accent-surface)",
                    color: "var(--accent)",
                  }}
                >
                  Live
                </span>
              </h3>
              <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                {isFarmer ? t("user.farmer_mode", "Farmer Intelligence") : "Intelligence"} for {locationLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={clearSession}
                title={t("copilot.clear_chat", "Clear conversation")}
                aria-label={t("copilot.clear_chat", "Clear conversation")}
                className="p-2 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <RotateCcw size={15} />
              </button>
            )}
            {!hideCollapse && (
              <button
                onClick={() => setExpanded(false)}
                aria-label="Collapse Copilot"
                className="p-2 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 wg-hide-scroll">
          {messages.length === 0 && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div
                className="p-5 rounded-[24px] space-y-2.5"
                style={{
                  background: "var(--accent-surface)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                <div className="flex items-center gap-2 text-[13px] font-bold tracking-tight" style={{ color: "var(--accent)" }}>
                  <Sparkles size={16} />
                  <span>{t("copilot.welcome_title", "AI Meteorological Copilot")}</span>
                </div>
                <p className="text-[13px] leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>
                  {isFarmer
                    ? `Namaste! I am your agricultural meteorologist. Ask me about crop spraying feasibility, rain onset in ${locationLabel}, or soil moisture.`
                    : `How can I help you understand the live weather and regional forecasts for ${locationLabel}?`}
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: "var(--text-quaternary)" }}>
                  Suggested Inquiries
                </span>
                <div className="flex flex-col gap-2.5">
                  {getFollowUpSuggestions(locationLabel, isFarmer).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSendQuery(p)}
                      className="text-left text-[13px] p-3.5 rounded-[16px] flex items-center justify-between group transition-all duration-150"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span className="font-medium group-hover:text-[var(--text-primary)] transition-colors">{p}</span>
                      <Send size={14} className="opacity-0 group-hover:opacity-100 shrink-0 ml-2" style={{ color: "var(--accent)", transition: "opacity var(--transition-fast)" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {m.role === "user" ? (
                <div
                  className="max-w-[85%] rounded-[20px] rounded-tr-[4px] px-5 py-3.5 shadow-sm"
                  style={{
                    background: "var(--accent-surface)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <p className="text-[14px] whitespace-pre-wrap font-medium">{m.content}</p>
                </div>
              ) : (
                <div className="max-w-[92%] space-y-3">
                  {m.error ? (
                    <div
                      className="flex gap-3 text-[13px] p-4 rounded-[20px]"
                      style={{
                        background: "hsla(0, 80%, 60%, 0.08)",
                        border: "1px solid hsla(0, 80%, 60%, 0.2)",
                        color: "var(--status-danger)",
                      }}
                    >
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <div className="space-y-1.5">
                        <div className="font-bold">Service Notice</div>
                        <p className="font-medium leading-relaxed opacity-90">{m.content}</p>
                        <p className="text-[11px] opacity-70">
                          You can still view verified live weather cards and hourly forecasts directly on the dashboard.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-[20px] rounded-tl-[4px] p-5 space-y-4 shadow-sm"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <p className="text-[14px] whitespace-pre-wrap leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>{m.content}</p>

                      {/* Status Badges */}
                      {m.response && (
                        <div
                          className="flex flex-wrap items-center gap-2 pt-3"
                          style={{ borderTop: "1px solid var(--border-subtle)" }}
                        >
                          <GroundingBadge status={m.response.groundingStatus} />
                          <button
                            type="button"
                            onClick={() => {
                              if (isPlaying) {
                                cancelSpeech();
                              } else {
                                speak(m.content);
                              }
                            }}
                            title={isPlaying ? "Stop audio" : "Listen to briefing"}
                            aria-label={isPlaying ? "Stop audio" : "Listen to briefing"}
                            className="wg-badge flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer"
                            style={{
                              background: isPlaying ? "hsla(192, 85%, 56%, 0.15)" : "var(--surface-3)",
                              color: isPlaying ? "var(--accent)" : "var(--text-secondary)",
                              border: isPlaying ? "1px solid var(--accent-border)" : "1px solid var(--border-subtle)",
                            }}
                          >
                            {isPlaying ? <VolumeX size={11} /> : <Volume2 size={11} />}
                            <span className="text-[10px] font-medium">{isPlaying ? "Stop Audio" : "Listen"}</span>
                          </button>
                          {m.response.intent === "agriculture" && (m.response.crop || m.response.metadata?.crop) && (
                            <span
                              className="wg-badge flex items-center gap-1"
                              style={{
                                background: "hsla(140, 60%, 50%, 0.1)",
                                color: "var(--status-success)",
                                border: "1px solid hsla(140, 60%, 50%, 0.2)",
                              }}
                            >
                              <Sprout size={11} />
                              <span>Crop: {(m.response.crop || m.response.metadata?.crop || "").charAt(0).toUpperCase() + (m.response.crop || m.response.metadata?.crop || "").slice(1)}</span>
                            </span>
                          )}
                          {m.response.metadata?.isFallback && (
                            <span
                              className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                background: "var(--surface-3)",
                                color: "var(--text-tertiary)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              Deterministic observation backup
                            </span>
                          )}
                        </div>
                      )}

                      {/* Insufficient Evidence Notice */}
                      {m.response?.groundingStatus === "insufficient_evidence" && (
                        <div
                          className="flex gap-2 items-start text-xs font-medium p-3 rounded-xl mt-3"
                          style={{
                            background: "hsla(45, 90%, 55%, 0.08)",
                            border: "1px solid hsla(45, 90%, 55%, 0.2)",
                            color: "var(--status-warning)",
                          }}
                        >
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p>Insufficient evidence to provide a fully verified answer.</p>
                        </div>
                      )}

                      {/* Uncertainty Note */}
                      {m.response?.uncertainty && (
                        <div
                          className="flex gap-2 items-start text-xs font-medium p-3 rounded-xl mt-3"
                          style={{
                            background: "var(--surface-base)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--status-warning)" }} />
                          <p>{m.response.uncertainty}</p>
                        </div>
                      )}

                      {/* Citations */}
                      {m.response?.citations && m.response.citations.length > 0 && (
                        <div className="space-y-2 pt-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-quaternary)" }}>
                            <FileText size={12} /> Sources
                          </h4>
                          <div className="flex flex-col gap-1.5">
                            {m.response.citations.map((c, i) => (
                              <div key={i} className="text-[12px] flex items-baseline gap-2" style={{ color: "var(--text-tertiary)" }}>
                                <span style={{ color: "var(--accent)" }}>&bull;</span>
                                <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{c.source}:</span>
                                {c.url ? (
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-2 break-all hover:text-white transition-colors"
                                    style={{ color: "var(--text-tertiary)", textDecorationColor: "var(--accent-border)" }}
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
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Dynamic Contextual Follow-up Chips */}
          {!loading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
            <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-quaternary)] px-1">
                Suggested Follow-up
              </span>
              <div className="flex flex-wrap gap-2">
                {getFollowUpSuggestions(locationLabel, isFarmer).map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(p)}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 flex items-center gap-1.5 text-left group shadow-xs"
                  >
                    <Sparkles size={11} className="text-[var(--accent)] shrink-0 group-hover:rotate-12 transition-transform" />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Organic 3-Dot Pulsing Typing Indicator */}
          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-[20px] rounded-tl-[4px] bg-[var(--surface-2)] border border-[var(--border-subtle)] max-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-1.5 py-1 px-1">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs font-medium text-[var(--text-tertiary)]">
                {t("copilot.analyzing", "Analyzing verified weather and event data...")}
              </span>
            </div>
          )}
        </div>

        {/* Input form */}
        <div className="px-6 pb-6 pt-2 z-10" style={{ background: "hsla(var(--surface-1-hsl), 0.8)", backdropFilter: "blur(12px)" }}>
          <form onSubmit={handleSend} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              placeholder={isListening ? t("copilot.listening", "Listening... speak now") : t("copilot.placeholder", "Ask Copilot or use voice...")}
              className="w-full rounded-[20px] py-4 pl-5 pr-24 text-[14px] font-medium focus:outline-none disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                border: isListening ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                color: "var(--text-primary)",
                transition: "all var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-border)";
                e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-surface)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {isSpeechSupported && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={loading}
                aria-label={isListening ? "Stop listening" : "Speak query"}
                title={isListening ? "Listening... click to stop" : "Speak to WeatherGPT"}
                className={`absolute right-12 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/40"
                    : "text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || loading}
              aria-label="Send message"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 disabled:opacity-30 rounded-xl"
              style={{
                background: query.trim() ? "var(--accent)" : "transparent",
                color: query.trim() ? "#000" : "var(--accent)",
                transition: "all var(--transition-fast)",
              }}
            >
              <Send size={16} strokeWidth={query.trim() ? 2.5 : 2} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(true)}
      aria-label="Open WeatherGPT Copilot"
      className="wg-surface-command relative overflow-hidden p-5 sm:p-6 wg-animate-in wg-stagger-4 flex flex-col justify-between cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-all duration-200"
    >
      <div className="flex items-center justify-between z-10 relative mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent-border)]"
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              <span>{t("copilot.title", "Copilot")}</span>
              <span className="text-[11px] font-normal text-[var(--text-tertiary)] hidden sm:inline">• Meteorological Intelligence Engine</span>
            </h3>
          </div>
        </div>

        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent-border)]"
        >
          AI Command Active
        </span>
      </div>

      <div className="z-10 relative space-y-2.5">
        {/* Sleek prompt trigger bar */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors duration-200"
        >
          <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] group-hover:text-white transition-colors">
            {t("copilot.placeholder", "Ask WeatherGPT about this weather...")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--text-tertiary)] hidden md:inline px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              Enter to Prompt
            </span>
            <Send size={13} className="text-[var(--accent)]" />
          </div>
        </div>

        {/* Action suggestion pills */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[11px] font-normal text-[var(--text-tertiary)]">
            Ask about local patterns, hazards, or agricultural impacts.
          </span>
        </div>
      </div>
    </div>
  );
}

function GroundingBadge({ status }: { status: GroundingStatus }) {
  const configs: Record<string, { icon: React.ReactNode; label: string; bg: string; color: string; border: string }> = {
    grounded: {
      icon: <CheckCircle2 size={11} />,
      label: "Verified Grounded",
      bg: "hsla(160, 60%, 50%, 0.1)",
      color: "var(--status-success)",
      border: "hsla(160, 60%, 50%, 0.2)",
    },
    general_knowledge: {
      icon: <Info size={11} />,
      label: "General Knowledge",
      bg: "hsla(210, 70%, 55%, 0.1)",
      color: "var(--status-info)",
      border: "hsla(210, 70%, 55%, 0.2)",
    },
    partially_grounded: {
      icon: <Sparkles size={11} />,
      label: "Partially Grounded",
      bg: "hsla(270, 60%, 55%, 0.1)",
      color: "hsl(270, 60%, 65%)",
      border: "hsla(270, 60%, 55%, 0.2)",
    },
    insufficient_evidence: {
      icon: <AlertCircle size={11} />,
      label: "Insufficient Evidence",
      bg: "hsla(45, 90%, 55%, 0.1)",
      color: "var(--status-warning)",
      border: "hsla(45, 90%, 55%, 0.2)",
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <span
      className="wg-badge"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
