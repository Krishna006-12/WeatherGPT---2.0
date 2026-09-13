import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";
import { Droplets, Wind, Eye, Gauge } from "lucide-react";

import { FloatingElement } from "@/components/motion/FloatingElement";

interface WeatherHeroProps {
  weather?: WeatherSnapshot;
  isLoading: boolean;
  location: NormalizedLocation;
}

function getEnvBackground(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("clear") || c.includes("sun")) return "wg-env-clear";
  if (c.includes("rain") || c.includes("drizzle")) return "wg-env-rain";
  if (c.includes("storm") || c.includes("thunder")) return "wg-env-storm";
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog") || c.includes("mist")) return "wg-env-cloudy";
  return "wg-env-clear";
}

/**
 * Atmospheric Vector Backdrop integrated directly into the hero canvas.
 * Spans the right and background of the hero rather than acting like a separate widget.
 */
function AtmosphericCanopy({ condition }: { condition: string }) {
  const c = condition.toLowerCase();

  if (c.includes("clear") || c.includes("sun")) {
    return (
      <svg
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute right-0 top-0 h-full w-2/3 md:w-1/2 pointer-events-none opacity-40 select-none overflow-hidden"
        preserveAspectRatio="xMaxYMid meet"
      >
        <defs>
          <radialGradient id="solarAura" cx="80%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="45%" stopColor="#FBBF24" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="340" cy="50" r="160" fill="url(#solarAura)" />
        <circle cx="340" cy="50" r="85" stroke="#FDE68A" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.3" />
        <circle cx="340" cy="50" r="50" stroke="#FBBF24" strokeWidth="1.5" strokeOpacity="0.4" />
        {/* Radiating atmospheric vectors */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 340 + Math.cos(rad) * 60;
          const y1 = 50 + Math.sin(rad) * 60;
          const x2 = 340 + Math.cos(rad) * 80;
          const y2 = 50 + Math.sin(rad) * 80;
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#FDE68A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.25"
            />
          );
        })}
      </svg>
    );
  }

  if (c.includes("rain") || c.includes("drizzle")) {
    return (
      <svg
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute right-0 top-0 h-full w-2/3 md:w-1/2 pointer-events-none opacity-40 select-none overflow-hidden"
        preserveAspectRatio="xMaxYMid meet"
      >
        <defs>
          <linearGradient id="rainAtmosphere" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Layered fluid cloud contours */}
        <path
          d="M 200 40 C 240 20, 300 25, 340 50 C 370 70, 400 85, 420 120 L 220 120 Z"
          fill="#334155"
          opacity="0.3"
        />
        <path
          d="M 180 75 C 230 45, 290 50, 330 80 C 360 100, 390 105, 410 135 L 180 135 Z"
          fill="#475569"
          opacity="0.4"
        />
        {/* Ambient rain strands */}
        {[
          { x1: 240, y1: 100, x2: 220, y2: 170 },
          { x1: 275, y1: 90, x2: 255, y2: 160 },
          { x1: 310, y1: 110, x2: 290, y2: 180 },
          { x1: 345, y1: 95, x2: 325, y2: 165 },
          { x1: 380, y1: 105, x2: 360, y2: 175 },
        ].map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#38BDF8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />
        ))}
      </svg>
    );
  }

  if (c.includes("storm") || c.includes("thunder")) {
    return (
      <svg
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute right-0 top-0 h-full w-2/3 md:w-1/2 pointer-events-none opacity-40 select-none overflow-hidden"
        preserveAspectRatio="xMaxYMid meet"
      >
        <path
          d="M 190 60 C 230 30, 300 35, 340 65 C 375 90, 410 95, 430 135 L 170 135 Z"
          fill="#1E1B4B"
          opacity="0.5"
        />
        <polygon
          points="310,95 295,125 308,125 298,160 325,120 312,120"
          fill="#FBBF24"
          opacity="0.75"
        />
      </svg>
    );
  }

  // Cloud/overcast atmospheric canopy
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute right-0 top-0 h-full w-2/3 md:w-1/2 pointer-events-none opacity-40 select-none overflow-hidden"
      preserveAspectRatio="xMaxYMid meet"
    >
      <path
        d="M 210 50 C 250 25, 320 30, 360 65 C 390 90, 420 100, 440 140 L 190 140 Z"
        fill="#334155"
        opacity="0.3"
      />
      <path
        d="M 170 85 C 220 55, 285 60, 330 95 C 360 115, 395 120, 420 155 L 160 155 Z"
        fill="#475569"
        opacity="0.35"
      />
    </svg>
  );
}

