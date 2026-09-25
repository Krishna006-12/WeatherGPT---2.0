"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/language-context";
import { useNotification } from "@/context/notification-context";
import { AlertTriangle, CheckCircle2, RefreshCw, Bell, X, ShieldAlert } from "lucide-react";
import type { WeatherEvent } from "@/types/events";

export function EventList() {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const { permission, requestPermission, sendEmergencyNotification } = useNotification();
  const locale = language === "hi" ? "hi-IN" : language === "pa" ? "pa-IN" : "en-US";
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ events: WeatherEvent[]; total: number }>({
    queryKey: ["events", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/api/events?category=${encodeURIComponent(selectedCategory)}`
        : "/api/events";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/events/sync", { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message || errJson?.message || `Feed synchronization failed (${res.status})`
        );
      }
      return res.json();
    },
    onSuccess: async (syncData) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });

      // Automatically inspect updated events and dispatch push notification for any severe emergencies
      try {
        const eventsRes = await fetch("/api/events?limit=5");
        if (eventsRes.ok) {
          const json = await eventsRes.json();
          const topEvents: WeatherEvent[] = json.events || [];
          const severeEvent = topEvents.find(
            (e) =>
              e.severity === "extreme" ||
              e.severity === "high" ||
              e.severity === "critical" ||
              e.category === "cyclone" ||
              e.category === "earthquake" ||
              e.category === "flash_flood"
          );

          if (severeEvent) {
            sendEmergencyNotification({
              title: `🚨 Emergency Advisory: ${severeEvent.title}`,
              body: severeEvent.summary || "Severe meteorological hazard detected by synchronized agency feeds.",
              severity: severeEvent.severity === "extreme" ? "extreme" : "high",
              category: severeEvent.category,
              eventId: severeEvent.id,
              url: "/intelligence",
            });
          }
        }
      } catch {
        // Non-blocking notification dispatch
      }
    },
  });

  const events = data?.events || [];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="category-select" className="text-xs text-[var(--text-secondary)] font-medium">
            {t("events.category", "Category")}:
          </label>
          <select
            id="category-select"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">{t("events.all_categories", "All Categories")}</option>
            <option value="flood">{t("category.flood", "Flood")}</option>
            <option value="flash_flood">{t("category.flash_flood", "Flash Flood")}</option>
            <option value="cyclone">{t("category.cyclone", "Cyclone")}</option>
            <option value="heavy_rain">{t("category.heavy_rain", "Heavy Rain")}</option>
            <option value="thunderstorm">{t("category.thunderstorm", "Thunderstorm")}</option>
            <option value="heatwave">{t("category.heatwave", "Heatwave")}</option>
            <option value="landslide">{t("category.landslide", "Landslide")}</option>
            <option value="earthquake">{t("category.earthquake", "Earthquake")}</option>
            <option value="wildfire">{t("category.wildfire", "Wildfire")}</option>
            <option value="other">{t("category.other", "Other")}</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("events.refresh", "Refresh")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {permission === "default" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestPermission()}
              className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1.5"
            >
              <Bell size={13} />
              <span>{t("events.enable_alerts", "Enable Push Alerts")}</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="flex items-center gap-1.5 min-w-[130px] justify-center"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>{t("events.syncing", "Syncing Feeds...")}</span>
              </>
            ) : (
              <span>{t("events.sync_feeds", "Sync Live Feeds")}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Success Feedback */}
      {syncMutation.isSuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 backdrop-blur animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>
              {t("events.sync_done", "Live Feeds Synchronized")}: {syncMutation.data.articlesIngested} articles ingested, {syncMutation.data.eventsCreatedOrUpdated} canonical hazard events active.
            </span>
          </div>
          <button
            onClick={() => syncMutation.reset()}
            className="p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/20 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sync Error Feedback with Dismiss & Retry */}
      {syncMutation.isError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 backdrop-blur animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>
              {syncMutation.error?.message || "Feed synchronization encountered an issue. Using latest cached advisories."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncMutation.mutate()}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => syncMutation.reset()}
              className="p-1 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && (
        <Card className="border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <div className="font-semibold">Event Service Error</div>
          <div className="mt-1 text-sm">{error?.message || "Failed to load events."}</div>
        </Card>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No live weather events found in storage. Click &ldquo;Sync Live Feeds&rdquo; above to ingest and cluster external feeds.
        </div>
      )}

      {!isLoading &&
        events.map((evt) => (
          <Card key={evt.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="capitalize">
                    {t(`category.${evt.category}`, evt.category.replace(/_/g, " "))}
                  </Badge>
                  <Badge
                    variant={
                      evt.severity === "extreme" || evt.severity === "high" || evt.severity === "critical"
                        ? "destructive"
                        : evt.severity === "moderate"
                        ? "warning"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {evt.severity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t("events.confidence", "Confidence")}: {Math.round(evt.confidence * 100)}%
                  </Badge>
                  {evt.freshness && (
                    <Badge variant="secondary" className="text-xs">
                      {evt.freshness.label}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {evt.status}
                  </Badge>
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  {t("events.updated", "Updated")}: {new Date(evt.lastUpdatedAt).toLocaleDateString(locale)}
                </div>
              </div>
              <CardTitle className="mt-2 text-lg font-bold text-[var(--text-primary)]">{evt.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {evt.description}
              </div>

              {/* Locations */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-secondary)]">{t("events.locations", "Locations")}:</span>
                {evt.locations.map((loc) => (
                  <span
                    key={`${loc.name}_${loc.country}`}
                    className="rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                  >
                    {loc.name}, {loc.country}
                  </span>
                ))}
              </div>

              {/* Source citations */}
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-2.5">
                <div className="mb-1 text-[11px] font-semibold text-[var(--text-tertiary)]">
                  {t("events.sources", "Sources")} ({evt.sources.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {evt.sources.map((src, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      <span className="font-medium">{src.name}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1">
                        Tier {src.tier}
                      </Badge>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] hover:underline"
                        >
                          link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
