import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectInitialDeviceTier,
  TIER_CAPABILITIES,
  isReducedMotionPreferred,
} from "@/lib/motion/device-tier";

describe("Adaptive Device Tier Detection", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Default mock: reduced-motion is OFF
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe("1. Tier Capabilities Configuration", () => {
    it("configures high tier with full drift, parallax, and spring overshoot", () => {
      const high = TIER_CAPABILITIES.high;
      expect(high.driftEnvelopeScale).toBe(1.0);
      expect(high.parallaxMultiplier).toBe(1.0);
      expect(high.allowSpringOvershoot).toBe(true);
      expect(high.blurGlassEnabled).toBe(true);
      expect(high.isReducedMotion).toBe(false);
    });

    it("configures medium tier with 50% drift, reduced parallax, and critically damped springs", () => {
      const med = TIER_CAPABILITIES.medium;
      expect(med.driftEnvelopeScale).toBe(0.5);
      expect(med.parallaxMultiplier).toBe(0.5);
      expect(med.allowSpringOvershoot).toBe(false);
      expect(med.blurGlassEnabled).toBe(true);
      expect(med.isReducedMotion).toBe(false);
    });

    it("configures low tier with zero ambient drift, zero parallax, and instant/fast transitions", () => {
      const low = TIER_CAPABILITIES.low;
      expect(low.driftEnvelopeScale).toBe(0.0);
      expect(low.parallaxMultiplier).toBe(0.0);
      expect(low.allowSpringOvershoot).toBe(false);
      expect(low.blurGlassEnabled).toBe(false);
      expect(low.isReducedMotion).toBe(true);
      expect(low.maxTransitionDurationMs).toBeLessThanOrEqual(150);
    });
  });

  describe("2. prefers-reduced-motion Hard Override", () => {
    it("forces low tier regardless of high-end hardware when reduced-motion is requested", () => {
      // Mock reduced-motion = true
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      // Even with 32 cores and 64GB RAM
      Object.defineProperty(window, "navigator", {
        value: { hardwareConcurrency: 32, deviceMemory: 64 },
        configurable: true,
      });

      expect(isReducedMotionPreferred()).toBe(true);
      const tier = detectInitialDeviceTier();
      expect(tier).toBe("low");
    });
  });

  describe("3. Hardware Telemetry Classification", () => {
    it("detects high tier on high-concurrency systems (>= 8 cores, >= 8GB)", () => {
      Object.defineProperty(window, "navigator", {
        value: { hardwareConcurrency: 12, deviceMemory: 16 },
        configurable: true,
      });

      const tier = detectInitialDeviceTier();
      expect(tier).toBe("high");
    });

    it("detects low tier on constrained systems (<= 2 cores or <= 2GB)", () => {
      Object.defineProperty(window, "navigator", {
        value: { hardwareConcurrency: 2, deviceMemory: 2 },
        configurable: true,
      });

      const tier = detectInitialDeviceTier();
      expect(tier).toBe("low");
    });

    it("falls back to medium tier when telemetry is unavailable", () => {
      Object.defineProperty(window, "navigator", {
        value: { hardwareConcurrency: undefined, deviceMemory: undefined },
        configurable: true,
      });

      const tier = detectInitialDeviceTier();
      expect(tier).toBe("medium");
    });
  });
});
