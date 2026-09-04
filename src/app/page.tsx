"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useWeather } from "@/hooks/use-weather";
import type { NormalizedLocation } from "@/services/location/location-service";

import { WeatherHero } from "@/components/weather/weather-hero";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { LiveEventCard } from "@/components/events/live-event-card";
import { ImpactCard } from "@/components/impact/impact-card";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<NormalizedLocation | null>(null);

  const {
    data: weather,
    isLoading: isWeatherLoading,
  } = useWeather({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
    timezone: selectedLocation?.timezone,
    enabled: selectedLocation !== null,
  });

  return (
    <DashboardLayout onSelectLocation={setSelectedLocation} selectedLocation={selectedLocation}>
      {!selectedLocation ? (
        <div className="flex h-full min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2 text-white">Welcome to WeatherGPT 2.0</h2>
            <p className="text-neutral-400">Search for a city to begin your weather intelligence experience.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
          {/* 1. Current Weather */}
          <div className="lg:col-span-8 order-1">
            <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />
          </div>
          
          {/* 2. Critical Live Intelligence */}
          <div className="lg:col-span-4 order-2 lg:col-start-9 lg:row-start-1">
            <LiveEventCard />
          </div>

          {/* 3. Impact Intelligence */}
          <div className="lg:col-span-4 order-3 lg:col-start-9 lg:row-start-2">
            <ImpactCard location={selectedLocation} />
          </div>

          {/* 4. Hourly Forecast & Sunrise */}
          <div className="lg:col-span-8 order-4 lg:col-start-1 lg:row-start-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
            <SunriseCard weather={weather} isLoading={isWeatherLoading} />
          </div>

          {/* 5. 7-Day Forecast */}
          <div className="lg:col-span-8 order-5 lg:col-start-1 lg:row-start-3">
            <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
          </div>

          {/* 6. AI Copilot */}
          <div className="lg:col-span-4 order-6 lg:col-start-9 lg:row-start-3">
            <AICopilotCard location={selectedLocation} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

