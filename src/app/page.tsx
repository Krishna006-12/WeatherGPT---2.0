"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationSearch } from "@/components/weather/location-search";
import { WeatherDisplay } from "@/components/weather/weather-display";
import { EventList } from "@/components/events/event-list";
import { useWeather } from "@/hooks/use-weather";
import type { NormalizedLocation } from "@/services/location/location-service";

/**
 * Home page — Development verification UI.
 *
 * Allows switching between:
 * 1. Weather Engine inspection
 * 2. Live Weather Intelligence events inspection
 */
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"weather" | "events">("weather");
  const [selectedLocation, setSelectedLocation] = useState<NormalizedLocation | null>(null);

  const {
    data: weather,
    isLoading,
    isError,
    error,
  } = useWeather({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
    timezone: selectedLocation?.timezone,
    enabled: selectedLocation !== null,
  });

  return (
    <main className="min-h-screen py-10">
      <Container size="md">
        <div className="flex flex-col items-center gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                WeatherGPT 2.0
              </h1>
              <Badge variant="secondary">Phase 3 — Live Intelligence Foundation</Badge>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Trusted weather pipeline &amp; deterministic live event intelligence foundation.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            <Button
              variant={activeTab === "weather" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("weather")}
            >
              Weather Engine
            </Button>
            <Button
              variant={activeTab === "events" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("events")}
            >
              Live Events Intelligence
            </Button>
          </div>

          {/* Tab 1: Weather Engine */}
          {activeTab === "weather" && (
            <div className="flex w-full flex-col items-center gap-6">
              <LocationSearch
                onSelectLocation={setSelectedLocation}
                selectedLocation={selectedLocation}
              />

              <div className="w-full">
                {!selectedLocation ? (
                  <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
                    Search and select a city above to inspect the Weather Engine in action.
                  </div>
                ) : (
                  <WeatherDisplay
                    weather={weather}
                    location={selectedLocation}
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                  />
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Live Weather Intelligence */}
          {activeTab === "events" && <EventList />}
        </div>
      </Container>
    </main>
  );
}
