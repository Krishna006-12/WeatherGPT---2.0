"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { AIResponse, GroundingStatus } from "@/types/ai";

export function DevChat() {
  const [query, setQuery] = useState("");
  const [locationName, setLocationName] = useState("Kanpur, India");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groundingBadges: Record<GroundingStatus, { label: string; variant: BadgeVariant }> = {
    grounded: { label: "Fully Grounded", variant: "success" },
    partially_grounded: { label: "Partially Grounded", variant: "warning" },
    general_knowledge: { label: "General Science", variant: "secondary" },
    insufficient_evidence: { label: "Insufficient Evidence", variant: "destructive" },
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query.trim(),
          location: locationName ? { name: locationName.trim() } : undefined,
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

  const quickPrompts = [
    "What is the weather in Kanpur?",
    "Will it rain tomorrow in Delhi?",
    "What's happening with the Nepal flood?",
    "Will Nepal floods affect Kanpur?",
    "What causes flash floods?",
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Intelligence Assistant (Dev Sandbox)</CardTitle>
          {response && (
            <Badge variant={groundingBadges[response.groundingStatus].variant}>
              {groundingBadges[response.groundingStatus].label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuery(prompt)}
              className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Controls */}
        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about weather, forecasts, hazards, or location impact..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? "Thinking..." : "Send"}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Context Location:</span>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Kanpur, India"
              className="rounded border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-xs bg-transparent"
            />
          </div>
        </form>

        {/* Error View */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Response View */}
        {response && (
          <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Intent: <strong className="uppercase">{response.intent}</strong></span>
              <span>Model: {response.model || "gemini"}</span>
            </div>

            <div className="text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
              {response.answer}
            </div>

            {response.uncertainty && (
              <div className="rounded border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200">
                <strong>Uncertainty Note:</strong> {response.uncertainty}
              </div>
            )}

            {/* Citations List */}
            {response.citations && response.citations.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-2 space-y-1">
                <span className="text-xs font-semibold text-neutral-500">Verified Sources & Citations:</span>
                <ul className="text-xs space-y-1 text-neutral-600 dark:text-neutral-400">
                  {response.citations.map((c, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-neutral-400">•</span>
                      <strong>{c.source}:</strong>
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 underline truncate max-w-xs"
                        >
                          {c.title}
                        </a>
                      ) : (
                        <span>{c.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
