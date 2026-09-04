"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, AlertCircle, FileText } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { AIResponse } from "@/types/ai";

export function AICopilotCard({ location }: { location?: NormalizedLocation | null }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query.trim(),
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to process chat query");
      } else {
        setResponse(data as AIResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Custom fetch for quick prompts to avoid state staleness
  const runQuery = async (q: string) => {
    setQuery(q);
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q.trim(),
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
        }),
      });

      const data = await res.json();
      if (!res.ok) setError(data.error?.message || "Failed to process chat query");
      else setResponse(data as AIResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (expanded) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-cyan-500/30 relative flex flex-col h-[400px] shadow-2xl shadow-cyan-900/20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400">
              <MessageSquare size={16} />
            </div>
            <h3 className="font-bold text-cyan-400">WeatherGPT Copilot</h3>
          </div>
          <button onClick={() => setExpanded(false)} className="text-neutral-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {!response && !loading && !error && (
             <div className="space-y-4">
               <p className="text-sm text-neutral-300">
                 How can I help you understand the weather and regional intelligence?
               </p>
               <div className="flex flex-col gap-2">
                 {["Will it rain today?", "Any severe weather nearby?", "Could this event affect my region?"].map(p => (
                   <button key={p} onClick={() => runQuery(p)} className="text-left text-xs bg-white/5 hover:bg-white/10 p-2.5 rounded-lg text-neutral-300 transition-colors border border-white/5">
                     {p}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {loading && (
             <div className="flex items-center gap-3 text-cyan-400 text-sm p-4 bg-cyan-950/20 rounded-xl border border-cyan-900/30">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                Analyzing verified weather and event data...
             </div>
          )}

          {error && (
             <div className="flex gap-3 text-red-400 text-sm p-4 bg-red-950/20 rounded-xl border border-red-900/30">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
             </div>
          )}

          {response && (
            <div className="space-y-4">
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                 <p className="text-sm text-neutral-200 whitespace-pre-wrap">{response.answer}</p>
               </div>
               
               {response.groundingStatus === "insufficient_evidence" && (
                 <div className="flex gap-2 items-start text-xs text-amber-400 bg-amber-950/20 p-3 rounded-xl border border-amber-900/30">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>Insufficient evidence to provide a fully verified answer.</p>
                 </div>
               )}

               {response.uncertainty && (
                 <div className="flex gap-2 items-start text-xs text-neutral-400 bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{response.uncertainty}</p>
                 </div>
               )}

               {response.citations && response.citations.length > 0 && (
                 <div className="space-y-2">
                   <h4 className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
                     <FileText size={12} /> Sources
                   </h4>
                   <div className="flex flex-col gap-1.5">
                      {response.citations.map((c, i) => (
                        <div key={i} className="text-xs text-neutral-400 flex items-baseline gap-1.5">
                          <span className="text-cyan-600">&bull;</span>
                          <span className="font-medium text-neutral-300">{c.source}:</span>
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline decoration-cyan-900/50 underline-offset-2">
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

        <form onSubmit={handleSend} className="relative mt-auto">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ask WeatherGPT..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors"
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
      className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between h-48 cursor-pointer hover:border-cyan-500/30 transition-colors group"
    >
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl" />
      
      <div className="flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
          <MessageSquare size={16} />
        </div>
        <h3 className="font-bold text-cyan-400">WeatherGPT Copilot</h3>
      </div>

      <div className="z-10 mt-4 p-3 rounded-xl bg-black/40 border border-white/5">
        <p className="text-xs text-neutral-400 italic">
          &quot;Analyzing verified weather and event data...&quot;
        </p>
      </div>
    </div>
  );
}