export function WeatherHero({ weather, isLoading, location }: WeatherHeroProps) {
  if (isLoading || !weather) {
    return <div className="wg-skeleton w-full min-h-[300px]" />;
  }

  const { current, daily } = weather;
  const today = daily[0];

  const date = new Date(current.observedAt);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: location.timezone });
  const formattedDate = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: location.timezone,
  });

  const envClass = getEnvBackground(current.condition);

  return (
    <section
      aria-label="Current Weather Overview"
      className={`wg-surface-hero relative w-full overflow-hidden wg-animate-in wg-stagger-1 ${envClass}`}
    >
      {/* Integrated ambient atmospheric vector canopy */}
      <AtmosphericCanopy condition={current.condition} />

      {/* Main Content Area — purposeful, tight vertical footprint */}
      <div className="relative z-10 p-6 sm:p-7 md:p-8 flex flex-col justify-between">
        {/* Top Telemetry & Location Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {location.displayName.split(",")[0]}
                </h1>
                <span className="text-xs font-semibold text-neutral-400">
                  • {location.country}
                </span>
              </div>
              <span className="text-xs text-[var(--text-tertiary)] mt-0.5 font-medium">
                {dayName}, {formattedDate} • {location.timezone}
              </span>
            </div>
          </div>

          {/* Telemetry Status Indicator */}
          <div className="flex items-center gap-2">
            <FloatingElement id="hero-telemetry-badge" massTier="light" envelopeScale={0.7} pressScale={false}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry Feed
              </span>
            </FloatingElement>
          </div>
        </div>

        {/* Centerpiece: Dominant Temperature, Condition, and Core Reading */}
        <div className="py-6 sm:py-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <FloatingElement id="hero-temperature-dial" massTier="heavy" envelopeScale={0.5} pressScale={true}>
                <span className="text-[5.5rem] sm:text-[7rem] md:text-[8.5rem] leading-[0.88] font-extralight tracking-tighter text-[var(--text-primary)] select-none inline-block">
                  {Math.round(current.temperature)}°
                </span>
              </FloatingElement>
            </div>

            {/* Condition descriptor & temperature relationships */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm font-medium">
              <span className="text-base sm:text-lg font-semibold capitalize text-[var(--text-primary)]">
                {current.condition.replace("-", " ")}
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="text-[var(--text-secondary)]">
                Feels like {Math.round(current.feelsLike)}°
              </span>
              {today && (
                <>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span className="text-[var(--text-secondary)]">
                    High {Math.round(today.temperatureHigh)}° / Low {Math.round(today.temperatureLow)}°
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Condition Context */}
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-tertiary)] mb-1">
              Current Horizon
            </span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {current.humidity < 40 ? "Dry Atmosphere" : current.humidity > 70 ? "Humid Atmosphere" : "Temperate Atmosphere"}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Wind from {Math.round(current.windSpeed)} km/h
            </span>
          </div>
        </div>

        {/* Integrated Secondary Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col shadow-inner">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mb-1">
              <Droplets size={13} className="text-[var(--status-info)]" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Humidity</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {current.humidity}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col shadow-inner">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mb-1">
              <Wind size={13} className="text-[var(--status-warning)]" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Wind Speed</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {Math.round(current.windSpeed)} km/h
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col shadow-inner">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mb-1">
              <Eye size={13} className="text-[var(--accent)]" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Visibility</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {current.visibility !== undefined ? `${(current.visibility / 1000).toFixed(1)} km` : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col shadow-inner">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mb-1">
              <Gauge size={13} className="text-purple-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Pressure</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {current.pressure} hPa
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
