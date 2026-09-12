import type { WeatherSnapshot } from "@/types/weather";
import { Sunrise, Sunset } from "lucide-react";

export function SunriseCard({ weather, isLoading }: { weather?: WeatherSnapshot; isLoading: boolean }) {
  if (isLoading || !weather) return <div className="wg-skeleton h-56 w-full" />;

  const today = weather.daily[0];
  if (!today) return null;

  const timezone = weather.location.timezone;
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(d);
  };

  // Calculate daylight duration
  const sunriseMs = new Date(today.sunrise).getTime();
  const sunsetMs = new Date(today.sunset).getTime();
  const diff = sunsetMs - sunriseMs;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff / (1000 * 60)) % 60);

  // Calculate sun position along daylight arc (0 = sunrise, 1 = sunset)
  const currentNow = weather.current?.observedAt
    ? new Date(weather.current.observedAt).getTime()
    : sunriseMs;
  const isDaytime = currentNow >= sunriseMs && currentNow <= sunsetMs;
  const progress = Math.max(0, Math.min(1, (currentNow - sunriseMs) / (sunsetMs - sunriseMs || 1)));

  // Parabolic SVG coordinates: (25, 80) to (140, 15) to (255, 80)
  // B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const sunX = 25 + progress * 230;
  const sunY = (1 - progress) * (1 - progress) * 80 + 2 * (1 - progress) * progress * 15 + progress * progress * 80;

  return (
    <section
      aria-label="Sunrise and Sunset Times"
      className="wg-surface-ephemeris flex flex-col justify-between h-full p-5 sm:p-6 wg-animate-in wg-stagger-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Sunrise & Sunset
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Celestial Arc
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-300">
          {hours}h {mins}m of daylight
        </span>
      </div>

      {/* Prominent, Vivid Daylight Arc Visual Story */}
      <div className="relative w-full h-28 my-1 flex items-center justify-center">
        <svg viewBox="0 0 280 100" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Luminous amber arc gradient */}
            <linearGradient id="vividCelestialArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Soft radiant aura fill under the arc */}
            <linearGradient id="daylightUnderFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>

            {/* Sun orb radial glow */}
            <radialGradient id="sunDiskAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Shaded daylight zone under parabolic arc */}
          <path
            d="M 25 80 Q 140 15 255 80 Z"
            fill="url(#daylightUnderFill)"
          />

          {/* High-visibility horizon baseline */}
          <line x1="10" y1="80" x2="270" y2="80" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Complete parabolic trajectory (Visible even at night) */}
          <path
            d="M 25 80 Q 140 15 255 80"
            fill="none"
            stroke="rgba(245, 158, 11, 0.35)"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />

          {/* Bold, illuminated daylight trajectory */}
          <path
            d="M 25 80 Q 140 15 255 80"
            fill="none"
            stroke="url(#vividCelestialArc)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDashoffset={isDaytime ? 250 * (1 - progress) : 250}
            strokeDasharray="250"
          />

          {/* Sun indicator positioned along the arc with radiant beacon */}
          {isDaytime ? (
            <g transform={`translate(${sunX}, ${sunY})`}>
              <circle r="14" fill="url(#sunDiskAura)" />
              <circle r="6" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2.5" />
              <line x1="0" y1="7" x2="0" y2={80 - sunY} stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="2 2" strokeOpacity="0.6" />
            </g>
          ) : (
            <g transform="translate(25, 80)">
              <circle r="6" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />
            </g>
          )}

          {/* Zenith / Peak Indicator */}
          <text x="140" y="32" textAnchor="middle" fill="#FBBF24" fontSize="9" fontWeight="700" letterSpacing="0.08em" opacity="0.8">
            ZENITH • NOON
          </text>
        </svg>
      </div>

      {/* Sunrise & Sunset Anchors */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-amber-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Sunrise size={17} className="text-amber-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-neutral-400">Sunrise</span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              {formatTime(today.sunrise)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 text-right">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-neutral-400">Sunset</span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              {formatTime(today.sunset)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Sunset size={17} className="text-amber-300" />
          </div>
        </div>
      </div>
    </section>
  );
}
