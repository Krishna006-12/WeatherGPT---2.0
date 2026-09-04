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

  if (eventsLoading || impactLoading) return <Skeleton className="h-48 rounded-3xl bg-[#1E1E1E]" />;
  if (!event || !location) return null;

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white uppercase tracking-wide text-sm">Regional Impact</h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-950/40 border border-cyan-900/50 rounded-full text-[10px] font-medium text-cyan-400">
          <CheckCircle2 size={12} /> Grounded
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-sm font-medium text-neutral-200">{location.displayName.split(",")[0]}</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${impact && impact.impactLevel !== "none" ? "bg-amber-500" : "bg-neutral-500"}`} />
            <span className="text-xs text-neutral-400 capitalize">{impact ? impact.relevanceStatus : "Monitoring"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

