"use client";

import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";

export default function CopilotPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {t("copilot.title", "WeatherGPT AI Copilot")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Grounded meteorological AI dialogue with live NWP ensemble data, ICAR agricultural protocols, and multi-turn inquiry.
        </p>
      </div>

      <AICopilotCard
        location={selectedLocation}
        initialExpanded={true}
        fullHeight={true}
        hideCollapse={true}
      />
    </div>
  );
}
