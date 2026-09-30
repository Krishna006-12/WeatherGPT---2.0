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
import { ProductTourModal } from "@/components/onboarding/product-tour-modal";
import { VoiceBriefingModal } from "@/components/audio/voice-briefing-modal";
import { useState } from "react";
import { HelpCircle, Sparkles, Radio } from "lucide-react";

export default function DashboardPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVoiceBriefing, setShowVoiceBriefing] = useState(false);
  const [showTour, setShowTour] = useState(false);

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
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-7 pb-20 md:pb-16">
      <ScreenReaderAnnouncer
        alerts={weather?.alerts}
        isDegraded={weather?.isDegraded}
        staleWarning={weather?.staleWarning}
      />
      <PilotOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      <ProductTourModal
        isOpen={showTour}
        onClose={() => setShowTour(false)}
      />
      <VoiceBriefingModal
        isOpen={showVoiceBriefing}
        onClose={() => setShowVoiceBriefing(false)}
        weather={weather}
        location={selectedLocation}
      />

      {/* 1. PRIMARY: Dominant Weather Hero Centerpiece */}
      <WeatherHero weather={weather} isLoading={isWeatherLoading} location={selectedLocation} />

      {/* Atmospheric Intelligence Provenance & Pilot Guide Bar */}
      <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)] min-w-0">
          <Sparkles size={14} className="text-cyan-400 shrink-0" />
          <span className="truncate">
            <strong className="text-[var(--text-primary)] font-semibold">Atmospheric Engine:</strong> Multi-sensor ECMWF & GFS synthesis with automated risk profiling.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg font-medium text-xs bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 transition active:scale-95 shadow-sm"
            title="Interactive Feature Tutorial Tour"
          >
            <Sparkles size={13} className="text-cyan-400" />
            <span>{t("tour.button", "App Tour")}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceBriefing(true)}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg font-medium text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition active:scale-95 shadow-sm"
            title="Listen to 60-second AI Voice Meteorological Briefing"
          >
            <Radio size={13} className="animate-pulse text-cyan-400" />
            <span>AI Voice Briefing</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="wg-btn-ghost text-xs flex items-center gap-1.5 py-1 px-2.5"
            title="Open Stakeholder Guide"
          >
            <HelpCircle size={13} />
            <span className="hidden sm:inline">{t("pilot.onboarding_guide", "Pilot Guide")}</span>
          </button>
        </div>
      </div>

      {/* 2. SECONDARY: Immediate Horizon & Live Intelligence */}
      <div id="risk-section" className="flex flex-col gap-3 scroll-mt-20">
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
