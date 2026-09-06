import { useEvents } from "@/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherEvent } from "@/types/events";
import { globalImpactEngine } from "@/services/impact/impact-engine";

export function getEventIndiaRelevance(event: WeatherEvent): { label: string; badgeClass: string } {
  const assessment = globalImpactEngine.assessIndiaImpact(event);
  switch (assessment.level) {
    case "DIRECT": {
      const isHigh = event.severity === "extreme" || event.severity === "high" || event.severity === "critical";
      return {
        label: isHigh ? "High" : "Direct",
        badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
      };
    }
    case "REGIONAL":
    case "POSSIBLE":
      return {
        label: "Monitoring",
        badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      };
    case "LOW":
    case "NONE":
      return {
        label: "Low (Distant)",
        badgeClass: "bg-white/10 text-neutral-400 border border-white/10",
      };
    case "INSUFFICIENT_EVIDENCE":
    default:
      return {
        label: "Unknown",
        badgeClass: "bg-white/5 text-neutral-500 border border-white/5",
      };
  }
}

export function LiveEventCard() {
  const { data, isLoading, isError } = useEvents({ limit: 1 });

  if (isLoading) return <Skeleton className="h-48 rounded-3xl bg-[#1E1E1E]" />;
  if (isError || !data || data.events.length === 0) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 flex items-center justify-center min-h-[192px]">
        <p className="text-sm text-neutral-500">No active live events.</p>
      </div>
    );
  }

  const event = data.events[0];
  if (!event) return null;

  const locationText = event.locations && event.locations[0] ? `${event.locations[0].name}` : "Multiple locations";
  const indiaRelevance = getEventIndiaRelevance(event);
  const freshnessLabel = event.freshness?.label || (event.freshness?.level ? event.freshness.level.toLowerCase() : "recent");

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h3 className="font-semibold text-white truncate pr-4">{event.title}</h3>
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
          <span className="text-neutral-400">Severity</span>
          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 text-xs font-medium capitalize">{event.severity}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
          <span className="text-neutral-400">Freshness</span>
          <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-white/10 text-xs font-medium">{freshnessLabel}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
          <span className="text-neutral-400">Affected</span>
          <span className="text-neutral-200 truncate max-w-[150px]">{locationText}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
          <span className="text-neutral-400">Sources</span>
          <span className="text-neutral-200 font-medium">{event.sources ? event.sources.length : 0}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-400">India Relevance</span>
          <span className={`${indiaRelevance.badgeClass} px-2 py-0.5 rounded text-xs font-medium capitalize`}>
            {indiaRelevance.label}
          </span>
        </div>
      </div>
    </div>
  );
}

