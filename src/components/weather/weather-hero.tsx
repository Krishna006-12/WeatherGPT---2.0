"use client";

import Image from "next/image";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";
import {
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Cloud,
  AlertTriangle,
  Footprints,
} from "lucide-react";
import { FloatingElement } from "@/components/motion/FloatingElement";
import { useLanguage } from "@/context/language-context";
import { getWeatherMascot } from "@/lib/weather/mascot-helper";

interface WeatherHeroProps {
  weather?: WeatherSnapshot;
  isLoading: boolean;
  location: NormalizedLocation;
}

/**
 * 3D Volumetric Weather Centerpiece matching the reference design.
 * Rendered using high-fidelity layered SVG gradients and volumetric drop-shadows.
 */
function VolumetricWeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();

  if (c.includes("thunder") || c.includes("storm")) {
    return (
      <div className="relative w-44 h-40 sm:w-52 sm:h-44 flex items-center justify-center select-none">
        <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl overflow-visible">
          <defs>
            <linearGradient id="cloudGradStorm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="cloudShadowStorm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <filter id="boltGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Cloud Backing Ambient Shadow */}
          <ellipse cx="100" cy="110" rx="65" ry="32" fill="url(#cloudShadowStorm)" />

          {/* Main 3D Fluffy Cloud Body */}
          <path
            d="M 55 105 C 42 105, 30 94, 30 80 C 30 67, 40 57, 53 55 C 57 37, 73 24, 93 24 C 113 24, 130 38, 134 57 C 146 58, 156 68, 156 81 C 156 94, 145 105, 132 105 Z"
            fill="url(#cloudGradStorm)"
            filter="drop-shadow(0 14px 18px rgba(100, 116, 139, 0.28))"
          />
          {/* Cloud Puff Highlights */}
          <circle cx="93" cy="50" r="28" fill="#FFFFFF" opacity="0.6" />
          <circle cx="65" cy="78" r="20" fill="#FFFFFF" opacity="0.4" />

          {/* 3D Golden Lightning Bolt with intense electrical aura */}
          <path
            d="M 102 70 L 86 112 L 105 112 L 92 155 L 122 104 L 104 104 Z"
            fill="url(#boltGrad)"
            filter="url(#boltGlow)"
            stroke="#FEF08A"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  if (c.includes("rain") || c.includes("drizzle")) {
    return (
      <div className="relative w-44 h-40 sm:w-52 sm:h-44 flex items-center justify-center select-none">
        <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl overflow-visible">
          <defs>
            <linearGradient id="cloudGradRain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>

          {/* Main 3D Fluffy Cloud Body */}
          <path
            d="M 55 95 C 42 95, 30 84, 30 70 C 30 57, 40 47, 53 45 C 57 27, 73 14, 93 14 C 113 14, 130 28, 134 47 C 146 48, 156 58, 156 71 C 156 84, 145 95, 132 95 Z"
            fill="url(#cloudGradRain)"
            filter="drop-shadow(0 14px 18px rgba(56, 189, 248, 0.25))"
          />

          {/* Falling 3D Raindrops */}
          <path
            d="M 65 110 C 65 110, 60 120, 60 125 C 60 129, 63 132, 67 132 C 71 132, 74 129, 74 125 C 74 120, 65 110, 65 110 Z"
            fill="url(#dropGrad)"
            opacity="0.85"
          />
          <path
            d="M 95 118 C 95 118, 90 128, 90 133 C 90 137, 93 140, 97 140 C 101 140, 104 137, 104 133 C 104 128, 95 118, 95 118 Z"
            fill="url(#dropGrad)"
            opacity="0.95"
          />
          <path
            d="M 125 112 C 125 112, 120 122, 120 127 C 120 131, 123 134, 127 134 C 131 134, 134 131, 134 127 C 134 122, 125 112, 125 112 Z"
            fill="url(#dropGrad)"
            opacity="0.8"
          />
        </svg>
      </div>
    );
  }

  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog") || c.includes("mist")) {
    return (
      <div className="relative w-44 h-40 sm:w-52 sm:h-44 flex items-center justify-center select-none">
        <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl overflow-visible">
          <defs>
            <linearGradient id="sunPartly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="cloudPuff" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
          </defs>

          {/* Peeking Sun Behind Cloud */}
          <circle
            cx="135"
            cy="60"
            r="35"
            fill="url(#sunPartly)"
            filter="drop-shadow(0 0 20px rgba(245, 158, 11, 0.45))"
          />

          {/* Foreground Puffy 3D Cloud */}
          <path
            d="M 50 115 C 36 115, 25 104, 25 90 C 25 77, 35 67, 48 65 C 52 47, 68 34, 88 34 C 108 34, 125 48, 129 67 C 141 68, 151 78, 151 91 C 151 104, 140 115, 127 115 Z"
            fill="url(#cloudPuff)"
            filter="drop-shadow(0 16px 24px rgba(100, 116, 139, 0.22))"
          />
          <circle cx="88" cy="62" r="26" fill="#FFFFFF" opacity="0.6" />
        </svg>
      </div>
    );
  }

  // Pure Sunny / Clear (Default)
  return (
    <div className="relative w-44 h-40 sm:w-52 sm:h-44 flex items-center justify-center select-none">
      <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <radialGradient id="sunSphereGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#FACC15" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft Coronal Halo */}
        <circle cx="100" cy="90" r="75" fill="url(#sunHalo)" />

        {/* 3D Volumetric Sun Sphere */}
        <circle
          cx="100"
          cy="90"
          r="48"
          fill="url(#sunSphereGrad)"
          filter="drop-shadow(0 14px 28px rgba(245, 158, 11, 0.38))"
        />

        {/* Specular Highlight */}
        <ellipse cx="85" cy="74" rx="14" ry="8" fill="#FFFFFF" opacity="0.45" transform="rotate(-25 85 74)" />
      </svg>
    </div>
  );
}

