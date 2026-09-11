"use client";

import { useLocation } from "@/context/location-context";
import { useWeather } from "@/hooks/use-weather";
import { WeatherHero } from "@/components/weather/weather-hero";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";

export default function WeatherPage() {
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
          <h2 className="text-2xl font-semibold mb-2 text-white">Weather Observations</h2>
          <p className="text-neutral-400">Search for a city above to view detailed meteorological conditions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Weather &amp; Observations
        </h1>
        <p className="text-sm text-neutral-400">
          Live atmospheric readings and verified multi-day forecasts for {selectedLocation.displayName}.
        </p>
      </div>

      {/* Hero Observation */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* Hourly and Solar Cycles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
        <SunriseCard weather={weather} isLoading={isWeatherLoading} />
      </div>

      {/* 7-Day Trend */}
      <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
    </div>
  );
}
