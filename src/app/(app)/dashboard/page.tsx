"use client";

import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { useWeather } from "@/hooks/use-weather";
import { WeatherHero } from "@/components/weather/weather-hero";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { LiveEventCard } from "@/components/events/live-event-card";
import { ImpactCard } from "@/components/impact/impact-card";
import { AgricultureCard } from "@/components/agriculture/agriculture-card";
import { WeatherRiskCenterCard } from "@/components/risk/weather-risk-center-card";
import { WeatherMascotCard } from "@/components/weather/weather-mascot-card";
import { ModelConsensusCard } from "@/components/weather/model-consensus-card";
import { ActivitySuitabilityCard } from "@/components/activity/activity-suitability-card";
import { DecisionSupportCard } from "@/components/persona/decision-support-card";
import { ScreenReaderAnnouncer } from "@/components/common/screen-reader-announcer";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";
import { PilotOnboardingModal } from "@/components/onboarding/pilot-onboarding-modal";
import { useState } from "react";

export default function DashboardPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);

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
            {t("welcome.title", "Welcome to WeatherGPT 2.0")}
          </h2>
          <p style={{ color: "var(--text-tertiary)" }}>
            {t("welcome.subtitle", "Search for a city above to begin your weather intelligence experience.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 lg:gap-7 pb-16">
      <ScreenReaderAnnouncer
        alerts={weather?.alerts}
        isDegraded={weather?.isDegraded}
        staleWarning={weather?.staleWarning}
      />
      <PilotOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Pilot Quick-Launch Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs">
        <span className="text-[var(--text-secondary)]">
          <strong>{t("pilot.active_label", "Stakeholder Pilot Active:")}</strong>{" "}
          {t("pilot.cohort_desc", "Punjab/UP Farmers & DDMA Emergency Officers.")}
        </span>
        <button
          onClick={() => setShowOnboarding(true)}
          className="px-3 py-1.5 rounded-xl font-semibold bg-[var(--accent-surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white border border-[var(--accent-border)] transition-colors"
        >
          {t("pilot.onboarding_guide", "Stakeholder Onboarding Guide")}
        </button>
      </div>

      {/* 1. PRIMARY: Dominant Weather Hero Centerpiece (Reference Matched) */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* 2. SECONDARY: Immediate Horizon & Live Intelligence */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("dashboard.immediate_horizon", "Immediate Horizon & Risk Intelligence")}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col">
            <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
            <WeatherMascotCard weather={weather} location={selectedLocation} />
            <WeatherRiskCenterCard location={selectedLocation} />
            <LiveEventCard />
          </div>
        </div>
      </div>

      {/* 3. TERTIARY: Specialized Meteorological Analysis */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("dashboard.regional_analysis", "Environmental & Regional Analysis")}
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

      {/* 4. DECISION INTELLIGENCE: Activity & Role Decision Support */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("activity.title", "Activity Suitability & Decision Intelligence")}
          </h2>
        </div>
        <div className="flex flex-col gap-5 lg:gap-6">
          <DecisionSupportCard location={selectedLocation} />
          <ActivitySuitabilityCard location={selectedLocation} />
        </div>
      </div>

      {/* 5. NWP INTELLIGENCE: Multi-Model Consensus & Confidence */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("consensus.title", "NWP Multi-Model Consensus & Forecast Confidence")}
          </h2>
        </div>
        <div className="w-full">
          <ModelConsensusCard location={selectedLocation} />
        </div>
      </div>

      {/* 6. UTILITY: Meteorological AI Layer */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("copilot.title", "AI Meteorological Copilot")}
          </h2>
        </div>
        <div className="w-full">
          <AICopilotCard location={selectedLocation} />
        </div>
      </div>
    </div>
  );
}
