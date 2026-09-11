import { useImpact } from "@/hooks/use-impact";
import { useEvents } from "@/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";

export function ImpactCard({ location }: { location?: NormalizedLocation | null }) {
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ limit: 1 });
  const event = eventsData?.events[0];
  
  const { data: impact, isLoading: impactLoading } = useImpact({
    eventId: event?.id,
    lat: location?.latitude,
    lon: location?.longitude,
    city: location?.displayName.split(",")[0],
    country: location?.country,
  });

  if (eventsLoading || (event && impactLoading)) return <Skeleton className="h-48 rounded-3xl bg-[#1E1E1E]" />;
  if (!location) return null;

  if (!event) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 flex flex-col justify-between min-h-[192px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">Regional Impact</h3>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-neutral-400">
            Unassessed
          </div>
        </div>
        <p className="text-sm text-neutral-400">
          No verified event impact assessment is currently available for this location.
        </p>
      </div>
    );
  }

  const relevanceColor =
    impact?.relevanceStatus === "confirmed"
      ? "text-red-400 bg-red-500/10 border-red-500/20"
      : impact?.relevanceStatus === "likely" || impact?.relevanceStatus === "possible"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-neutral-400 bg-white/5 border-white/5";

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white uppercase tracking-wide text-sm">Selected Location Impact</h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-950/40 border border-cyan-900/50 rounded-full text-[10px] font-medium text-cyan-400">
          <CheckCircle2 size={12} /> Grounded
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-sm font-medium text-neutral-200">{location.displayName.split(",")[0]}</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${relevanceColor}`}>
              {impact ? impact.relevanceStatus : "Monitoring"}
            </span>
          </div>
        </div>

        {impact?.actualHazardImpact && (
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-neutral-300">
            <div className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider mb-1">
              Hazard Assessment
            </div>
            {impact.actualHazardImpact}
          </div>
        )}

        {impact?.advisory && (
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/30 text-xs text-cyan-300">
            <div className="text-[10px] font-semibold uppercase text-cyan-400 tracking-wider mb-1">
              Advisory
            </div>
            {impact.advisory}
          </div>
        )}
      </div>
    </div>
  );
}

