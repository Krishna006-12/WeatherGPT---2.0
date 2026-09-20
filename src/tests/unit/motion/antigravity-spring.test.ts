import { describe, it, expect } from "vitest";
import {
  ValueNoise,
  AntigravitySpring,
  DEFAULT_ANTIGRAVITY_CONFIG,
  getWeatherAntigravityConfig,
} from "@/lib/motion/antigravity-spring";

describe("ValueNoise generator", () => {
  it("produces deterministic values for the same seed and input", () => {
    const noise1 = new ValueNoise(42);
    const noise2 = new ValueNoise(42);

    expect(noise1.sample(0.5)).toBeCloseTo(noise2.sample(0.5), 6);
    expect(noise1.sample(14.8)).toBeCloseTo(noise2.sample(14.8), 6);
  });

  it("produces values strictly bounded in [-1, 1]", () => {
    const noise = new ValueNoise(99);
    for (let t = 0; t < 50; t += 0.25) {
      const val = noise.sample(t);
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("produces continuous transitions without abrupt discontinuities", () => {
    const noise = new ValueNoise(123);
    const step = 0.01;
    for (let t = 0; t < 5; t += step) {
      const v1 = noise.sample(t);
      const v2 = noise.sample(t + step);
      // Continuous smoothstep ensures small step delta
      expect(Math.abs(v2 - v1)).toBeLessThan(0.15);
    }
  });
});

describe("AntigravitySpring oscillator", () => {
  it("initializes at rest at position 0 and velocity 0", () => {
    const noise = new ValueNoise(1);
    const spring = new AntigravitySpring({
      stiffness: 0.06,
      damping: 0.85,
      amplitude: 14,
      frequency: 0.09,
      noise,
    });

    expect(spring.position).toBe(0);
    expect(spring.velocity).toBe(0);
  });

  it("progresses smoothly without numerical divergence", () => {
    const noise = new ValueNoise(1);
    const spring = new AntigravitySpring({
      stiffness: 0.06,
      damping: 0.85,
      amplitude: 14,
      frequency: 0.09,
      noise,
    });

    for (let i = 0; i < 200; i++) {
      spring.step(1 / 60, i / 60);
      expect(Number.isFinite(spring.position)).toBe(true);
      expect(Number.isFinite(spring.velocity)).toBe(true);
    }

    // Must stay within reasonable amplitude bound given amplitude 14
    expect(Math.abs(spring.position)).toBeLessThan(35);
  });

  it("converges toward an external impulse target when commanded", () => {
    const noise = new ValueNoise(1);
    const spring = new AntigravitySpring({
      stiffness: 0.15,
      damping: 0.8,
      amplitude: 10,
      frequency: 0.05,
      noise,
    });

    spring.setExternalTarget(10);
    expect(spring.useExternalTarget).toBe(true);

    for (let i = 0; i < 100; i++) {
      spring.step(1 / 60, i / 60);
    }

    // Should settle near the target of 10
    expect(spring.position).toBeGreaterThan(8.5);
    expect(spring.position).toBeLessThan(11.5);

    // After clearing, returns to tracking wander noise
    spring.clearExternalTarget();
    expect(spring.useExternalTarget).toBe(false);
  });

  it("dissipates velocity when damping is active and stiffness is zero", () => {
    const noise = new ValueNoise(1);
    const spring = new AntigravitySpring({
      stiffness: 0,
      damping: 0.8,
      amplitude: 10,
      frequency: 0.05,
      noise,
    });

    spring.velocity = 5.0;
    spring.step(1 / 60, 0);

    expect(spring.velocity).toBeCloseTo(4.0, 5); // 5.0 * 0.8 = 4.0
    spring.step(1 / 60, 1 / 60);
    expect(spring.velocity).toBeCloseTo(3.2, 5); // 4.0 * 0.8 = 3.2
  });
});

describe("Weather Antigravity Configurations", () => {
  it("provides balanced defaults for sunny conditions", () => {
    const config = getWeatherAntigravityConfig("sunny");
    expect(config.stiffness).toBe(DEFAULT_ANTIGRAVITY_CONFIG.stiffness);
    expect(config.bobAmplitudePx).toBe(14);
    expect(config.swayAmplitudePx).toBe(8);
  });

  it("provides breezy, higher sway amplitude for cloudy/windy conditions", () => {
    const config = getWeatherAntigravityConfig("cloudy");
    expect(config.swayAmplitudePx).toBeGreaterThan(DEFAULT_ANTIGRAVITY_CONFIG.swayAmplitudePx);
    expect(config.bobAmplitudePx).toBeGreaterThan(DEFAULT_ANTIGRAVITY_CONFIG.bobAmplitudePx);
  });

  it("provides gentler, buoyant floating for snowy conditions", () => {
    const config = getWeatherAntigravityConfig("snowy");
    expect(config.stiffness).toBeLessThan(DEFAULT_ANTIGRAVITY_CONFIG.stiffness);
    expect(config.bobAmplitudePx).toBeLessThan(DEFAULT_ANTIGRAVITY_CONFIG.bobAmplitudePx);
  });
});
