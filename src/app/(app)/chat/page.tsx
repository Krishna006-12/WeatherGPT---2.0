"use client";

import { useLocation } from "@/context/location-context";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";

export default function ChatPage() {
  const { selectedLocation } = useLocation();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          WeatherGPT Copilot
        </h1>
        <p className="text-sm text-neutral-400">
          Grounded meteorological AI dialogue with real-time tool grounding, GDACS hazard context, and multi-turn inquiry.
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
