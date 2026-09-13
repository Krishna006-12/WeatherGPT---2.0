/**
 * WeatherGPT 2.0 — Adaptive Device Performance Tiering.
 *
 * Classifies client runtime into high, medium, or low tiers via hardware
 * concurrency, device memory, a one-time synthetic RAF timing probe, and
 * the OS-level `prefers-reduced-motion` override.
 */

import { useState, useEffect } from "react";
import { APPLE_SPRINGS, type SpringConfig } from "./easings";

export type DeviceTier = "high" | "medium" | "low";

export interface TierCapabilities {
  tier: DeviceTier;
  isReducedMotion: boolean;
  driftEnvelopeScale: number; // 1.0 (high), 0.5 (medium), 0.0 (low)
  parallaxMultiplier: number; // 1.0 (high), 0.5 (medium), 0.0 (low)
  allowSpringOvershoot: boolean; // true (high), false (medium/low)
  springConfig: SpringConfig;
  blurGlassEnabled: boolean; // false on low-tier to save GPU fill-rate
  maxTransitionDurationMs: number;
}

export const TIER_CAPABILITIES: Record<DeviceTier, TierCapabilities> = {
  high: {
    tier: "high",
    isReducedMotion: false,
    driftEnvelopeScale: 1.0,
    parallaxMultiplier: 1.0,
    allowSpringOvershoot: true,
    springConfig: APPLE_SPRINGS.snappy,
    blurGlassEnabled: true,
    maxTransitionDurationMs: 400,
  },
  medium: {
    tier: "medium",
    isReducedMotion: false,
    driftEnvelopeScale: 0.5,
    parallaxMultiplier: 0.5,
    allowSpringOvershoot: false,
    springConfig: APPLE_SPRINGS.criticallyDamped,
    blurGlassEnabled: true,
    maxTransitionDurationMs: 250,
  },
  low: {
    tier: "low",
    isReducedMotion: true,
    driftEnvelopeScale: 0.0,
    parallaxMultiplier: 0.0,
    allowSpringOvershoot: false,
    springConfig: APPLE_SPRINGS.criticallyDamped,
    blurGlassEnabled: false,
    maxTransitionDurationMs: 150,
  },
};

// Cached client-side detection result to prevent re-probing
let cachedTier: DeviceTier | null = null;
let cachedReducedMotion: boolean | null = null;

/**
 * Checks if the user has requested reduced motion at the OS/browser level.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Executes a one-time synthetic 10-frame RAF jitter measurement
 * to detect thermal throttling or low-end rendering pipeline.
 */
function probeRafPerformance(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      resolve(false);
      return;
    }

    let frames = 0;
    let lastTime = performance.now();
    let totalJitter = 0;

    function onFrame(now: number) {
      const delta = now - lastTime;
      lastTime = now;
      frames++;

      // Expected ~16.6ms per frame at 60Hz. Delta > 32ms indicates dropped frame
      if (delta > 28) {
        totalJitter += delta - 16.67;
      }

      if (frames < 10) {
        window.requestAnimationFrame(onFrame);
      } else {
        // If jitter accumulated over 10 frames is high, flag as constrained
        resolve(totalJitter < 35);
      }
    }

    window.requestAnimationFrame(onFrame);
  });
}

/**
 * Synchronous initial tier estimation before async probe completes.
 * Fallback is ALWAYS 'medium' — never assumes high-end hardware blindly.
 */
export function detectInitialDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "medium";

  // 1. OS reduced-motion check: unconditional hard override
  if (isReducedMotionPreferred()) {
    return "low";
  }

  const nav = window.navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency;
  const ram = nav.deviceMemory;

  // Insufficient telemetry available -> safe medium fallback
  if (cores === undefined && ram === undefined) {
    return "medium";
  }

  // Low end indicators: <= 2 cores or <= 2GB RAM
  if ((cores !== undefined && cores <= 2) || (ram !== undefined && ram <= 2)) {
    return "low";
  }

  // High end indicators: >= 8 cores and (if reported) >= 8GB RAM
  if (cores !== undefined && cores >= 8 && (ram === undefined || ram >= 8)) {
    return "high";
  }

  return "medium";
}

/**
 * Performs full tier detection including the synthetic RAF probe.
 */
export async function detectDeviceTierAsync(): Promise<DeviceTier> {
  if (cachedTier !== null) return cachedTier;

  if (isReducedMotionPreferred()) {
    cachedTier = "low";
    return "low";
  }

  const initial = detectInitialDeviceTier();
  if (initial === "low") {
    cachedTier = "low";
    return "low";
  }

  const passedRaf = await probeRafPerformance();
  if (!passedRaf) {
    cachedTier = "medium";
    return "medium";
  }

  cachedTier = initial;
  return cachedTier;
}

/**
 * React hook providing reactive device tier and capability tokens.
 * Responds immediately to OS `prefers-reduced-motion` media query changes.
 */
export function useDeviceTier(): TierCapabilities {
  const [capabilities, setCapabilities] = useState<TierCapabilities>(() => {
    const reduced = isReducedMotionPreferred();
    if (reduced) return TIER_CAPABILITIES.low;
    const initial = detectInitialDeviceTier();
    return TIER_CAPABILITIES[initial];
  });

  useEffect(() => {
    let active = true;

    // Listen to OS prefers-reduced-motion change
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!active) return;
      if (e.matches) {
        setCapabilities(TIER_CAPABILITIES.low);
      } else {
        setCapabilities(TIER_CAPABILITIES[cachedTier || "medium"]);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    // Run async probe
    detectDeviceTierAsync().then((tier) => {
      if (!active) return;
      if (isReducedMotionPreferred()) {
        setCapabilities(TIER_CAPABILITIES.low);
      } else {
        setCapabilities(TIER_CAPABILITIES[tier]);
      }
    });

    return () => {
      active = false;
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  return capabilities;
}
