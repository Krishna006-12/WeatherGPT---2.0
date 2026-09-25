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
import { ModelConsensusCard } from "@/components/weather/model-consensus-card";
import { ActivitySuitabilityCard } from "@/components/activity/activity-suitability-card";
import { DecisionSupportCard } from "@/components/persona/decision-support-card";
import { ScreenReaderAnnouncer } from "@/components/common/screen-reader-announcer";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";
import { PilotOnboardingModal } from "@/components/onboarding/pilot-onboarding-modal";
import { useState } from "react";
import { HelpCircle, Sparkles } from "lucide-react";

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
    <div className="flex flex-col gap-6 lg:gap-7 pb-16">
      <ScreenReaderAnnouncer
        alerts={weather?.alerts}
        isDegraded={weather?.isDegraded}
        staleWarning={weather?.staleWarning}
      />
      <PilotOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* 1. PRIMARY: Dominant Weather Hero Centerpiece (Reference Matched) */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* Quick AI Intelligence & Copilot Launcher (Heuristic 14: Copilot accessibility without scrolling) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] items-center">
        <div className="md:col-span-8 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">
              WeatherGPT Meteorological Reasoning
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Ask AI about precipitation timing, road transit risks, or crop spraying advisory.
            </span>
          </div>
        </div>

        <div className="md:col-span-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="wg-btn-ghost text-xs flex items-center gap-1.5"
            title="Open Stakeholder Guide"
          >
            <HelpCircle size={14} />
            <span>{t("pilot.onboarding_guide", "Pilot Guide")}</span>
          </button>

          <a
            href="#copilot-section"
            className="wg-btn-primary text-xs"
          >
            <span>Ask Copilot</span>
            <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-white/20 text-[10px] font-mono">⌘K</kbd>
          </a>
        </div>
      </div>

      {/* 2. SECONDARY: Immediate Horizon & Live Intelligence (Heuristic 7: Removed all-caps, Heuristic 15: Removed duplicate mascot) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            {t("dashboard.immediate_horizon", "Immediate Horizon & Risk Intelligence")}
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
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
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

      {/* 4. DECISION INTELLIGENCE: Distinct Visual Separation (Heuristic 17: Split into two clear sections) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            Stakeholder Decision Support &amp; Action Protocol
          </h2>
        </div>
        <div className="w-full">
          <DecisionSupportCard location={selectedLocation} />
        </div>
      </div>

      {/* 4B. ACTIVITY SUITABILITY INTELLIGENCE */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            {t("activity.title", "Activity Suitability & Threshold Assessment")}
          </h2>
        </div>
        <div className="w-full">
          <ActivitySuitabilityCard location={selectedLocation} />
        </div>
      </div>

      {/* 5. NWP INTELLIGENCE: Multi-Model Consensus & Confidence */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            {t("consensus.title", "NWP Multi-Model Consensus & Forecast Confidence")}
          </h2>
        </div>
        <div className="w-full">
          <ModelConsensusCard location={selectedLocation} />
        </div>
      </div>

      {/* 6. UTILITY: Meteorological AI Layer (Accessible anchor point for ⌘K or quick scroll) */}
      <div id="copilot-section" className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
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
