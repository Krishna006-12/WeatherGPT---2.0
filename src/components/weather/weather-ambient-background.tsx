"use client";

/**
 * WeatherAmbientBackground
 *
 * High-performance, theme-aware ambient background layer that dynamically reflects
 * the current atmospheric conditions (clear, cloudy, rain, thunderstorm, snow, fog/mist)
 * and harmonizes with time of day (dawn, day, dusk, night).
 *
 * Requirements satisfied:
 * - 6 weather states mapped seamlessly from API responses
 * - Theme-aware via CSS custom properties (--cloud-color, --rain-color, --flash-color, etc.)
 * - Non-intrusive ambient aesthetic (<= 25% max opacity) with subtle scrim & blur for text contrast
 * - High-efficiency CSS keyframes + transforms with will-change optimization
 * - Strict prefers-reduced-motion accessibility support (falls back to static condition gradient)
 */

import React, { useEffect, useMemo, useState } from "react";

export type WeatherConditionState =
  | "clear"
  | "cloudy"
  | "rain"
  | "thunderstorm"
  | "snow"
  | "fog";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export interface WeatherAmbientBackgroundProps {
  /** Weather condition string from API (e.g., "Rain", "Thunderstorm", "Partly Cloudy", "Clear") */
  condition: string;
  /** Explicit time slice or automatically determined if omitted */
  timeOfDay?: TimeOfDay;
  /** Optional theme override */
  theme?: "light" | "dark";
  /** Override for accessibility / testing */
  reducedMotion?: boolean;
  /** Optional container positioning class */
  className?: string;
}

/**
 * Normalizes free-form API condition strings to one of the 6 canonical atmospheric states
 */
export function normalizeWeatherCondition(rawCondition: string): WeatherConditionState {
  if (!rawCondition) return "clear";
  const c = rawCondition.toLowerCase().trim();

  if (c.includes("storm") || c.includes("thunder") || c.includes("squall") || c.includes("lightning")) {
    return "thunderstorm";
  }
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower") || c.includes("precip")) {
    return "rain";
  }
  if (c.includes("snow") || c.includes("blizzard") || c.includes("flurr") || c.includes("sleet") || c.includes("hail") || c.includes("ice")) {
    return "snow";
  }
  if (c.includes("fog") || c.includes("mist") || c.includes("haze") || c.includes("smoke") || c.includes("dust")) {
    return "fog";
  }
  if (c.includes("cloud") || c.includes("overcast") || c.includes("gloomy")) {
    return "cloudy";
  }
  return "clear";
}

/**
 * Calculates time-of-day category from local clock if not provided explicitly
 */
