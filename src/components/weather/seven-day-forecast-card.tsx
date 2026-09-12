import type { WeatherSnapshot } from "@/types/weather";
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudDrizzle, Droplets } from "lucide-react";
import { formatDayName } from "@/lib/date-utils";

function getWeatherIcon(condition: string) {
  const props = { size: 17, strokeWidth: 1.5 };
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

export function SevenDayForecastCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <div className="wg-skeleton h-64 w-full" />;

  const timezone = weather.location.timezone;
  const days = weather.daily.slice(0, 7);

  if (days.length === 0) {
    return (
      <div className="wg-card flex flex-col justify-center items-center min-h-[200px] p-6 text-center">
        <p className="text-sm font-medium text-[var(--text-tertiary)]">7-Day forecast unavailable</p>
      </div>
    );
  }

  // Calculate global min/max for proportional temperature bars
  const allLows = days.map((d) => d.temperatureLow);
  const allHighs = days.map((d) => d.temperatureHigh);
  const globalMin = Math.min(...allLows);
  const globalMax = Math.max(...allHighs);
  const range = globalMax - globalMin || 1;

  return (
    <section
      aria-label="7-Day Weather Forecast"
      className="wg-surface-timeline flex flex-col justify-between h-full p-5 sm:p-6 wg-animate-in wg-stagger-3"
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            7-Day Forecast
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
            Weekly Cycle
          </span>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Synoptic Model
        </span>
      </div>

      <div className="flex flex-col flex-1 justify-between divide-y divide-[var(--border-subtle)]">
        {days.map((day, i) => {
          const label = i === 0 ? "Today" : formatDayName(day.date, timezone, "long");

          // Proportional range bar calculation
          const leftPct = ((day.temperatureLow - globalMin) / range) * 100;
          const widthPct = ((day.temperatureHigh - day.temperatureLow) / range) * 100;

          return (
            <div
              key={day.date}
              className="flex items-center justify-between py-2.5 group transition-colors duration-150"
            >
              {/* Day Name & Weather Icon */}
              <div className="flex items-center gap-3 flex-shrink-0" style={{ width: "135px" }}>
                <span
                  className={`text-sm font-medium ${
                    i === 0 ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)]"
                  }`}
                  style={{ width: "68px" }}
                >
                  {label}
                </span>

                <span className="flex items-center justify-center w-5">
                  {getWeatherIcon(day.condition)}
                </span>

                {day.precipitationProbability > 0 && (
                  <div className="flex items-center gap-0.5 text-[10px] font-semibold text-[var(--status-info)]">
                    <Droplets size={9} />
                    <span>{Math.round(day.precipitationProbability)}%</span>
                  </div>
                )}
              </div>

              {/* Temperature Range Bar */}
              <div className="flex items-center gap-3 flex-1 justify-end max-w-[200px] ml-2">
                <span className="text-xs font-medium text-[var(--text-tertiary)] w-7 text-right">
                  {Math.round(day.temperatureLow)}°
                </span>

                <div className="relative h-1.5 rounded-full flex-1 bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-full transition-all duration-200"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 8)}%`,
                      background: "linear-gradient(90deg, var(--status-info), var(--status-warning))",
                      opacity: 0.85,
                    }}
                  />
                </div>

                <span className="text-xs font-semibold text-[var(--text-primary)] w-7 text-right">
                  {Math.round(day.temperatureHigh)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
