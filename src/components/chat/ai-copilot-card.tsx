"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Sprout,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Database,
  ExternalLink,
  ImagePlus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Gauge,
  ShieldAlert,
  Activity,
  User,
  Bot,
} from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { AIResponse, GroundingStatus, ConversationContext } from "@/types/ai";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { detectInputLanguage } from "@/lib/i18n/language-detector";
import { supportedLanguageToVoiceLocale } from "@/services/voice/voice-service";
import { MarkdownContent } from "./markdown-content";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string; // Multimodal base64 image data URL
  response?: AIResponse;
  error?: string;
  timestamp: string;
  isStreaming?: boolean;
}

type PersonaType = "general_public" | "farmer" | "runner" | "pilot" | "disaster_manager";

interface PersonaConfig {
  id: PersonaType;
  label: string;
  icon: string;
  subtitle: string;
  badge: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    id: "general_public",
    label: "Commuter",
    icon: "🌍",
    subtitle: "Everyday lifestyle & commute",
    badge: "General",
  },
  {
    id: "farmer",
    label: "Farmer",
    icon: "🌾",
    subtitle: "Spraying window & soil moisture",
    badge: "Agri-Intel",
  },
  {
    id: "runner",
    label: "Runner",
    icon: "🏃",
    subtitle: "Air quality & thermal comfort",
    badge: "Athletic",
  },
  {
    id: "pilot",
    label: "Aviator",
    icon: "✈️",
    subtitle: "Cloud base & barometric trends",
    badge: "Aviation",
  },
  {
    id: "disaster_manager",
    label: "Emergency",
    icon: "🚨",
    subtitle: "Storm hazards & GDACS alerts",
    badge: "Hazard",
  },
];

const CHAT_STORAGE_KEY = "weathergpt_chat_history_v2";
const CHAT_PERSONA_KEY = "weathergpt_chat_persona_v2";

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSmartPromptSuggestions(
  cityName?: string,
  persona: PersonaType = "general_public"
): { icon: string; text: string }[] {
  const city = cityName ? cityName.split(",")[0] : "here";
  switch (persona) {
    case "farmer":
      return [
        { icon: "🌾", text: `Is it safe to spray crops today in ${city}?` },
        { icon: "💧", text: `What is the 3-day soil moisture & irrigation outlook?` },
        { icon: "🌧️", text: `Will it rain in ${city} in the next 24 hours?` },
        { icon: "🌡️", text: `Heat stress index & frost alert for crops` },
      ];
    case "runner":
      return [
        { icon: "🏃", text: `Best outdoor running window in ${city} today?` },
        { icon: "💨", text: `Air quality index & wind resistance for runners` },
        { icon: "☀️", text: `Peak UV radiation & thermal comfort hours` },
        { icon: "👟", text: `Rain onset risk during evening run?` },
      ];
    case "pilot":
      return [
        { icon: "✈️", text: `Cloud ceiling & low-altitude visibility for ${city}` },
        { icon: "🧭", text: `Surface wind gusts & shear risk report` },
        { icon: "📊", text: `Barometric pressure trend (QNH) over 12 hours` },
        { icon: "⛈️", text: `Thunderstorm & convective cell development risk` },
      ];
    case "disaster_manager":
      return [
        { icon: "🚨", text: `Active severe weather alerts & warnings for ${city}` },
        { icon: "🌊", text: `Flash flood & extreme precipitation probability` },
        { icon: "🌪️", text: `GDACS regional hazard & cyclone advisory` },
        { icon: "🛡️", text: `Emergency shelter & infrastructure impact risk` },
      ];
    default:
      return [
        { icon: "🌧️", text: `Will it rain today in ${city}?` },
        { icon: "☂️", text: `Do I need an umbrella today?` },
        { icon: "🌡️", text: `What will the temperature be tonight?` },
        { icon: "⚡", text: `Are there any active weather alerts?` },
      ];
  }
}