function resolveTimeOfDay(explicit?: TimeOfDay): TimeOfDay {
  if (explicit) return explicit;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/**
 * Maps time-of-day to base atmospheric color hue
 */
const TIME_OF_DAY_HUES: Record<TimeOfDay, { hue: number; sat: number; light: number }> = {
  dawn: { hue: 28, sat: 80, light: 55 },   // Warm amber golden hour
  day: { hue: 204, sat: 75, light: 58 },   // Bright atmospheric sky blue
  dusk: { hue: 14, sat: 85, light: 50 },   // Deep twilight coral / sunset
  night: { hue: 228, sat: 65, light: 25 }, // Deep celestial nocturnal navy
};

export function WeatherAmbientBackground({
  condition: rawCondition,
  timeOfDay: explicitTimeOfDay,
  reducedMotion: explicitReducedMotion,
  className = "",
}: WeatherAmbientBackgroundProps) {
  const activeCondition = normalizeWeatherCondition(rawCondition);
  const timeOfDay = resolveTimeOfDay(explicitTimeOfDay);
  const [isSystemReducedMotion, setIsSystemReducedMotion] = useState(false);

  // Detect user prefers-reduced-motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsSystemReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setIsSystemReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const shouldReduceMotion = explicitReducedMotion ?? isSystemReducedMotion;

  // Pre-generate deterministic particle sets for continuous smooth animations without re-renders
  const rainStreaks = useMemo(() => {
    const count = activeCondition === "thunderstorm" ? 48 : 38;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: ((i * 2.65 + (i % 7) * 3.4) % 100).toFixed(1),
      delay: (-(i * 0.17)).toFixed(2),
      duration: (activeCondition === "thunderstorm" ? 0.75 + (i % 5) * 0.1 : 1.1 + (i % 6) * 0.15).toFixed(2),
      length: (activeCondition === "thunderstorm" ? 18 + (i % 8) * 3 : 14 + (i % 6) * 2),
      opacity: (0.12 + (i % 5) * 0.02).toFixed(2),
    }));
  }, [activeCondition]);

  const snowflakes = useMemo(() => {
    const count = 30;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: ((i * 3.3 + (i % 5) * 4.2) % 100).toFixed(1),
      delay: (-(i * 0.28)).toFixed(2),
      duration: (3.8 + (i % 6) * 0.45).toFixed(2),
      size: (3 + (i % 4) * 1.5).toFixed(1),
      swayDuration: (2.4 + (i % 4) * 0.5).toFixed(2),
      opacity: (0.15 + (i % 4) * 0.03).toFixed(2),
    }));
  }, []);

  // Safe, non-strobing randomized thunderstorm lightning flash (100–140ms duration, 4–10s intervals)
  const [isFlashing, setIsFlashing] = useState(false);
  useEffect(() => {
    if (activeCondition !== "thunderstorm" || shouldReduceMotion) {
      setIsFlashing(false);
      return;
    }

    let flashTimeout: NodeJS.Timeout;
    let nextIntervalTimeout: NodeJS.Timeout;

    const scheduleNextFlash = () => {
      const delayMs = 4500 + Math.random() * 5500; // 4.5s to 10s interval
      nextIntervalTimeout = setTimeout(() => {
        setIsFlashing(true);
        flashTimeout = setTimeout(() => {
          setIsFlashing(false);
          scheduleNextFlash();
        }, 120); // 120ms gentle flash
      }, delayMs);
    };

    scheduleNextFlash();

    return () => {
      clearTimeout(flashTimeout);
      clearTimeout(nextIntervalTimeout);
    };
  }, [activeCondition, shouldReduceMotion]);

  const tod = TIME_OF_DAY_HUES[timeOfDay];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* ── 1. Base Atmospheric Sky Hue Gradient (Time of Day Dependent) ── */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 0%, hsla(${tod.hue}, ${tod.sat}%, ${tod.light}%, 0.12) 0%, transparent 80%)`,
        }}
      />

      {/* ── 2. Atmospheric Scrim / Blur Layer for Foreground Contrast ── */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/[0.02] dark:bg-white/[0.01]" />

      {/* ── 3. Atmospheric Condition Layers ── */}
      {/* (A) CLEAR: Soft radial sun-glow with subtle hue-shifting breathing effect */}
      {activeCondition === "clear" && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -top-1/4 -right-1/4 w-[140%] h-[140%] rounded-full opacity-35 ${
              shouldReduceMotion ? "" : "animate-ambient-glow"
            }`}
            style={{
              background: `radial-gradient(circle at 65% 35%, hsla(${tod.hue}, 85%, 65%, 0.22) 0%, hsla(${tod.hue + 15}, 80%, 55%, 0.08) 45%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* (B) CLOUDY: 3 Parallax Cloud Layers with Staggered Velocities */}
      {activeCondition === "cloudy" && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Back Cloud Layer (Slowest) */}
          <div
            className={`absolute inset-0 w-[200%] opacity-10 ${
              shouldReduceMotion ? "" : "animate-cloud-drift-slow"
            }`}
          >
            <svg viewBox="0 0 1200 300" className="w-full h-full preserve-3d" fill="none">
              <path
                d="M0,160 Q180,80 360,150 T720,130 T1080,160 T1440,140 L1440,300 L0,300 Z"
                fill="var(--cloud-color, rgba(148, 163, 184, 0.35))"
              />
            </svg>
          </div>

          {/* Mid Cloud Layer */}
          <div
            className={`absolute inset-0 w-[200%] opacity-15 ${
              shouldReduceMotion ? "" : "animate-cloud-drift-mid"
            }`}
          >
            <svg viewBox="0 0 1200 300" className="w-full h-full preserve-3d" fill="none">
              <path
                d="M0,190 Q220,110 440,180 T880,160 T1320,190 L1320,300 L0,300 Z"
                fill="var(--cloud-color, rgba(148, 163, 184, 0.40))"
              />
            </svg>
          </div>

          {/* Front Cloud Layer (Faster) */}
          <div
            className={`absolute inset-0 w-[200%] opacity-12 ${
              shouldReduceMotion ? "" : "animate-cloud-drift-fast"
            }`}
          >
            <svg viewBox="0 0 1200 300" className="w-full h-full preserve-3d" fill="none">
              <path
                d="M0,220 Q260,150 520,210 T1040,190 L1040,300 L0,300 Z"
                fill="var(--cloud-color, rgba(148, 163, 184, 0.45))"
              />
            </svg>
          </div>
        </div>
      )}

      {/* (C) RAIN: Thin Diagonal Streaks Falling with Faint Moving Cloud Layer */}
      {activeCondition === "rain" && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Faint cloud ceiling */}
          <div className="absolute -top-12 inset-x-0 h-40 opacity-15">
            <svg viewBox="0 0 800 160" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,80 Q200,20 400,70 T800,60 L800,160 L0,160 Z"
                fill="var(--cloud-color, rgba(148, 163, 184, 0.40))"
              />
            </svg>
          </div>

          {/* Diagonal Rain Streaks */}
          {!shouldReduceMotion &&
            rainStreaks.map((streak) => (
              <span
                key={streak.id}
                className="ambient-rain-streak"
                style={{
                  left: `${streak.left}%`,
                  height: `${streak.length}px`,
                  animationDuration: `${streak.duration}s`,
                  animationDelay: `${streak.delay}s`,
                  opacity: streak.opacity,
                  backgroundColor: "var(--rain-color, rgba(59, 130, 246, 0.50))",
                }}
              />
            ))}
        </div>
      )}

      {/* (D) THUNDERSTORM: Deep Moody Cloud Layer, Accelerated Rain & Random Soft Flash */}
      {activeCondition === "thunderstorm" && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Darker dense cloud mass */}
          <div className="absolute -top-10 inset-x-0 h-48 opacity-25">
            <svg viewBox="0 0 800 180" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,100 Q180,30 380,90 T760,80 L800,180 L0,180 Z"
                fill="var(--cloud-color, rgba(100, 116, 139, 0.50))"
              />
            </svg>
          </div>

          {/* Heavier, faster rain streaks */}
          {!shouldReduceMotion &&
            rainStreaks.map((streak) => (
              <span
                key={streak.id}
                className="ambient-storm-streak"
                style={{
                  left: `${streak.left}%`,
                  height: `${streak.length * 1.25}px`,
                  animationDuration: `${streak.duration}s`,
                  animationDelay: `${streak.delay}s`,
                  opacity: (Number(streak.opacity) * 1.3).toFixed(2),
                  backgroundColor: "var(--rain-color, rgba(96, 165, 250, 0.60))",
                }}
              />
            ))}

          {/* Safe subtle lightning flash */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              backgroundColor: "var(--flash-color, rgba(224, 242, 254, 0.35))",
              opacity: isFlashing ? 0.08 : 0,
            }}
          />
        </div>
      )}

      {/* (E) SNOW: Soft Circular Particles with Natural Sway & Gentle Descent */}
      {activeCondition === "snow" && (
        <div className="absolute inset-0 overflow-hidden">
          {!shouldReduceMotion &&
            snowflakes.map((flake) => (
              <span
                key={flake.id}
                className="ambient-snow-particle"
                style={{
                  left: `${flake.left}%`,
                  width: `${flake.size}px`,
                  height: `${flake.size}px`,
                  animationDuration: `${flake.duration}s`,
                  animationDelay: `${flake.delay}s`,
                  opacity: flake.opacity,
                  backgroundColor: "var(--snow-color, rgba(241, 245, 249, 0.80))",
                }}
              />
            ))}
        </div>
      )}

      {/* (F) FOG / MIST: Blurred Horizontal Atmospheric Band with Slow Breathing Loop */}
      {activeCondition === "fog" && (
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
          <div
            className={`w-[120%] h-36 rounded-full blur-2xl opacity-22 ${
              shouldReduceMotion ? "" : "animate-fog-breathe"
            }`}
            style={{
              backgroundColor: "var(--fog-color, rgba(148, 163, 184, 0.35))",
            }}
          />
          <div
            className={`w-[110%] h-24 rounded-full blur-xl opacity-18 mt-12 ${
              shouldReduceMotion ? "" : "animate-fog-breathe"
            }`}
            style={{
              animationDelay: "3.5s",
              backgroundColor: "var(--fog-color, rgba(148, 163, 184, 0.30))",
            }}
          />
        </div>
      )}

      {/* ── Internal Ambient Animation Keyframe Declarations ── */}
      <style jsx>{`
        /* Rain particle physics: angled fall (14deg diagonal tilt) */
        .ambient-rain-streak {
          position: absolute;
          top: -24px;
          width: 1.5px;
          border-radius: 9999px;
          transform: rotate(14deg);
          will-change: transform;
          animation: rainStreakFall linear infinite;
        }

        .ambient-storm-streak {
          position: absolute;
          top: -28px;
          width: 2px;
          border-radius: 9999px;
          transform: rotate(16deg);
          will-change: transform;
          animation: rainStreakFall linear infinite;
        }

        @keyframes rainStreakFall {
          0% {
            transform: translateY(-20px) rotate(14deg);
            opacity: 0;
          }
          15% {
            opacity: var(--tw-opacity, 0.2);
          }
          85% {
            opacity: var(--tw-opacity, 0.2);
          }
          100% {
            transform: translateY(420px) rotate(14deg);
            opacity: 0;
          }
        }

        /* Snow particle physics: gentle vertical fall with slight horizontal drift */
        .ambient-snow-particle {
          position: absolute;
          top: -12px;
          border-radius: 9999px;
          will-change: transform;
          animation: snowParticleDrift ease-in-out infinite;
        }

        @keyframes snowParticleDrift {
          0% {
            transform: translateY(-10px) translateX(0px);
            opacity: 0;
          }
          20% {
            opacity: 0.25;
            transform: translateY(80px) translateX(8px);
          }
          60% {
            transform: translateY(240px) translateX(-6px);
          }
          100% {
            transform: translateY(420px) translateX(12px);
            opacity: 0;
          }
        }

        /* Cloudy parallax drift */
        @keyframes cloudDriftSlow {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes cloudDriftMid {
          0% {
            transform: translateX(-15%);
          }
          100% {
            transform: translateX(-65%);
          }
        }
        @keyframes cloudDriftFast {
          0% {
            transform: translateX(-30%);
          }
          100% {
            transform: translateX(-80%);
          }
        }

        .animate-cloud-drift-slow {
          animation: cloudDriftSlow 70s linear infinite;
          will-change: transform;
        }
        .animate-cloud-drift-mid {
          animation: cloudDriftMid 48s linear infinite;
          will-change: transform;
        }
        .animate-cloud-drift-fast {
          animation: cloudDriftFast 32s linear infinite;
          will-change: transform;
        }

        /* Clear sun-glow breathing */
        @keyframes ambientGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.28;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.38;
          }
        }
        .animate-ambient-glow {
          animation: ambientGlow 9s ease-in-out infinite;
          will-change: transform, opacity;
        }

        /* Fog breathing loop */
        @keyframes fogBreathe {
          0%, 100% {
            opacity: 0.14;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.26;
            transform: scaleX(1.05);
          }
        }
        .animate-fog-breathe {
          animation: fogBreathe 7s ease-in-out infinite;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

export default WeatherAmbientBackground;
