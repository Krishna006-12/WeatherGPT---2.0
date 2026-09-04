import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";

interface WeatherHeroProps {
  weather?: WeatherSnapshot;
  isLoading: boolean;
  location: NormalizedLocation;
}

export function WeatherHero({ weather, isLoading, location }: WeatherHeroProps) {
  if (isLoading || !weather) {
    return <Skeleton className="w-full h-[280px] rounded-3xl bg-[#1E1E1E]" />;
  }

  const { current, daily } = weather;
  const today = daily[0];

  const date = new Date(current.observedAt);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: location.timezone });
  const formattedDate = date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: location.timezone });

  const getMascot = (condition: string) => {
    switch(condition) {
      case "clear": return "☀️";
      case "rain":
      case "heavy-rain":
      case "drizzle": return "☔";
      case "thunderstorm": return "⚡";
      case "snow": return "⛄";
      default: return "☁️";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#1C1C1E] p-8 min-h-[280px] flex flex-col justify-between border border-white/5">
      <div className="absolute -top-24 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      
      <div className="flex justify-between items-start z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 backdrop-blur-md border border-white/10 mb-4">
            <MapPin size={12} />
            {location.displayName.split(",")[0]}
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">{dayName}</h2>
          <p className="text-sm text-neutral-400">{formattedDate}</p>
        </div>
        <div className="flex gap-2">
          <div className="px-2 py-1 bg-white/10 rounded text-xs font-medium cursor-pointer hover:bg-white/20 transition-colors">F</div>
          <div className="px-2 py-1 bg-white/20 rounded text-xs font-medium cursor-default">C</div>
        </div>
      </div>

      <div className="flex justify-between items-end z-10 mt-8">
        <div className="flex items-baseline gap-4">
          <h1 className="text-7xl font-bold tracking-tighter text-white">
            {Math.round(current.temperature)}&deg;C
          </h1>
          {today && (
            <p className="text-sm font-medium text-neutral-400 pb-2">
              High: {Math.round(today.temperatureHigh)}&deg; Low: {Math.round(today.temperatureLow)}&deg;
            </p>
          )}
        </div>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full mb-2 relative shadow-[0_0_30px_rgba(37,99,235,0.4)]">
             <div className="absolute inset-0 flex items-center justify-center text-5xl">
                {getMascot(current.condition)}
             </div>
          </div>
          <p className="text-lg font-semibold capitalize">{current.condition.replace("-", " ")}</p>
          <p className="text-xs text-neutral-400">Feels like {Math.round(current.feelsLike)}&deg;</p>
        </div>
      </div>
    </div>
  );
}