export function AICopilotCard({
  location,
  initialExpanded = false,
  fullHeight = false,
  hideCollapse = false,
  isFloating = false,
  onClose,
}: {
  location?: NormalizedLocation | null;
  initialExpanded?: boolean;
  fullHeight?: boolean;
  hideCollapse?: boolean;
  isFloating?: boolean;
  onClose?: () => void;
}) {
  const { t, language } = useLanguage();
  const { isFarmer: authIsFarmer } = useAuth();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastContext, setLastContext] = useState<ConversationContext | undefined>(undefined);
  const [persona, setPersona] = useState<PersonaType>(authIsFarmer ? "farmer" : "general_public");

  // Multimodal image upload state
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Citations accordion open states by message id
  const [openCitations, setOpenCitations] = useState<Record<string, boolean>>({});

  // Message copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore chat history & persona from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const savedPersona = localStorage.getItem(CHAT_PERSONA_KEY) as PersonaType;
      if (savedPersona && PERSONAS.some((p) => p.id === savedPersona)) {
        setPersona(savedPersona);
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

  // Persist persona preference
  const handleSelectPersona = (newPersona: PersonaType) => {
    setPersona(newPersona);
    try {
      localStorage.setItem(CHAT_PERSONA_KEY, newPersona);
    } catch {}
  };

  const activeVoiceLocale = supportedLanguageToVoiceLocale(language);

  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    isPlaying,
    speak,
    cancel: cancelSpeech,
  } = useVoiceAssistant({
    language: activeVoiceLocale,
    onFinalTranscript: (spokenText) => {
      setQuery(spokenText);
      handleSendQuery(spokenText, "voice");
    },
  });

  const handlePlayMessageAudio = (messageText: string) => {
    if (isPlaying) {
      cancelSpeech();
      return;
    }
    const detectedLang =
      language && language !== "en" ? language : detectInputLanguage(messageText, language);
    const targetVoiceLocale = supportedLanguageToVoiceLocale(detectedLang);
    speak(messageText, targetVoiceLocale);
  };

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

  const handleCopy = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleCitations = (messageId: string) => {
    setOpenCitations((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachedImage(reader.result);
        setAttachedImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearAttachedImage = () => {
    setAttachedImage(null);
    setAttachedImageName("");
  };

  // Real-time progressive streaming typewriter simulation
  const streamAssistantAnswer = (
    messageId: string,
    fullAnswer: string,
    aiData: AIResponse
  ) => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: fullAnswer, response: aiData, isStreaming: false }
            : msg
        )
      );
      return;
    }

    const chars = fullAnswer.split("");
    let currentIdx = 0;
    const step = Math.max(3, Math.floor(chars.length / 35));

    const interval = setInterval(() => {
      currentIdx = Math.min(chars.length, currentIdx + step);
      const currentSlice = chars.slice(0, currentIdx).join("");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: currentSlice, isStreaming: currentIdx < chars.length }
            : msg
        )
      );

      if (currentIdx >= chars.length) {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: fullAnswer, response: aiData, isStreaming: false }
              : msg
          )
        );
      }
    }, 16);
  };

  const handleSendQuery = async (userMessageText: string, channel: "chat" | "voice" = "chat") => {
    const trimmed = userMessageText.trim();
    if ((!trimmed && !attachedImage) || loading) return;

    const userMessageId = generateMessageId("user");
    const outgoingImage = attachedImage;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed || (outgoingImage ? "Analyzed sky/cloud photo" : ""),
      image: outgoingImage || undefined,
      timestamp: getCurrentTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    clearAttachedImage();
    setLoading(true);

    const effectiveLanguage =
      language && language !== "en" ? language : detectInputLanguage(trimmed, language);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed || "Please analyze this sky or cloud photo and tell me what weather to expect.",
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
          channel,
          language: effectiveLanguage,
          persona,
          image: outgoingImage || undefined,
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

        const assistantMsgId = aiData.id || generateMessageId("ai");

        // Start progressive streaming presentation
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            response: aiData,
            timestamp: getCurrentTimestamp(),
            isStreaming: true,
          },
        ]);

        streamAssistantAnswer(assistantMsgId, aiData.answer, aiData);

        // If user asked via voice, vocalize the response automatically in the matching language
        if (channel === "voice") {
          const detectedLang =
            language && language !== "en" ? language : detectInputLanguage(aiData.answer, language);
          speak(aiData.answer, supportedLanguageToVoiceLocale(detectedLang));
        }
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
    clearAttachedImage();
    setLastContext(undefined);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
  };

  const locationLabel = location?.displayName || location?.name || "your location";
  const activePersonaConfig = PERSONAS.find((p) => p.id === persona) || PERSONAS[0]!;

  if (expanded) {
    return (
      <div
        className={
          isFloating
            ? "flex flex-col relative w-full h-full overflow-hidden bg-transparent"
            : "flex flex-col relative rounded-[32px] overflow-hidden"
        }
        style={{
          background: isFloating ? "transparent" : "var(--surface-1)",
          border: isFloating ? "none" : "1px solid var(--accent-border)",
          height: isFloating ? "100%" : fullHeight ? "calc(100vh - 10rem)" : "580px",
          minHeight: isFloating ? 0 : fullHeight ? "560px" : undefined,
          boxShadow: isFloating ? "none" : "0 24px 64px -12px hsla(192, 85%, 56%, 0.12)",
        }}
      >
        {/* Header with Persona Switcher & Session Controls */}
        <div
          className="flex flex-col gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 z-10 shrink-0"
          style={{
            background: "hsla(var(--surface-1-hsl), 0.85)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ring-1 ring-cyan-500/30"
                style={{ background: "var(--accent-surface)", color: "var(--accent)" }}
              >
                <Bot size={17} />
              </div>
              <div className="min-w-0">
                <h2
                  className="font-bold text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 tracking-tight truncate"
                  style={{ color: "var(--accent)" }}
                >
                  {t("copilot.title", "Copilot")}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  >
                    ChatGPT Grade
                  </span>
                </h2>
                <p className="text-xs font-medium truncate text-[var(--text-tertiary)]">
                  {activePersonaConfig.subtitle} for {locationLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearSession}
                  title={t("copilot.clear_chat", "Clear conversation")}
                  aria-label={t("copilot.clear_chat", "Clear conversation")}
                  className="p-1.5 sm:p-2 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-[var(--text-tertiary)] hover:text-white"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              {isFloating && (
                <Link
                  href="/chat"
                  onClick={onClose}
                  title="Open full page copilot"
                  aria-label="Open full page copilot"
                  className="p-1.5 sm:p-2 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-[var(--text-tertiary)] hover:text-white"
                >
                  <ExternalLink size={15} />
                </Link>
              )}
              {(!hideCollapse || onClose) && (
                <button
                  type="button"
                  onClick={onClose ? onClose : () => setExpanded(false)}
                  aria-label={onClose ? "Close Copilot" : "Collapse Copilot"}
                  className="p-1.5 sm:p-2 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-[var(--text-tertiary)] hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Persona Selection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto wg-hide-scroll pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mr-1 shrink-0">
              Persona:
            </span>
            {PERSONAS.map((p) => {
              const isSelected = persona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPersona(p.id)}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs font-semibold"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-cyan-500/30 hover:text-white"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation message history"
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 wg-hide-scroll"
        >
          {messages.length === 0 && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div
                className="p-5 rounded-[24px] space-y-2.5 relative overflow-hidden"
                style={{
                  background: "var(--accent-surface)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                <div className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-[var(--accent)]">
                  <Sparkles size={16} />
                  <span>{t("copilot.welcome_title", "AI Meteorological Copilot")}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold ml-auto">
                    {activePersonaConfig.badge}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed font-medium text-[var(--text-secondary)]">
                  {persona === "farmer"
                    ? `Namaste! I am your agricultural meteorologist. Ask me about crop spraying feasibility, rain onset in ${locationLabel}, or soil moisture.`
                    : persona === "runner"
                    ? `Hey athlete! Ready to plan your run? Ask about thermal comfort windows, UV radiation, and rain timing in ${locationLabel}.`
                    : persona === "pilot"
                    ? `Welcome aviator. I monitor low-altitude cloud ceilings, barometric trends, and shear gusts for ${locationLabel}.`
                    : persona === "disaster_manager"
                    ? `Emergency monitor active for ${locationLabel}. Ask for real-time hazard severity, flood probabilities, and GDACS bulletins.`
                    : `How can I help you understand the live weather and regional forecasts for ${locationLabel}? Ask anything or attach a sky photo for instant cloud analysis!`}
                </p>
              </div>

              {/* Dynamic Quick Prompt Suggestions */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-1 text-[var(--text-quaternary)]">
                  Suggested Inquiries ({activePersonaConfig.label})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {getSmartPromptSuggestions(locationLabel, persona).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuery(p.text)}
                      className="text-left text-[13px] p-3.5 rounded-[18px] flex items-center justify-between group transition-all duration-150 bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-cyan-500/35 hover:bg-[var(--surface-3)] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{p.icon}</span>
                        <span className="font-medium text-[var(--text-secondary)] group-hover:text-white transition-colors truncate">
                          {p.text}
                        </span>
                      </div>
                      <Send
                        size={13}
                        className="opacity-0 group-hover:opacity-100 shrink-0 ml-2 text-[var(--accent)] transition-opacity"
                      />
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
                  className="max-w-[85%] rounded-[22px] rounded-tr-[6px] px-5 py-3.5 shadow-sm space-y-2.5"
                  style={{
                    background: "var(--accent-surface)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {m.image && (
                    <div className="rounded-xl overflow-hidden border border-cyan-500/30 max-w-[280px]">
                      <img
                        src={m.image}
                        alt="User uploaded sky/cloud"
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}
                  <p className="text-[14px] whitespace-pre-wrap font-medium">{m.content}</p>
                </div>
              ) : (
                <div className="max-w-[95%] sm:max-w-[90%] space-y-2.5">
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
                      className="rounded-[22px] rounded-tl-[6px] p-5 space-y-3.5 shadow-sm bg-[var(--surface-2)] border border-[var(--border-subtle)] relative"
                    >
                      {/* Assistant Header & Actions */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]/60 pb-2">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                          <Sparkles size={13} />
                          <span>WeatherGPT Intelligence</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.content)}
                            title={copiedId === m.id ? "Copied!" : "Copy response"}
                            aria-label={copiedId === m.id ? "Copied!" : "Copy response"}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-tertiary)] hover:text-white cursor-pointer"
                          >
                            {copiedId === m.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlayMessageAudio(m.content)}
                            title={isPlaying ? "Stop audio" : "Listen to briefing"}
                            aria-label={isPlaying ? "Stop audio" : "Listen to briefing"}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-tertiary)] hover:text-cyan-400 cursor-pointer"
                          >
                            {isPlaying ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Content with live cursor if streaming */}
                      <div className="relative">
                        <MarkdownContent content={m.content} style={{ color: "var(--text-secondary)" }} />
                        {m.isStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Status Badges */}
                      {m.response && !m.isStreaming && (
                        <div
                          className="flex flex-wrap items-center gap-2 pt-2.5"
                          style={{ borderTop: "1px solid var(--border-subtle)" }}
                        >
                          <GroundingBadge status={m.response.groundingStatus} />

                          <button
                            type="button"
                            onClick={() => handlePlayMessageAudio(m.content)}
                            title={isPlaying ? "Stop audio" : "Listen to briefing"}
                            aria-label={isPlaying ? "Stop audio" : "Listen to briefing"}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer shadow-xs"
                          >
                            {isPlaying ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-cyan-400" />}
                            <span>{isPlaying ? "Stop Audio" : "Listen"}</span>
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
                              <span>
                                Crop:{" "}
                                {(m.response.crop || m.response.metadata?.crop || "").charAt(0).toUpperCase() +
                                  (m.response.crop || m.response.metadata?.crop || "").slice(1)}
                              </span>
                            </span>
                          )}

                          {m.response.metadata?.isFallback && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-3)] border border-[var(--border-subtle)]">
                              Deterministic observation backup
                            </span>
                          )}

                          {/* Collapsible Tool Citations Drawer Trigger */}
                          {m.response.citations && m.response.citations.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleCitations(m.id)}
                              className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                            >
                              <Database size={12} className="text-purple-400" />
                              <span>{m.response.citations.length} Sources Grounded</span>
                              {openCitations[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
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

                      {/* Interactive Grounded Attribution Drawer */}
                      {m.response?.citations && m.response.citations.length > 0 && (
                        <div
                          className={`mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2.5 transition-all ${
                            openCitations[m.id] === false ? "hidden" : "block"
                          }`}
                          role="region"
                          aria-label="Data sources and AI attribution"
                        >
                          {/* Header with Gemini Reasoning Badge */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                              <Database size={13} className="text-[var(--accent)]" aria-hidden="true" />
                              <span>Verified Data Citations</span>
                            </div>

                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-purple-500/30 bg-purple-500/10 text-purple-300 dark:text-purple-300 shadow-2xs"
                              aria-label="AI analysis by Google Gemini: Reasoning and summary generated by Gemini"
                              title="Reasoning and summary generated by Gemini"
                            >
                              <Sparkles size={12} className="text-purple-400 shrink-0" aria-hidden="true" />
                              <span className="font-semibold">AI analysis by Google Gemini</span>
                              <span className="hidden sm:inline text-[10px] text-purple-300/80 border-l border-purple-500/30 pl-1.5">
                                Reasoning & summary
                              </span>
                            </div>
                          </div>

                          {/* Grounded Data Source Chips */}
                          <div
                            className="flex flex-wrap gap-2"
                            role="list"
                            aria-label="Verified meteorological and event data sources"
                          >
                            {m.response.citations.map((c, i) => (
                              <div
                                key={i}
                                role="listitem"
                                aria-label={`Data sourced from ${c.source}: ${c.title}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-cyan-500/40 transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />
                                <span className="font-semibold text-[var(--text-primary)]">{c.source}:</span>
                                {c.url ? (
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors truncate max-w-[220px]"
                                    style={{ textDecorationColor: "var(--accent-border)" }}
                                    title={`View verified source from ${c.source}`}
                                  >
                                    {c.title}
                                  </a>
                                ) : (
                                  <span className="truncate max-w-[240px] text-[var(--text-tertiary)]">{c.title}</span>
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
            <div className="space-y-2 pt-2 pb-1 border-t border-[var(--border-subtle)]/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] block">
                Suggested follow-ups
              </span>
              <div className="flex flex-wrap gap-2 items-center">
                {getSmartPromptSuggestions(locationLabel, persona).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuery(p.text)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-cyan-500/40 hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-white transition-all duration-150 flex items-center gap-1.5 text-left group shadow-xs cursor-pointer"
                  >
                    <span>{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real-Time Thinking & Telemetry Ingestion Indicator */}
          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-[20px] rounded-tl-[4px] bg-[var(--surface-2)] border border-[var(--border-subtle)] max-w-[340px] animate-in fade-in slide-in-from-bottom-2 duration-200">
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

        {/* Input Bar with Multimodal Attachment & Voice Visualizer */}
        <div
          className="px-4 sm:px-6 pb-5 pt-2 z-10 space-y-2"
          style={{ background: "hsla(var(--surface-1-hsl), 0.85)", backdropFilter: "blur(14px)" }}
        >
          {/* Image Attachment Preview Chip */}
          {attachedImage && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-2)] border border-cyan-500/30 max-w-fit animate-in fade-in slide-in-from-bottom-1">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                <img src={attachedImage} alt="Sky preview" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 pr-1">
                <div className="text-xs font-semibold text-white truncate max-w-[180px]">
                  {attachedImageName || "Sky Photo"}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono">Gemini Vision Ready</div>
              </div>
              <button
                type="button"
                onClick={clearAttachedImage}
                aria-label="Remove image"
                className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Voice Listening Soundwave Indicator */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-in fade-in">
              <div className="flex items-center gap-1 h-4">
                <span className="w-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                <span className="w-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
                <span className="w-1 bg-red-400 rounded-full animate-bounce h-2" />
                <span className="w-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.2s] h-4" />
                <span className="w-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.4s] h-2" />
              </div>
              <span className="font-semibold text-xs">Listening to your weather query... speak now</span>
            </div>
          )}

          <form onSubmit={handleSend} className="relative">
            <input
              ref={inputRef}
              type="text"
              aria-label="Ask WeatherGPT query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              placeholder={
                isListening
                  ? t("copilot.listening", "Listening... speak now")
                  : attachedImage
                  ? "Describe or ask about this sky photo..."
                  : t("copilot.placeholder", "Ask Copilot or use voice...")
              }
              className="w-full rounded-[22px] py-4 pl-5 pr-28 text-[14px] font-medium focus:outline-none disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                border: isListening
                  ? "1px solid var(--accent)"
                  : attachedImage
                  ? "1px solid var(--accent-border)"
                  : "1px solid var(--border-default)",
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

            {/* Submit button placed immediately after input for DOM test compatibility */}
            <button
              type="submit"
              disabled={(!query.trim() && !attachedImage) || loading}
              aria-label="Send message"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 disabled:opacity-30 rounded-xl cursor-pointer"
              style={{
                background: query.trim() || attachedImage ? "var(--accent)" : "transparent",
                color: query.trim() || attachedImage ? "#000" : "var(--accent)",
                transition: "all var(--transition-fast)",
              }}
            >
              <Send size={16} strokeWidth={query.trim() || attachedImage ? 2.5 : 2} />
            </button>

            {/* Voice Microphone Assistant Button */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening(activeVoiceLocale);
                  }
                }}
                disabled={loading}
                aria-label={isListening ? "Stop listening" : "Speak query"}
                title={isListening ? "Listening... click to stop" : "Speak to WeatherGPT"}
                className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/40"
                    : "text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            {/* Multimodal Sky Photo Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Attach sky photo"
              title="Upload cloud, sky, or radar image for Gemini vision analysis"
              className={`absolute right-20 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                attachedImage
                  ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                  : "text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
              }`}
            >
              <ImagePlus size={16} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />
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