export function WeatherHero({ weather, isLoading, location }: WeatherHeroProps) {
  const { t, language } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : language === "pa" ? "pa-IN" : "en-US";

  if (isLoading || !weather) {
    return <div className="wg-skeleton w-full min-h-[360px] rounded-3xl" />;
  }

  const { current, daily } = weather;
  const today = daily[0];

  // Dynamic Mascot character based on live weather
  const mascot = getWeatherMascot(current.condition, current.temperature, current.windSpeed);

  // Map condition to localized translation
  const condLower = current.condition.toLowerCase();
  let conditionLabel = t("condition.sunny", "Sunny");
  if (condLower.includes("clear")) conditionLabel = t("condition.clear", "Clear");
  else if (condLower.includes("partly")) conditionLabel = t("condition.partly_cloudy", "Partly Cloudy");
  else if (condLower.includes("cloud")) conditionLabel = t("condition.cloudy", "Cloudy");
  else if (condLower.includes("overcast")) conditionLabel = t("condition.overcast", "Overcast");
  else if (condLower.includes("heavy") && condLower.includes("rain")) conditionLabel = t("condition.heavy_rain", "Heavy Rain");
  else if (condLower.includes("rain")) conditionLabel = t("condition.rain", "Rain");
  else if (condLower.includes("storm") || condLower.includes("thunder")) conditionLabel = t("condition.thunderstorm", "Thunderstorm");
  else if (condLower.includes("snow")) conditionLabel = t("condition.snow", "Snow");
  else if (condLower.includes("drizzle")) conditionLabel = t("condition.drizzle", "Drizzle");

  // Environmental Indicator Estimates
  const uvVal = current.uvIndex ?? 4.5;
  const uvLabel = uvVal > 6 ? t("hero.high_badge", "High") : uvVal > 3 ? t("hero.moderate_badge", "Moderate") : t("hero.low_badge", "Low");

  // Pollution / Air Quality estimate (Clean: Low, Hazy: Moderate)
  const pollutionLabel = current.humidity > 75 ? t("hero.moderate_badge", "Moderate") : t("hero.low_badge", "Low");

  // Pollen count (higher in dry sunny winds)
  const pollenLabel = current.humidity < 45 && current.windSpeed > 15 ? t("hero.moderate_badge", "Moderate") : t("hero.low_badge", "Low");

  return (
    <section
      aria-label="Current Weather Overview"
      className="wg-surface-hero relative w-full overflow-hidden p-6 sm:p-8 rounded-[32px] transition-all duration-300"
    >
      {/* Soft Sunny Atmosphere Radial Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 select-none overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(251, 191, 36, 0.15), transparent 70%)",
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
        {/* Degraded Mode Indicator */}
        {weather.isDegraded && (
          <div
            role="status"
            aria-live="polite"
            className="w-full mb-3 px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {weather.staleWarning ||
                `Data may be stale, last updated ${
                  weather.staleSince
                    ? new Date(weather.staleSince).toLocaleTimeString()
                    : new Date(weather.observedAt).toLocaleTimeString()
                }`}
            </span>
          </div>
        )}

        {/* Screen Reader Alert Announcements */}
        {weather.alerts && weather.alerts.length > 0 && (
          <div role="status" aria-live="assertive" className="sr-only">
            {weather.alerts
              .map((a) => `${a.severity} weather alert: ${a.title}. ${a.description}`)
              .join(". ")}
          </div>
        )}

        {/* Floating Badges (Left and Right, inspired by the reference image) */}
        <div className="w-full flex items-center justify-between pointer-events-none mb-1">
          {/* Left Floating Temp Tag */}
          <FloatingElement id="hero-float-badge-left" massTier="light" envelopeScale={0.8} pressScale={false}>
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-md border border-black/[0.04] dark:border-white/10 shadow-[0_8px_25px_-12px_rgba(15,23,42,0.35)]">
              <Sun size={13} className="text-amber-500" />
              <span>{Math.round(today?.temperatureLow ?? current.temperature - 5)}°</span>
            </div>
          </FloatingElement>

          {/* Right Floating Atmospheric Pill */}
          <FloatingElement id="hero-float-badge-right" massTier="medium" envelopeScale={0.7} pressScale={false}>
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-md border border-black/[0.04] dark:border-white/10 shadow-[0_8px_25px_-12px_rgba(15,23,42,0.35)]">
              <Droplets size={13} className="text-blue-500" />
              <span>{current.humidity}%</span>
            </div>
          </FloatingElement>
        </div>

        {/* 1. Centered Location Heading & Condition Subtitle */}
        <div className="flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            {location.displayName.split(",")[0]}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-1 capitalize">
            {conditionLabel}
            {current.windSpeed > 20 && ` • ${t("metric.wind", "Wind")} ${Math.round(current.windSpeed)} km/h`}
          </p>
        </div>

        {/* 2. Character Mascot & 3D Volumetric Weather Icon */}
        <div className="my-2.5 sm:my-3 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          {/* Walking Mascot illustration corresponding to current location weather */}
          <FloatingElement id="hero-mascot-character" massTier="light" envelopeScale={0.7} pressScale={true}>
            <div
              className="relative w-28 sm:w-36 h-40 sm:h-52 rounded-2xl overflow-hidden shadow-lg border border-black/10 dark:border-white/10 group cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              title={`${mascot.title}: ${mascot.activityTip}`}
            >
              <Image
                src={mascot.imageSrc}
                alt={`${mascot.title} character mascot`}
                fill
                sizes="(max-width: 640px) 112px, 144px"
                className="object-cover object-center"
                priority
              />
              <div
                className="absolute bottom-0 inset-x-0 py-1 px-1.5 text-[9px] font-bold text-white text-center tracking-wide uppercase shadow-xs"
                style={{ background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }}
              >
                {mascot.badgeLabel}
              </div>
            </div>
          </FloatingElement>

          {/* 3D Volumetric Weather Centerpiece */}
          <FloatingElement id="hero-volumetric-centerpiece" massTier="light" envelopeScale={0.6} pressScale={true}>
            <VolumetricWeatherIcon condition={current.condition} />
          </FloatingElement>
        </div>

        {/* 3. Giant Minimalist Temperature */}
        <div className="flex items-baseline justify-center">
          <FloatingElement id="hero-giant-temp" massTier="heavy" envelopeScale={0.4} pressScale={true}>
            <span className="text-[5.5rem] sm:text-[7rem] leading-none font-extralight tracking-tighter text-[var(--text-primary)] select-none">
              {Math.round(current.temperature)}°
            </span>
          </FloatingElement>
        </div>

        {/* 4. Atmospheric Sub-Metrics (Rain Probability & Wind Speed) */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 mt-2 text-xs font-semibold text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Droplets size={14} className="text-blue-500" />
            <span>{current.humidity > 60 ? "35–40%" : "< 15%"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind size={14} className="text-cyan-500" />
            <span>{Math.round(current.windSpeed)} km/h</span>
          </div>
        </div>

        {/* Mascot Activity & Outfit Contextual Pill */}
        <div className="mt-3 px-4 py-2 rounded-full bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 backdrop-blur-md text-xs font-medium text-[var(--text-secondary)] flex items-center justify-center gap-2 max-w-full">
          <Footprints size={14} style={{ color: mascot.accentColor }} className="shrink-0" />
          <span className="truncate">{mascot.activityTip}</span>
        </div>

        {/* 5. Environmental Pill Badges Row (UV, Pollution, Pollen) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mt-5">
          {/* UV Badge */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-center wg-card-interactive cursor-default">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">{uvLabel}</span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">{t("hero.uv_index", "UV")}</span>
          </div>

          {/* Pollution / AQI Badge */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-center wg-card-interactive cursor-default">
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">{pollutionLabel}</span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">{t("hero.pollution", "Pollution")}</span>
          </div>

          {/* Pollen Badge */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-center wg-card-interactive cursor-default">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{pollenLabel}</span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">{t("hero.pollen", "Pollen")}</span>
          </div>
        </div>

        {/* 6. Mini Daily Forecast Row (Matching the reference cards carousel at the bottom) */}
        <div className="w-full mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 wg-hide-scroll">
            {daily.slice(0, 4).map((d, i) => {
              const dayDate = new Date(d.date);
              const dayTitle =
                i === 0
                  ? t("timeline.today", "Today")
                  : i === 1
                    ? t("hero.tomorrow", "Tomorrow")
                    : dayDate.toLocaleDateString(locale, { weekday: "short" });

              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[72px] p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col items-center text-center shadow-sm wg-card-interactive wg-tactile-press cursor-pointer"
                >
                  <span className="text-xs font-bold text-[var(--text-primary)]">{Math.round(d.temperatureHigh)}°</span>
                  <div className="my-1.5 text-amber-500">
                    {d.condition.includes("rain") ? (
                      <CloudRain size={16} className="text-blue-500" />
                    ) : d.condition.includes("cloud") ? (
                      <Cloud size={16} className="text-slate-400" />
                    ) : (
                      <Sun size={16} className="text-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-[var(--text-tertiary)]">{dayTitle}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
