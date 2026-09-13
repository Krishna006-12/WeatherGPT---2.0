"use client";

import { useLocation } from "@/context/location-context";
import { useWeather } from "@/hooks/use-weather";
import { WeatherHero } from "@/components/weather/weather-hero";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { LiveEventCard } from "@/components/events/live-event-card";
import { ImpactCard } from "@/components/impact/impact-card";
import { AgricultureCard } from "@/components/agriculture/agriculture-card";
import { WeatherRiskCenterCard } from "@/components/risk/weather-risk-center-card";
import { ModelConsensusCard } from "@/components/weather/model-consensus-card";
import { ActivitySuitabilityCard } from "@/components/activity/activity-suitability-card";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";

export default function DashboardPage() {
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
        <div className="text-center wg-animate-in">
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome to WeatherGPT 2.0
          </h2>
          <p style={{ color: "var(--text-tertiary)" }}>
            Search for a city above to begin your weather intelligence experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-7 pb-12">
      {/* 1. PRIMARY: Dominant Weather Hero Centerpiece */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* 2. SECONDARY: Immediate Horizon & Live Intelligence */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Immediate Horizon & Risk Intelligence
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col">
            <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
            <WeatherRiskCenterCard location={selectedLocation} />
            <LiveEventCard />
          </div>
        </div>
      </div>

      {/* 3. TERTIARY: Specialized Meteorological Analysis */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Environmental & Regional Analysis
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          <div className="lg:col-span-4 flex flex-col">
            <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
            <SunriseCard weather={weather} isLoading={isWeatherLoading} />
            <ImpactCard location={selectedLocation} />
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex flex-col">
            <AgricultureCard location={selectedLocation} />
          </div>
        </div>
      </div>

      {/* 4. DECISION INTELLIGENCE: Activity Weather Suitability */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Activity Suitability & Decision Intelligence
          </h2>
        </div>
        <div className="w-full">
          <ActivitySuitabilityCard location={selectedLocation} />
        </div>
      </div>

      {/* 5. NWP INTELLIGENCE: Multi-Model Consensus & Confidence */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            NWP Multi-Model Consensus & Forecast Confidence
          </h2>
        </div>
        <div className="w-full">
          <ModelConsensusCard location={selectedLocation} />
        </div>
      </div>

      {/* 5. UTILITY: Meteorological AI Layer */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            AI Meteorological Copilot
          </h2>
        </div>
        <div className="w-full">
          <AICopilotCard location={selectedLocation} />
        </div>
      </div>
    </div>
  );
}
