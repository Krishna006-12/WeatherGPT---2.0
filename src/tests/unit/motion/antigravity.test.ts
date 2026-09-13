import { describe, it, expect } from "vitest";
import {
  hashStringSeed,
  seededRandoms,
  generateDriftHarmonics,
  computeAmbientDrift,
  computeImpulseDisplacement,
  MASS_TIER_CONFIGS,
  type MassTier,
} from "@/lib/motion/antigravity";

describe("Antigravity Physics Model", () => {
  describe("1. Seeded PRNG & Determinism", () => {
    it("produces identical values for identical string seeds", () => {
      const r1 = seededRandoms("delhi-temp-dial", 5);
      const r2 = seededRandoms("delhi-temp-dial", 5);
      expect(r1).toEqual(r2);
    });

    it("produces distinct values for different element IDs", () => {
      const r1 = seededRandoms("element-alpha", 5);
      const r2 = seededRandoms("element-beta", 5);
      expect(r1).not.toEqual(r2);
    });

    it("bounds all pseudo-random numbers strictly in [0, 1)", () => {
      const r = seededRandoms("bounds-check-seed", 50);
      for (const val of r) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("2. Drift Harmonics Generation", () => {
    it("randomizes period strictly within ±15% of mass tier base period", () => {
      const lightConfig = MASS_TIER_CONFIGS.light;
      const harmonics = generateDriftHarmonics("test-light-element", "light");

      const minPeriod = lightConfig.basePeriodMs * 0.85;
      const maxPeriod = lightConfig.basePeriodMs * 1.15;

      expect(harmonics.periodMs).toBeGreaterThanOrEqual(minPeriod);
      expect(harmonics.periodMs).toBeLessThanOrEqual(maxPeriod);
    });

    it("ensures different element IDs have incommensurate phase offsets", () => {
      const h1 = generateDriftHarmonics("card-a", "medium");
      const h2 = generateDriftHarmonics("card-b", "medium");

      expect(h1.phaseY1).not.toEqual(h2.phaseY1);
      expect(h1.periodMs).not.toEqual(h2.periodMs);
    });
  });

  describe("3. Ambient Drift Envelopes", () => {
    const tiers: MassTier[] = ["light", "medium", "heavy"];

    tiers.forEach((tier) => {
      it(`restricts ${tier} mass tier displacement within theoretical ±envelope bounds`, () => {
        const harmonics = generateDriftHarmonics(`test-${tier}`, tier);
        const config = MASS_TIER_CONFIGS[tier];

        // Sample 200 time steps across two full periods
        const stepMs = harmonics.periodMs / 100;
        for (let i = 0; i < 200; i++) {
          const t = i * stepMs;
          const disp = computeAmbientDrift(t, harmonics, tier);

          // Allow a tiny float precision epsilon
          expect(Math.abs(disp.y)).toBeLessThanOrEqual(config.envelopeY + 0.01);
          expect(Math.abs(disp.x)).toBeLessThanOrEqual(config.envelopeX + 0.01);
          expect(Math.abs(disp.rotationDeg)).toBeLessThanOrEqual(config.maxRotationDeg + 0.01);
        }
      });
    });

    it("scales envelope by envelopeScale multiplier", () => {
      const harmonics = generateDriftHarmonics("scaled-element", "medium");
      const dispFull = computeAmbientDrift(1200, harmonics, "medium", 1.0);
      const dispHalf = computeAmbientDrift(1200, harmonics, "medium", 0.5);
      const dispZero = computeAmbientDrift(1200, harmonics, "medium", 0.0);

      expect(dispHalf.y).toBeCloseTo(dispFull.y * 0.5, 4);
      expect(dispZero.y).toBe(0);
      expect(dispZero.x).toBe(0);
      expect(dispZero.rotationDeg).toBe(0);
    });
  });

  describe("4. Momentum Decay & Physical Inertia", () => {
    it("follows exact exponential velocity decay v(t) = v0 * e^(-t/tau)", () => {
      const impulse = {
        initialVelocityX: 1.5,
        initialVelocityY: -2.0,
        startTimeMs: 1000,
        massTier: "medium" as MassTier,
      };

      const tau = MASS_TIER_CONFIGS.medium.tauMs;
      const sensitivity = MASS_TIER_CONFIGS.medium.impulseSensitivity;
      const elapsed = 400; // ms

      const result = computeImpulseDisplacement(impulse, 1000 + elapsed);

      const expectedVy = -2.0 * Math.exp(-elapsed / tau) * sensitivity;
      expect(result.vy).toBeCloseTo(expectedVy, 4);
      expect(result.settled).toBe(false);
    });

    it("settles after settleTimeMs has elapsed", () => {
      const impulse = {
        initialVelocityX: 1.0,
        initialVelocityY: 1.0,
        startTimeMs: 0,
        massTier: "light" as MassTier,
      };

      const settleTime = MASS_TIER_CONFIGS.light.settleTimeMs;
      const result = computeImpulseDisplacement(impulse, settleTime + 50);

      expect(result.settled).toBe(true);
      expect(result.vx).toBe(0);
      expect(result.vy).toBe(0);
    });

    it("gives heavy mass tier longer settle time and smaller impulse response than light", () => {
      const light = MASS_TIER_CONFIGS.light;
      const heavy = MASS_TIER_CONFIGS.heavy;

      expect(heavy.settleTimeMs).toBeGreaterThan(light.settleTimeMs);
      expect(heavy.tauMs).toBeGreaterThan(light.tauMs);
      expect(heavy.impulseSensitivity).toBeLessThan(light.impulseSensitivity);
    });
  });
});
