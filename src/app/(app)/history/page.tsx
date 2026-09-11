"use client";

import { useLocation } from "@/context/location-context";
import { useWeather } from "@/hooks/use-weather";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { History as HistoryIcon, CheckCircle2 } from "lucide-react";

export default function HistoryPage() {
  const { selectedLocation } = useLocation();

  const {
    data: weather,
    isLoading: isWeatherLoading,
  } = useWeather({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
    timezone: selectedLocation?.timezone,
    enabled: selectedLocation !== null,
  });

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-white">Meteorological Timeline</h2>
          <p className="text-neutral-400">Search for a location above to view hourly progression and forecast timelines.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2.5">
            <HistoryIcon className="text-cyan-400" size={24} />
            Forecast &amp; Meteorological Timeline
          </h1>
          <p className="text-sm text-neutral-400">
            Chronological atmospheric progression, solar interval cycles, and 7-day verified forecast for {selectedLocation.displayName}.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-900/50 rounded-full text-xs font-medium text-cyan-400">
          <CheckCircle2 size={13} />
          <span>Open-Meteo Grounded</span>
        </div>
      </div>

      {/* Hourly and Solar Cycles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
        <SunriseCard weather={weather} isLoading={isWeatherLoading} />
      </div>

      {/* Multi-Day Progression */}
      <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
    </div>
  );
}
