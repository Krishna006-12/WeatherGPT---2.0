import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherSnapshot } from "@/types/weather";

export function SunriseCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <Skeleton className="h-64 rounded-3xl bg-[#1E1E1E]" />;
  
  const today = weather.daily[0];
  if (!today) return null;

  const sunrise = new Date(today.sunrise);
  const sunset = new Date(today.sunset);
  
  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  
  // Calculate length of day
  const diff = sunset.getTime() - sunrise.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff / (1000 * 60)) % 60);

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col justify-between border border-white/5 relative overflow-hidden">
      <div className="absolute top-12 left-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      
      <div className="z-10">
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider mb-1 uppercase">Sunrise</h4>
        <div className="text-3xl font-bold text-white mb-6">{formatTime(sunrise)}</div>
        
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider mb-1 uppercase">Sunset</h4>
        <div className="text-3xl font-bold text-white">{formatTime(sunset)}</div>
      </div>

      <div className="z-10 mt-6">
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider mb-1 uppercase">Length of Day</h4>
        <div className="text-lg font-medium text-white">{hours}h {mins}m</div>
      </div>
    </div>
  );
}

