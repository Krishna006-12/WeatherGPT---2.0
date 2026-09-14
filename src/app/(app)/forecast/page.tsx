"use client";

import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { useWeather } from "@/hooks/use-weather";
import { WeatherHero } from "@/components/weather/weather-hero";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { ModelConsensusCard } from "@/components/weather/model-consensus-card";

export default function ForecastPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();

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
        <div className="text-center wg-animate-in">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("nav.forecast", "Weather Forecast")}
          </h2>
          <p style={{ color: "var(--text-tertiary)" }}>
            {t("welcome.subtitle", "Search for a city above to view multi-day meteorological forecasts.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {t("nav.forecast", "Forecast & Atmospheric Outlook")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          High-resolution deterministic projections and multi-model ensemble consensus for {selectedLocation.displayName}.
        </p>
      </div>

      {/* Hero Overview */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* Hourly and Solar Cycles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
        <SunriseCard weather={weather} isLoading={isWeatherLoading} />
      </div>

      {/* 7-Day Synoptic Outlook & Model Consensus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
        <ModelConsensusCard location={selectedLocation} />
      </div>
    </div>
  );
}
