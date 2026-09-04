import { useEvents } from "@/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";

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
          <span className="text-neutral-400">Affected</span>
          <span className="text-neutral-200 truncate max-w-[150px]">{locationText}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
          <span className="text-neutral-400">Sources</span>
          <span className="text-neutral-200 font-medium">{event.sources ? event.sources.length : 0}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-400">India Relevance</span>
          <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded border border-white/10 text-xs font-medium">Low</span>
        </div>
      </div>
    </div>
  );
}

