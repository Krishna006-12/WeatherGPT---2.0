"use client";

import React, { useState, useEffect, useCallback, useId } from "react";

/**
 * ============================================================================
 * WeatherGPT 2.0 — Launch & Splash Screen Animation System
 * ============================================================================
 *
 * Recreates the glossy WeatherGPT 3D reference icon:
 * - Bright sky gradient canvas (cyan #4FC3F7 top to deep blue #1565C0 bottom)
 * - Glossy yellow sun with radial warmth and soft pulsing teal/cyan halo
 * - Volumetric glossy white 3D cloud with soft ambient blue-grey underside
 * - 4 staggered glassy cyan-blue rain droplets falling below the cloud (one-time cascade)
 * - Subtle landing settle of the weather badge + animated wordmark "WeatherGPT"
 * - High-polish crossfade transition to the live home/dashboard screen (~2.4s total)
 *
 * Sequence Timeline (0.0s – 2.5s):
 *  1. Background: 0.0s – 0.3s (Scale 0.98 -> 1.0, fade-in 0 -> 1, ease-out)
 *  2. Sun + Halo: 0.2s – 0.8s (Sun scale 0.8 -> 1.0; Halo pulse 1.0 -> 1.08 -> 1.0)
 *  3. Cloud:      0.5s – 1.1s (Slide from left -22px to 0px with overshoot spring)
 *  4. Raindrops:  0.9s – 1.6s (4 angled drops cascade, stretch vertically, exit once)
 *  5. Wordmark:   1.4s – 2.0s (Full icon settle 1.02 -> 1.0; "WeatherGPT" slide up 12px -> 0)
 *  6. Transition: 2.0s – 2.5s (Full screen crossfade + gentle upward drift into dashboard)
 *
 * Reduced Motion:
 *  - Automatically detects `prefers-reduced-motion: reduce`
 *  - Disables all slides, bounces, stretches, and scaling
 *  - Displays static icon + wordmark with a soft fade-in/out
 *
 * Cold Launch Hook:
 *  - Uses `sessionStorage.getItem('weathergpt_splash_seen')`
 *  - Runs automatically once per user browser session
 *  - Supports `forceShow` for Storybook, Motion Lab, and developer previews
 * ============================================================================
 */

export interface WeatherSplashScreenProps {
  /**
   * If true, forces the splash screen to display regardless of `sessionStorage`.
   * Ideal for the Motion Lab, demo toggles, and development preview.
   * @default false
   */
  forceShow?: boolean;

  /**
   * If true, automatically transitions out and dismisses after sequence completion.
   * @default true
   */
  autoDismiss?: boolean;

  /**
   * Minimum duration in milliseconds before crossfading into the application.
   * Standard sequence completes at ~2400ms.
   * @default 2400
   */
  minDuration?: number;

  /**
   * Callback fired immediately when the exit transition finishes and the
   * splash screen unmounts / yields control to the home screen.
   */
  onComplete?: () => void;

  /**
   * Whether to persist the launch state to sessionStorage so it only plays once
   * per cold session.
   * @default true
   */
  skipOnRepeatVisits?: boolean;

  /**
   * Optional custom CSS class name for the root overlay container.
   */
  className?: string;
}

