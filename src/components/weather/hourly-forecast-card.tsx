import type { WeatherSnapshot } from "@/types/weather";
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudDrizzle, Droplets } from "lucide-react";
import { isCurrentHour, formatTime } from "@/lib/date-utils";

function getWeatherIcon(condition: string) {
  const props = { size: 20, strokeWidth: 1.5 };
  switch (condition) {
    case "clear": return <Sun {...props} className="text-[var(--status-warning)]" />;
    case "rain":
    case "heavy-rain": return <CloudRain {...props} className="text-[var(--status-info)]" />;
    case "drizzle": return <CloudDrizzle {...props} className="text-[var(--status-info)]" />;
    case "thunderstorm": return <CloudLightning {...props} className="text-purple-400" />;
    case "snow": return <Snowflake {...props} className="text-blue-200" />;
    default: return <Cloud {...props} className="text-[var(--text-secondary)]" />;
  }
}

export function HourlyForecastCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <div className="wg-skeleton h-44 w-full" />;

  const timezone = weather.location.timezone;
  const hourly = weather.hourly;

  return (
    <section
      aria-label="Hourly Weather Forecast"
      className="wg-surface-timeline flex flex-col w-full p-5 sm:p-6 wg-animate-in wg-stagger-2"
    >
      {/* Header with clear Next 24 Hours title */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Next 24 Hours
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
            Timeline
          </span>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
          {timezone}
        </span>
      </div>

      {/* Continuous Timeline Container */}
      <div className="relative w-full overflow-hidden">
        {/* Continuous horizontal guide rail */}
        <div className="absolute left-0 right-0 top-[46px] h-px bg-[var(--border-subtle)] pointer-events-none" />

        <div
          className="flex overflow-x-auto pb-2 pt-1 gap-1 wg-hide-scroll snap-x scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {hourly.map((h) => {
            const isNow = isCurrentHour(h.time, timezone);
            const hasPrecip = h.precipitationProbability > 0;

            return (
              <div
                key={h.time}
                className={`flex flex-col items-center flex-shrink-0 snap-start relative px-2.5 py-2 rounded-xl transition-all duration-150 min-w-[64px] sm:min-w-[70px] ${
                  isNow
                    ? "bg-[var(--accent-surface)] border border-[var(--accent-border)]"
                    : "hover:bg-[var(--surface-2)] border border-transparent"
                }`}
              >
                {/* Time label — note: no inner div so closest('div') points to this slot */}
                <span
                  className={`text-xs font-semibold mb-2.5 flex items-center gap-1 ${
                    isNow ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {isNow && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                  {isNow ? "Now" : formatTime(h.time, timezone)}
                </span>

                {/* Weather Icon anchored on the guide rail */}
                <div className="relative z-10 flex items-center justify-center h-7 mb-1.5">
                  {getWeatherIcon(h.condition)}
                </div>

                {/* Temperature value */}
                <span
                  className={`text-sm font-semibold tracking-tight ${
                    isNow ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {Math.round(h.temperature)}°
                </span>

                {/* Precipitation indicator */}
                <div className="flex items-center justify-center gap-0.5 h-3.5 mt-1">
                  {hasPrecip ? (
                    <>
                      <Droplets size={9} className="text-[var(--accent)]" />
                      <span className="text-[10px] font-medium text-[var(--accent)]">
                        {Math.round(h.precipitationProbability)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-transparent select-none">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
