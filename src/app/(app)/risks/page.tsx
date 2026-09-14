"use client";

import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { WeatherRiskCenterCard } from "@/components/risk/weather-risk-center-card";
import { LiveEventCard } from "@/components/events/live-event-card";
import { ImpactCard } from "@/components/impact/impact-card";
import { ShieldAlert } from "lucide-react";

export default function RisksPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center wg-animate-in">
          <ShieldAlert size={32} className="mx-auto mb-3 text-rose-400 opacity-80" />
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("risk.center_title", "Severe Weather Risk Center")}
          </h2>
          <p style={{ color: "var(--text-tertiary)" }}>
            {t("welcome.subtitle", "Search for a city above to inspect verified hazards and real-time alerts.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={22} className="text-rose-400" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {t("risk.center_title", "Severe Weather Risk Center")}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Deterministic hazard evaluation, GDACS live disaster tracking, and community infrastructure impact for {selectedLocation.displayName}.
        </p>
      </div>

      {/* Primary Risk Grid */}
      <WeatherRiskCenterCard location={selectedLocation} />

      {/* Live Disaster Events & Regional Vulnerability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <LiveEventCard />
        <ImpactCard location={selectedLocation} />
      </div>
    </div>
  );
}