export function WeatherSplashScreen({
  forceShow = false,
  autoDismiss = true,
  minDuration = 2400,
  onComplete,
  skipOnRepeatVisits = true,
  className = "",
}: WeatherSplashScreenProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const maskId = useId();

  // Detect reduced motion preference on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  // Determine whether to display on cold launch
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (forceShow) {
      setIsVisible(true);
      setIsExiting(false);
      return;
    }

    if (skipOnRepeatVisits) {
      try {
        const hasSeenSplash = sessionStorage.getItem("weathergpt_splash_seen");
        if (!hasSeenSplash) {
          setIsVisible(true);
          sessionStorage.setItem("weathergpt_splash_seen", "true");
        }
      } catch {
        // Fallback for private browsing mode without storage access
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }
  }, [forceShow, skipOnRepeatVisits]);

  // Handle sequence completion and dismissal
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onComplete?.();
    }, 450); // Matches the 0.45s crossfade curve

    return () => clearTimeout(exitTimer);
  }, [onComplete]);

  // Auto-dismiss after minDuration
  useEffect(() => {
    if (!isVisible || !autoDismiss) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [isVisible, autoDismiss, minDuration, handleDismiss]);

  // Manual skip button keyboard listener (Escape key)
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleDismiss]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading WeatherGPT meteorological intelligence"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none overflow-hidden ${
        isExiting ? "weather-splash-exiting" : ""
      } ${className}`}
      style={{
        background: "linear-gradient(180deg, #4FC3F7 0%, #29B6F6 26%, #0284C7 68%, #1565C0 100%)",
      }}
    >
      {/* Accessible skip link for keyboard & screen reader users */}
      <button
        type="button"
        onClick={handleDismiss}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-md border border-white/20 outline-none focus:ring-2 focus:ring-cyan-300 transition-all"
      >
        Skip launch animation (Esc)
      </button>

      {/* Layer 1: Ambient Sun Glow & Light Flare */}
      <div
        className="absolute inset-0 pointer-events-none weather-splash-bg-flare"
        style={{
          background:
            "radial-gradient(circle at 58% 35%, rgba(255, 255, 255, 0.32) 0%, rgba(125, 211, 252, 0.16) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Core Center Content: App Icon Badge + Wordmark */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 weather-splash-content-group">
        {/* Layer 2: Glossy Squircle Weather Badge Group */}
        <div className="relative weather-splash-badge-container">
          <svg
            className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 drop-shadow-[0_20px_40px_rgba(2,119,189,0.45)]"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              {/* App Icon Sky Gradient */}
              <linearGradient id={`${maskId}-sky-bg`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FC3F7" />
                <stop offset="28%" stopColor="#29B6F6" />
                <stop offset="70%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#1565C0" />
              </linearGradient>

              {/* Top Glass Highlight Stroke */}
              <linearGradient id={`${maskId}-top-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
              </linearGradient>

              {/* Sun Glowing Halo Radial Gradient */}
              <radialGradient id={`${maskId}-sun-halo`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E0F7FA" stopOpacity="0.65" />
                <stop offset="55%" stopColor="#4FC3F7" stopOpacity="0.32" />
                <stop offset="85%" stopColor="#29B6F6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
              </radialGradient>

              {/* Sun 3D Warm Radial Gradient */}
              <radialGradient id={`${maskId}-sun-body`} cx="42%" cy="36%" r="64%">
                <stop offset="0%" stopColor="#FFFDE7" />
                <stop offset="35%" stopColor="#FFEE58" />
                <stop offset="72%" stopColor="#FDD835" />
                <stop offset="100%" stopColor="#F59E0B" />
              </radialGradient>

              {/* Cloud Volumetric 3D Gradient */}
              <linearGradient id={`${maskId}-cloud-volume`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="52%" stopColor="#FFFFFF" />
                <stop offset="74%" stopColor="#F0F9FF" />
                <stop offset="90%" stopColor="#BAE6FD" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>

              {/* Cloud Top Specular Sheen */}
              <linearGradient id={`${maskId}-cloud-sheen`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              {/* Raindrop Glassy Gradient */}
              <linearGradient id={`${maskId}-raindrop`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E0F7FA" />
                <stop offset="25%" stopColor="#38BDF8" />
                <stop offset="70%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>

              {/* Gaussian Blur Filter for Halo */}
              <filter id={`${maskId}-halo-blur`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
              </filter>

              {/* Ambient Cloud Drop Shadow */}
              <filter id={`${maskId}-cloud-shadow`} x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0277BD" floodOpacity="0.36" />
              </filter>

              {/* Raindrop Specular Glow */}
              <filter id={`${maskId}-drop-glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#38BDF8" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Layer 2A: Squircle App Icon Base */}
            <g className="weather-splash-squircle-layer">
              <rect
                x="0"
                y="0"
                width="240"
                height="240"
                rx="54"
                ry="54"
                fill={`url(#${maskId}-sky-bg)`}
              />
              {/* Inner Specular Border */}
              <rect
                x="1.5"
                y="1.5"
                width="237"
                height="237"
                rx="52.5"
                ry="52.5"
                fill="none"
                stroke={`url(#${maskId}-top-stroke)`}
                strokeWidth="1.5"
              />
            </g>

            {/* Layer 2B: Sun Halo (Pulsing Cyan Glow behind the sun) */}
            <g className="weather-splash-sun-halo-layer">
              <circle
                cx="154"
                cy="88"
                r="72"
                fill={`url(#${maskId}-sun-halo)`}
                filter={`url(#${maskId}-halo-blur)`}
              />
            </g>

            {/* Layer 2C: Sun Entrance (Glossy Warm Yellow Sphere) */}
            <g className="weather-splash-sun-layer">
              <circle
                cx="154"
                cy="88"
                r="50"
                fill={`url(#${maskId}-sun-body)`}
              />
              {/* Sun Inner Specular Highlight */}
              <circle
                cx="140"
                cy="74"
                r="18"
                fill="#FFFDE7"
                fillOpacity="0.38"
              />
            </g>

            {/* Layer 2D: Rain Droplet Cascade (4 Staggered Glassy Cyan Capsules) */}
            <g className="weather-splash-raindrops-layer">
              {/* Drop 1 (Leftmost, shorter) */}
              <g className="weather-splash-drop weather-splash-drop-1">
                <rect
                  x="68"
                  y="168"
                  width="11"
                  height="30"
                  rx="5.5"
                  ry="5.5"
                  transform="rotate(-20 73.5 183)"
                  fill={`url(#${maskId}-raindrop)`}
                  filter={`url(#${maskId}-drop-glow)`}
                />
              </g>

              {/* Drop 2 (Center-Left, longest) */}
              <g className="weather-splash-drop weather-splash-drop-2">
                <rect
                  x="98"
                  y="168"
                  width="11"
                  height="44"
                  rx="5.5"
                  ry="5.5"
                  transform="rotate(-20 103.5 190)"
                  fill={`url(#${maskId}-raindrop)`}
                  filter={`url(#${maskId}-drop-glow)`}
                />
              </g>

              {/* Drop 3 (Center-Right, mid-length) */}
              <g className="weather-splash-drop weather-splash-drop-3">
                <rect
                  x="128"
                  y="168"
                  width="11"
                  height="38"
                  rx="5.5"
                  ry="5.5"
                  transform="rotate(-20 133.5 187)"
                  fill={`url(#${maskId}-raindrop)`}
                  filter={`url(#${maskId}-drop-glow)`}
                />
              </g>

              {/* Drop 4 (Rightmost, shorter) */}
              <g className="weather-splash-drop weather-splash-drop-4">
                <rect
                  x="158"
                  y="168"
                  width="11"
                  height="26"
                  rx="5.5"
                  ry="5.5"
                  transform="rotate(-20 163.5 181)"
                  fill={`url(#${maskId}-raindrop)`}
                  filter={`url(#${maskId}-drop-glow)`}
                />
              </g>
            </g>

            {/* Layer 2E: Cloud Entrance (Glossy 3D Pillowy Cloud) */}
            <g className="weather-splash-cloud-layer">
              <path
                d="M 52 162
                   C 42 162 34 154 34 144
                   C 34 133 42 123 53 121
                   C 51 114 51 106 55 98
                   C 62 83 76 74 93 75
                   C 101 64 116 56 132 56
                   C 152 56 168 68 174 86
                   C 180 88 186 92 190 98
                   C 198 108 200 122 194 134
                   C 198 140 200 148 196 155
                   C 192 161 185 162 176 162
                   Z"
                fill={`url(#${maskId}-cloud-volume)`}
                filter={`url(#${maskId}-cloud-shadow)`}
              />

              {/* Glossy Upper Specular Sheen on Main Dome */}
              <ellipse
                cx="132"
                cy="68"
                rx="30"
                ry="10"
                fill={`url(#${maskId}-cloud-sheen)`}
              />
              <ellipse
                cx="92"
                cy="84"
                rx="20"
                ry="8"
                fill={`url(#${maskId}-cloud-sheen)`}
              />
            </g>
          </svg>
        </div>

        {/* Layer 3: Wordmark & Typography */}
        <div className="mt-7 flex flex-col items-center text-center weather-splash-wordmark-layer">
          <div className="flex items-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,30,80,0.35)]">
              Weather<span className="text-cyan-200">GPT</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md">
              2.0
            </span>
          </div>

          <p className="mt-2 text-xs sm:text-sm font-medium tracking-[0.16em] uppercase text-cyan-100/90 drop-shadow-[0_1px_6px_rgba(0,30,80,0.25)]">
            Meteorological Intelligence &amp; Forecasts
          </p>

          {/* Micro Progress Indicator (Subtle Native Pulse) */}
          <div className="mt-5 w-24 h-1 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white/80 rounded-full weather-splash-progress-bar" />
          </div>
        </div>
      </div>

      {/* Embedded High-Performance Timeline Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: SPLASH_TIMELINE_CSS }} />
    </div>
  );
}

/**
 * Self-contained CSS Keyframes with exact millisecond timelines,
 * spring-easing curves, and prefers-reduced-motion fallback logic.
 */
const SPLASH_TIMELINE_CSS = `
/* 1. Background Entrance (0.0s – 0.3s) */
.weather-splash-bg-flare {
  animation: splashBgFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes splashBgFade {
  0% {
    opacity: 0;
    transform: scale(0.96);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 2. Squircle Badge Base & Settle (1.4s – 1.8s) */
.weather-splash-badge-container {
  transform-origin: center center;
  animation: splashBadgeSettle 0.45s cubic-bezier(0.25, 1, 0.5, 1) 1.4s both;
}

@keyframes splashBadgeSettle {
  0% {
    transform: scale(1.025);
  }
  100% {
    transform: scale(1);
  }
}

.weather-splash-squircle-layer {
  transform-origin: center center;
  animation: splashSquircleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes splashSquircleIn {
  0% {
    opacity: 0;
    transform: scale(0.97);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 3. Sun Entrance & Halo Pulse (0.2s – 0.8s) */
.weather-splash-sun-halo-layer {
  transform-origin: 154px 88px;
  animation: splashHaloPulse 0.65s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

@keyframes splashHaloPulse {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  45% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 0.88;
    transform: scale(1);
  }
}

.weather-splash-sun-layer {
  transform-origin: 154px 88px;
  animation: splashSunScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

@keyframes splashSunScale {
  0% {
    opacity: 0;
    transform: scale(0.78);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 4. Cloud Entrance (0.5s – 1.1s) with Spring Overshoot */
.weather-splash-cloud-layer {
  transform-origin: center center;
  animation: splashCloudSlide 0.62s cubic-bezier(0.34, 1.4, 0.64, 1) 0.5s both;
}

@keyframes splashCloudSlide {
  0% {
    opacity: 0;
    transform: translateX(-22px);
  }
  75% {
    opacity: 1;
    transform: translateX(3px); /* Subtle overshoot bounce */
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 5. Raindrop Cascade (0.9s – 1.6s) - Staggered One-Time Waterfall */
.weather-splash-drop {
  opacity: 0;
  transform-origin: center top;
}

.weather-splash-drop-1 {
  animation: splashDropFall 0.36s cubic-bezier(0.4, 0, 0.2, 1) 0.90s forwards;
}

.weather-splash-drop-2 {
  animation: splashDropFall 0.38s cubic-bezier(0.4, 0, 0.2, 1) 1.02s forwards;
}

.weather-splash-drop-3 {
  animation: splashDropFall 0.36s cubic-bezier(0.4, 0, 0.2, 1) 1.14s forwards;
}

.weather-splash-drop-4 {
  animation: splashDropFall 0.34s cubic-bezier(0.4, 0, 0.2, 1) 1.26s forwards;
}

@keyframes splashDropFall {
  0% {
    opacity: 0;
    transform: translateY(-8px) scaleY(0.45);
  }
  25% {
    opacity: 1;
    transform: translateY(2px) scaleY(1.0);
  }
  75% {
    opacity: 0.92;
    transform: translateY(16px) scaleY(1.22);
  }
  100% {
    opacity: 0;
    transform: translateY(24px) scaleY(0.85);
  }
}

/* 6. Wordmark & Typography Fade-Up (1.4s – 2.0s) */
.weather-splash-wordmark-layer {
  animation: splashWordmarkUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.4s both;
}

@keyframes splashWordmarkUp {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.weather-splash-progress-bar {
  animation: splashProgressFill 1.8s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both;
}

@keyframes splashProgressFill {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

/* 7. Home Screen Transition / Crossfade Exit (2.0s – 2.5s) */
.weather-splash-exiting {
  animation: splashScreenExit 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
}

@keyframes splashScreenExit {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.02) translateY(-16px);
  }
}

/* Reduced Motion Fallback: Instant static display, simple fade-in / fade-out */
@media (prefers-reduced-motion: reduce) {
  .weather-splash-bg-flare,
  .weather-splash-badge-container,
  .weather-splash-squircle-layer,
  .weather-splash-sun-halo-layer,
  .weather-splash-sun-layer,
  .weather-splash-cloud-layer,
  .weather-splash-wordmark-layer,
  .weather-splash-drop,
  .weather-splash-progress-bar {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .weather-splash-drop {
    opacity: 0.9 !important;
  }

  .weather-splash-content-group {
    animation: splashReducedFadeIn 0.35s ease-out forwards !important;
  }

  .weather-splash-exiting {
    animation: splashReducedFadeOut 0.35s ease-in forwards !important;
  }

  @keyframes splashReducedFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes splashReducedFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
}
`;
