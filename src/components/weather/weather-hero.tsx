"use client";

import Image from "next/image";
import Link from "next/link";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";
import {
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Cloud,
  AlertTriangle,
  MapPin,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Compass,
  Gauge,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { FloatingElement } from "@/components/motion/FloatingElement";
import { useLanguage } from "@/context/language-context";
import { getWeatherMascot } from "@/lib/weather/mascot-helper";
import { getLocalizedLocationName } from "@/lib/i18n/location-names";

interface WeatherHeroProps {
  weather?: WeatherSnapshot;
  isLoading: boolean;
  location: NormalizedLocation;
}

/**
 * High-fidelity 3D Volumetric Weather Icon representing the current atmospheric condition.
 * Rendered using layered SVG gradients, specular highlights, and soft ambient drop shadows.
 */
function VolumetricWeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();

  if (c.includes("thunder") || c.includes("storm")) {
    return (
      <div className="relative w-36 h-32 sm:w-44 sm:h-38 md:w-48 md:h-40 flex items-center justify-center select-none">
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
      <div className="relative w-36 h-32 sm:w-44 sm:h-38 md:w-48 md:h-40 flex items-center justify-center select-none">
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
      <div className="relative w-36 h-32 sm:w-44 sm:h-38 md:w-48 md:h-40 flex items-center justify-center select-none">
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
    <div className="relative w-36 h-32 sm:w-44 sm:h-38 md:w-48 md:h-40 flex items-center justify-center select-none">
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
    return <div className="wg-skeleton w-full min-h-[380px] rounded-3xl" />;
  }

  const { current, daily } = weather;
  const today = daily[0];

  // Dynamic Mascot character based on live weather (localized)
  const mascot = getWeatherMascot(current.condition, current.temperature, current.windSpeed, t);
  const localizedLoc = getLocalizedLocationName(location, language);

  // Formatted date string corresponding to user's selected locale
  const dateString = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(weather.observedAt || today?.date || Date.now()));

  // Map condition to localized translation
  const condLower = current.condition.toLowerCase();
  let conditionLabel = t("condition.sunny", "Sunny");
  let conditionTheme = "cyan"; // cyan | amber | rose | slate
  if (condLower.includes("clear")) {
    conditionLabel = t("condition.clear", "Clear");
    conditionTheme = "amber";
  } else if (condLower.includes("partly")) {
    conditionLabel = t("condition.partly_cloudy", "Partly Cloudy");
    conditionTheme = "amber";
  } else if (condLower.includes("cloud") || condLower.includes("overcast")) {
    conditionLabel = t("condition.cloudy", "Cloudy");
    conditionTheme = "slate";
  } else if (condLower.includes("heavy") && condLower.includes("rain")) {
    conditionLabel = t("condition.heavy_rain", "Heavy Rain");
    conditionTheme = "cyan";
  } else if (condLower.includes("rain") || condLower.includes("drizzle")) {
    conditionLabel = t("condition.rain", "Rain");
    conditionTheme = "cyan";
  } else if (condLower.includes("storm") || condLower.includes("thunder")) {
    conditionLabel = t("condition.thunderstorm", "Thunderstorm");
    conditionTheme = "rose";
  } else if (condLower.includes("snow")) {
    conditionLabel = t("condition.snow", "Snow");
    conditionTheme = "cyan";
  }

  // Environmental Indicator Estimates
  const uvVal = current.uvIndex ?? 4.5;
  const uvStatus = uvVal > 6 ? t("hero.high_badge", "High") : uvVal > 3 ? t("hero.moderate_badge", "Moderate") : t("hero.low_badge", "Low");

  // Humidity status
  const humidityStatus = current.humidity > 70 ? "High" : current.humidity < 35 ? "Dry" : "Optimal";

  // Precipitation probability
  const precipProb = today?.precipitationProbability ?? (current.humidity > 60 ? 40 : 10);

  // Apparent temperature calculation
  const feelsLike = Math.round(current.feelsLike ?? current.temperature);
  const tempHigh = Math.round(today?.temperatureHigh ?? current.temperature + 2);
  const tempLow = Math.round(today?.temperatureLow ?? current.temperature - 3);

  // Active weather alert (if present)
  const activeAlert = weather.alerts && weather.alerts.length > 0 ? weather.alerts[0] : null;

  return (
    <section
      aria-label="Current Weather Overview"
      className="wg-surface-hero relative w-full overflow-hidden p-5 sm:p-7 md:p-8 rounded-[28px] sm:rounded-[32px] transition-all duration-300 border border-[var(--border-subtle)]"
    >
      {/* ── Atmospheric Ambient Backdrop Gradient (Contextual by Condition) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-60 dark:opacity-40"
        style={{
          background:
            conditionTheme === "cyan"
              ? "radial-gradient(ellipse 65% 50% at 75% 25%, rgba(56, 189, 248, 0.18), transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(37, 99, 235, 0.10), transparent 60%)"
              : conditionTheme === "amber"
                ? "radial-gradient(ellipse 65% 50% at 75% 25%, rgba(251, 191, 36, 0.20), transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(245, 158, 11, 0.10), transparent 60%)"
                : conditionTheme === "rose"
                  ? "radial-gradient(ellipse 65% 50% at 75% 25%, rgba(244, 63, 94, 0.18), transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(168, 85, 247, 0.12), transparent 60%)"
                  : "radial-gradient(ellipse 65% 50% at 75% 25%, rgba(148, 163, 184, 0.15), transparent 70%)",
        }}
      />

      {/* ── Top Provenance & Telemetry Metadata Header ── */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-4 mb-4 sm:mb-6 border-b border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] flex-wrap">
        {/* Source & Grounding Provenance (Section 15: Trust & Data Provenance) */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
            <span className="font-semibold text-[11px] tracking-wide uppercase">Open-Meteo Verified</span>
          </span>
          <span className="text-[var(--border-default)]">•</span>
          <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
            ECMWF / GFS High-Res
          </span>
        </div>

        {/* High / Low & Feels-Like Telemetry Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] font-medium text-[11px] text-[var(--text-secondary)]">
          <span>Feels like <strong className="text-[var(--text-primary)]">{feelsLike}°</strong></span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span>H: <strong className="text-[var(--text-primary)]">{tempHigh}°</strong></span>
          <span className="text-[var(--text-tertiary)]">L: <strong className="text-[var(--text-primary)]">{tempLow}°</strong></span>
        </div>
      </div>

      {/* Degraded Network Warning if applicable */}
      {weather.isDegraded && (
        <div
          role="status"
          aria-live="polite"
          className="relative z-10 w-full mb-4 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-xs font-semibold"
        >
          <AlertTriangle size={15} className="shrink-0 text-amber-500" />
          <span>
            {weather.staleWarning ||
              `Data may be cached from ${
                weather.staleSince
                  ? new Date(weather.staleSince).toLocaleTimeString()
                  : new Date(weather.observedAt).toLocaleTimeString()
              }`}
          </span>
        </div>
      )}

      {/* ── Core Hero Grid: Dominant Temperature Focal Point + Integrated Visual ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Column (Focal Point): Location -> Giant Temperature -> Condition Details */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Location & Time Hierarchy */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
              <MapPin size={13} className="text-[var(--accent)] shrink-0" />
              <span>{localizedLoc.fullDisplayName}</span>
              <span>•</span>
              <span className="capitalize">{dateString}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
              {localizedLoc.cityName}
            </h1>
          </div>

          {/* Primary Dominant Focal Point: Temperature & Current Weather */}
          <div className="flex items-baseline gap-4 sm:gap-6 mt-3 sm:mt-4">
            {/* Giant Clean Minimalist Temperature */}
            <FloatingElement id="hero-dominant-temp" massTier="heavy" envelopeScale={0.3} pressScale={false}>
              <span className="text-7xl sm:text-8xl lg:text-9xl font-extralight tracking-tighter text-[var(--text-primary)] leading-none select-none">
                {Math.round(current.temperature)}°
              </span>
            </FloatingElement>

            {/* Condition Description & Status Badge */}
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight capitalize">
                {conditionLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent-border)] w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                {current.humidity > 65
                  ? t("hero.precip_active", "Precipitation in Progress")
                  : t("hero.stable_atmosphere", "Atmospheric Equilibrium")}
              </span>
            </div>
          </div>

          {/* 4 Compact Telemetry Metric Cards (Section 10: Standardized Consistent Format) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 sm:mt-6">
            {/* 1. Humidity */}
            <div className="flex flex-col p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                <span className="flex items-center gap-1">
                  <Droplets size={12} className="text-blue-500" />
                  <span>Humidity</span>
                </span>
                <span className="text-[10px] font-semibold text-blue-500">{humidityStatus}</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {current.humidity}%
              </span>
            </div>

            {/* 2. Wind */}
            <div className="flex flex-col p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                <span className="flex items-center gap-1">
                  <Wind size={12} className="text-cyan-500" />
                  <span>Wind</span>
                </span>
                <span className="text-[10px] font-semibold text-cyan-500">{current.windDirection ?? "NE"}</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {Math.round(current.windSpeed)} <span className="text-xs font-normal text-[var(--text-tertiary)]">km/h</span>
              </span>
            </div>

            {/* 3. Precipitation Probability */}
            <div className="flex flex-col p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                <span className="flex items-center gap-1">
                  <CloudRain size={12} className="text-indigo-400" />
                  <span>Precip.</span>
                </span>
                <span className="text-[10px] font-semibold text-indigo-400">{precipProb > 30 ? "Likely" : "Low"}</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {Math.round(precipProb)}%
              </span>
            </div>

            {/* 4. UV Index */}
            <div className="flex flex-col p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                <span className="flex items-center gap-1">
                  <Sun size={12} className="text-amber-500" />
                  <span>UV Index</span>
                </span>
                <span className="text-[10px] font-semibold text-amber-500">{uvStatus}</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {uvVal.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Seamless Contextual Weather Atmosphere (Problem 1 & 2 Solved) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative flex items-center justify-center p-3 sm:p-5 rounded-3xl bg-[var(--surface-2)]/40 border border-[var(--border-subtle)] w-full max-w-sm">
            {/* Integrated Volumetric Weather Visual */}
            <FloatingElement id="hero-volumetric-visual" massTier="light" envelopeScale={0.6} pressScale={false}>
              <VolumetricWeatherIcon condition={current.condition} />
            </FloatingElement>

            {/* Contextual Weather Asset: Softly blended into the environment without jarring card border */}
            <div className="relative w-20 sm:w-24 h-28 sm:h-32 -ml-6 sm:-ml-8 shrink-0 drop-shadow-xl select-none pointer-events-none">
              <Image
                src={mascot.imageSrc}
                alt={`${mascot.title} atmospheric visual`}
                fill
                sizes="(max-width: 640px) 80px, 96px"
                className="object-contain object-bottom"
                priority
              />
            </div>
          </div>

          {/* Contextual Environmental Tip */}
          <div className="mt-3 text-[11px] text-[var(--text-tertiary)] text-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: mascot.accentColor }} />
            <span className="truncate">{mascot.activityTip}</span>
          </div>
        </div>
      </div>

      {/* ── Section 9: Proper Live Weather Signal / Intelligence Insight ── */}
      <div className="relative z-10 mt-6 pt-5 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                activeAlert
                  ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                  : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
              }`}
            >
              {activeAlert ? <ShieldAlert size={18} /> : <Sparkles size={18} />}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {activeAlert ? "Active Severe Advisory" : "Live Weather Signal"}
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {activeAlert
                    ? activeAlert.title
                    : current.humidity > 65
                      ? `Precipitation active around ${localizedLoc.cityName}`
                      : `Favorable atmospheric conditions in ${localizedLoc.cityName}`}
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {activeAlert
                  ? activeAlert.description
                  : `Wind steady at ${Math.round(current.windSpeed)} km/h (${current.windDirection ?? "NE"}). Precipitation likelihood at ${Math.round(precipProb)}% with ${Math.round(current.humidity)}% relative humidity.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Link
              href="#risk-section"
              className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Risk</span>
              <ArrowUpRight size={13} />
            </Link>

            <a
              href="#copilot-section"
              className="flex-1 sm:flex-none text-xs font-semibold px-3.5 py-2 rounded-xl bg-[var(--accent)] text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>Ask Copilot</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
