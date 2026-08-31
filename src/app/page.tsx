"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { LocationSearch } from "@/components/weather/location-search";
import { WeatherDisplay } from "@/components/weather/weather-display";
import { useWeather } from "@/hooks/use-weather";
import type { NormalizedLocation } from "@/services/location/location-service";

/**
 * Home page — Phase 2 Weather Engine Verification UI.
 *
 * Minimal development UI to manually verify:
 * - Location search / geocoding
 * - Server-side Open-Meteo weather fetch & normalization
 * - Current conditions, hourly and daily previews
 * - Provenance metadata
 */
export default function HomePage() {
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
              <Badge variant="secondary">Phase 2 — Core Weather Engine</Badge>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Trusted server-side weather pipeline with normalized contracts &amp; provenance.
            </p>
          </div>

          {/* Location Search Bar */}
          <LocationSearch
            onSelectLocation={setSelectedLocation}
            selectedLocation={selectedLocation}
          />

          {/* Weather Content */}
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
      </Container>
    </main>
  );
}
