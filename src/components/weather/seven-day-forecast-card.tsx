import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherSnapshot } from "@/types/weather";
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake } from "lucide-react";
import { formatDayName } from "@/lib/date-utils";

function getWeatherIcon(condition: string) {
  switch (condition) {
    case "clear": return <Sun size={20} />;
    case "rain":
    case "heavy-rain":
    case "drizzle": return <CloudRain size={20} />;
    case "thunderstorm": return <CloudLightning size={20} />;
    case "snow": return <Snowflake size={20} />;
    default: return <Cloud size={20} />;
  }
}

export function SevenDayForecastCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <Skeleton className="h-64 rounded-3xl bg-[#1E1E1E]" />;

  const timezone = weather.location.timezone;
  // Use up to 7 available daily forecasts
  const days = weather.daily.slice(0, 7);

  if (days.length === 0) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col justify-center items-center border border-white/5 h-full min-h-[200px]">
        <p className="text-sm text-neutral-400">7-Day forecast unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col border border-white/5 h-full">
      <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-xs">7-Day Forecast</h3>
      
      <div className="flex flex-col flex-1 justify-between gap-2">
        {days.map((day, i) => {
          // Label first item as "Today" for clarity, otherwise day name
          const label = i === 0 ? "Today" : formatDayName(day.date, timezone, "long");
          
          return (
            <div key={day.date} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-sm font-medium text-neutral-200 w-24">{label}</span>
                <span className="text-cyan-400">{getWeatherIcon(day.condition)}</span>
                
                {day.precipitationProbability > 0 && (
                  <span className="text-xs text-blue-400 font-medium w-10">
                    {Math.round(day.precipitationProbability)}%
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white w-8 text-right">{Math.round(day.temperatureHigh)}&deg;</span>
                <div className="w-16 h-1.5 rounded-full bg-neutral-800 relative">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-amber-500 rounded-full w-full opacity-70" />
                </div>
                <span className="text-sm font-medium text-neutral-400 w-8 text-right">{Math.round(day.temperatureLow)}&deg;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

