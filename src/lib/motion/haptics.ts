/**
 * WeatherGPT 2.0 — Haptic Feedback Engine.
 *
 * Provides subtle tactile feedback for micro-interactions, snap-settling,
 * and critical state changes. Feature-detects the Vibration API and silently
 * no-ops when unsupported or blocked by permissions.
 */

export type HapticStyle = "light" | "medium" | "heavy" | "snap" | "warning";

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8, // Very subtle 8ms tick
  medium: 15,
  heavy: 25,
  snap: 10, // Crisp 10ms click on card snap-to
  warning: [20, 40, 20], // Alert notification double-pulse
};

/**
 * Triggers a restrained haptic pulse if supported by the browser/device.
 * Never throws; completely silent on non-supporting devices.
 */
export function triggerHaptic(style: HapticStyle = "snap"): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (typeof navigator.vibrate !== "function") {
    return false;
  }

  try {
    const pattern = HAPTIC_PATTERNS[style];
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}
