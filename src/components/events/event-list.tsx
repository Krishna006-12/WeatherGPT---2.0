"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherEvent } from "@/types/events";

export function EventList() {
  const queryClient = useQueryClient();
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
        throw new Error("Feed sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const events = data?.events || [];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="category-select" className="text-xs text-neutral-500 font-medium">Category:</label>
          <select
            id="category-select"
            className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="flood">Flood</option>
            <option value="flash_flood">Flash Flood</option>
            <option value="cyclone">Cyclone</option>
            <option value="heavy_rain">Heavy Rain</option>
            <option value="thunderstorm">Thunderstorm</option>
            <option value="heatwave">Heatwave</option>
            <option value="landslide">Landslide</option>
            <option value="earthquake">Earthquake</option>
            <option value="wildfire">Wildfire</option>
            <option value="other">Other</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending ? "Syncing..." : "Sync Live Feeds"}
        </Button>
      </div>

      {/* Sync Banner */}
      {syncMutation.isSuccess && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Sync complete! Ingested: {syncMutation.data.articlesIngested} articles, Clustered into {syncMutation.data.eventsCreatedOrUpdated} events.
        </div>
      )}

      {syncMutation.isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Sync error: {syncMutation.error?.message || "Failed to sync feeds"}
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
                    {evt.category.replace(/_/g, " ")}
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
                    Confidence: {Math.round(evt.confidence * 100)}%
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
                <div className="text-xs text-neutral-400">
                  Updated: {new Date(evt.lastUpdatedAt).toLocaleDateString()}
                </div>
              </div>
              <CardTitle className="mt-2 text-lg font-bold">{evt.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-neutral-600 dark:text-neutral-300">
                {evt.description}
              </div>

              {/* Locations */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                <span className="font-medium">Locations:</span>
                {evt.locations.map((loc) => (
                  <span
                    key={`${loc.name}_${loc.country}`}
                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {loc.name}, {loc.country}
                  </span>
                ))}
              </div>

              {/* Source citations */}
              <div className="mt-4 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                <div className="mb-1 text-[11px] font-semibold text-neutral-400">
                  Sources ({evt.sources.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {evt.sources.map((src, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
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
                          className="text-blue-500 hover:underline"
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
