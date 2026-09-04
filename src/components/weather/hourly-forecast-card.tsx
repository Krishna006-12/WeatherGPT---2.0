import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherSnapshot } from "@/types/weather";
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake } from "lucide-react";
import { isCurrentHour, formatTime } from "@/lib/date-utils";

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

export function HourlyForecastCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <Skeleton className="h-64 rounded-3xl bg-[#1E1E1E]" />;

  const timezone = weather.location.timezone;
  const hourly = weather.hourly.slice(0, 5); // take next 5 hours
  const tomorrow = weather.daily[1];

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col justify-between border border-white/5 h-full">
      <div>
        <h3 className="font-semibold text-white mb-4">Today / Week</h3>
        <div className="flex justify-between items-center px-2">
          {hourly.map((h) => {
            const isNow = isCurrentHour(h.time, timezone);
            return (
              <div key={h.time} className={`flex flex-col items-center gap-2 ${isNow ? "bg-white/10 rounded-2xl py-3 px-2 border border-white/10" : "py-3 px-2"}`}>
                <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">{isNow ? "Now" : formatTime(h.time, timezone)}</span>
                <span className={isNow ? "text-cyan-400" : "text-white"}>{getWeatherIcon(h.condition)}</span>
                <span className="text-sm font-semibold">{Math.round(h.temperature)}&deg;</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {tomorrow && (
        <div className="mt-4 bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5">
          <div>
            <h4 className="text-sm font-semibold text-white">Tomorrow</h4>
            <p className="text-xs text-neutral-400 capitalize">{tomorrow.condition.replace("-", " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">{Math.round(tomorrow.temperatureHigh)}&deg;</span>
            <span className="text-blue-500">{getWeatherIcon(tomorrow.condition)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

