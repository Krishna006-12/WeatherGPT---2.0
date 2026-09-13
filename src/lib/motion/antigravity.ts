/**
 * WeatherGPT 2.0 — Antigravity Physics Model.
 *
 * Centralized, shared physics engine for weightless, buoyant, and inertial
 * weather elements (clouds, precipitation particles, temperature dial,
 * alert badges, forecast cards).
 *
 * Guaranteed mathematical properties:
 * - Base gravity g = 0 with restoring buoyancy band (±8–14px envelope).
 * - Multi-harmonic Lissajous drift with incommensurate frequencies (no mechanical repetition).
 * - Deterministic element-id PRNG seeding (zero hydration mismatch, no render jitter).
 * - Exponential momentum decay: velocity(t) = v0 * e^(-t / tau).
 * - 3 typed mass/inertia tiers (light / medium / heavy) with physically proportionate settle curves.
 */

export type MassTier = "light" | "medium" | "heavy";

export interface MassTierConfig {
  tauMs: number; // Time constant for exponential decay (380–900ms)
  settleTimeMs: number; // Duration until decay drops below 0.5% (approx 5.3 * tau)
  impulseSensitivity: number; // Multiplier on incoming velocity / nudge
  envelopeY: number; // Vertical drift envelope (px)
  envelopeX: number; // Horizontal drift envelope (px)
  maxRotationDeg: number; // Subtle tilt envelope (degrees)
  basePeriodMs: number; // Base cycle duration (ms)
  buoyancyK: number; // Restoring buoyancy stiffness (px/ms^2)
}

export const MASS_TIER_CONFIGS: Record<MassTier, MassTierConfig> = {
  light: {
    tauMs: 420,
    settleTimeMs: 2200,
    impulseSensitivity: 1.0,
    envelopeY: 8,
    envelopeX: 4,
    maxRotationDeg: 1.5,
    basePeriodMs: 4800,
    buoyancyK: 0.05,
  },
  medium: {
    tauMs: 580,
    settleTimeMs: 3100,
    impulseSensitivity: 0.65,
    envelopeY: 11,
    envelopeX: 5.5,
    maxRotationDeg: 1.0,
    basePeriodMs: 6000,
    buoyancyK: 0.035,
  },
  heavy: {
    tauMs: 780,
    settleTimeMs: 4200,
    impulseSensitivity: 0.35,
    envelopeY: 14,
    envelopeX: 7,
    maxRotationDeg: 0.6,
    basePeriodMs: 7200,
    buoyancyK: 0.022,
  },
};

/**
 * 32-bit FNV-1a deterministic hash of a string seed.
 * Produces uniform pseudo-random values in [0, 1) without Math.random.
 */
export function hashStringSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 4294967296;
}

/**
 * Generates an array of n deterministic pseudo-random floats in [0, 1) from a seed.
 */
export function seededRandoms(seed: string, count: number): number[] {
  const result: number[] = [];
  let h = hashStringSeed(seed) * 4294967296;
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    result.push((h >>> 0) / 4294967296);
  }
  return result;
}

export interface DriftHarmonics {
  periodMs: number;
  omegaY1: number;
  omegaY2: number;
  omegaY3: number;
  phaseY1: number;
  phaseY2: number;
  phaseY3: number;
  weightY1: number;
  weightY2: number;
  weightY3: number;

  omegaX1: number;
  omegaX2: number;
  phaseX1: number;
  phaseX2: number;
  weightX1: number;
  weightX2: number;

  omegaR1: number;
  omegaR2: number;
  phaseR1: number;
  phaseR2: number;
}

/**
 * Computes deterministic incommensurate harmonic frequencies and phases
 * for an element instance, guaranteeing that multiple floating elements
 * will never visibly synchronize.
 */
export function generateDriftHarmonics(id: string, massTier: MassTier): DriftHarmonics {
  const config = MASS_TIER_CONFIGS[massTier];
  const r = seededRandoms(id, 14);

  // Randomize period within ±15%
  const periodVariance = (r[0]! - 0.5) * 0.3; // -0.15 to +0.15
  const periodMs = config.basePeriodMs * (1 + periodVariance);
  const baseOmega = (2 * Math.PI) / periodMs;

  // Incommensurate frequency ratios using golden ratio (1.618) and sqrt(2) (1.414)
  return {
    periodMs,
    // Y Axis (3 frequencies for rich buoyant drift)
    omegaY1: baseOmega * (1.0 + (r[1]! - 0.5) * 0.1),
    omegaY2: baseOmega * (1.61803398875 + (r[2]! - 0.5) * 0.12),
    omegaY3: baseOmega * (2.2360679775 + (r[3]! - 0.5) * 0.15),
    phaseY1: r[4]! * 2 * Math.PI,
    phaseY2: r[5]! * 2 * Math.PI,
    phaseY3: r[6]! * 2 * Math.PI,
    weightY1: 0.55,
    weightY2: 0.30,
    weightY3: 0.15,

    // X Axis (2 incommensurate frequencies)
    omegaX1: baseOmega * (0.61803398875 + (r[7]! - 0.5) * 0.08),
    omegaX2: baseOmega * (1.41421356237 + (r[8]! - 0.5) * 0.1),
    phaseX1: r[9]! * 2 * Math.PI,
    phaseX2: r[10]! * 2 * Math.PI,
    weightX1: 0.65,
    weightX2: 0.35,

    // Rotation Axis
    omegaR1: baseOmega * (0.70710678118 + (r[11]! - 0.5) * 0.08),
    omegaR2: baseOmega * (1.27201964951 + (r[12]! - 0.5) * 0.1),
    phaseR1: r[13]! * 2 * Math.PI,
    phaseR2: (r[0]! + 0.33) * 2 * Math.PI,
  };
}

export interface FloatingDisplacement {
  x: number; // Horizontal offset in pixels
  y: number; // Vertical offset in pixels
  rotationDeg: number; // Rotation in degrees
}

/**
 * Computes instantaneous ambient antigravity drift displacement at time `t` (in ms).
 * Pure function: zero side-effects, zero allocations in hot loop when cached.
 */
export function computeAmbientDrift(
  timeMs: number,
  harmonics: DriftHarmonics,
  massTier: MassTier,
  envelopeScale: number = 1.0
): FloatingDisplacement {
  if (envelopeScale <= 0) {
    return { x: 0, y: 0, rotationDeg: 0 };
  }

  const config = MASS_TIER_CONFIGS[massTier];
  const scale = envelopeScale;

  // Y displacement: sum of 3 incommensurate sines
  const sinY1 = Math.sin(harmonics.omegaY1 * timeMs + harmonics.phaseY1);
  const sinY2 = Math.sin(harmonics.omegaY2 * timeMs + harmonics.phaseY2);
  const sinY3 = Math.sin(harmonics.omegaY3 * timeMs + harmonics.phaseY3);
  const normalizedY =
    sinY1 * harmonics.weightY1 +
    sinY2 * harmonics.weightY2 +
    sinY3 * harmonics.weightY3;
  const rawY = normalizedY * config.envelopeY * scale;
  const y = Math.abs(rawY) < 1e-12 ? 0 : rawY;

  // X displacement: sum of 2 incommensurate sines
  const sinX1 = Math.sin(harmonics.omegaX1 * timeMs + harmonics.phaseX1);
  const sinX2 = Math.sin(harmonics.omegaX2 * timeMs + harmonics.phaseX2);
  const normalizedX = sinX1 * harmonics.weightX1 + sinX2 * harmonics.weightX2;
  const rawX = normalizedX * config.envelopeX * scale;
  const x = Math.abs(rawX) < 1e-12 ? 0 : rawX;

  // Rotation displacement
  const sinR1 = Math.sin(harmonics.omegaR1 * timeMs + harmonics.phaseR1);
  const sinR2 = Math.sin(harmonics.omegaR2 * timeMs + harmonics.phaseR2);
  const normalizedR = sinR1 * 0.7 + sinR2 * 0.3;
  const rawR = normalizedR * config.maxRotationDeg * scale;
  const rotationDeg = Math.abs(rawR) < 1e-12 ? 0 : rawR;

  return { x, y, rotationDeg };
}

export interface MomentumImpulseState {
  initialVelocityX: number; // px/ms
  initialVelocityY: number; // px/ms
  startTimeMs: number; // timestamp when impulse was imparted
  massTier: MassTier;
}

/**
 * Computes instantaneous displacement and velocity from an external impulse
 * (e.g. pointer drag release, flick, or data update nudge) using exact
 * exponential decay:
 *
 * velocity(t) = v0 * e^(-t / tau)
 * displacement(t) = v0 * tau * (1 - e^(-t / tau))
 */
export function computeImpulseDisplacement(
  impulse: MomentumImpulseState,
  currentTimeMs: number
): { x: number; y: number; vx: number; vy: number; settled: boolean } {
  const config = MASS_TIER_CONFIGS[impulse.massTier];
  const elapsedMs = Math.max(0, currentTimeMs - impulse.startTimeMs);

  if (elapsedMs >= config.settleTimeMs) {
    return {
      x: impulse.initialVelocityX * config.tauMs * config.impulseSensitivity,
      y: impulse.initialVelocityY * config.tauMs * config.impulseSensitivity,
      vx: 0,
      vy: 0,
      settled: true,
    };
  }

  const decayFactor = Math.exp(-elapsedMs / config.tauMs);
  const displacementFactor = (1 - decayFactor) * config.tauMs * config.impulseSensitivity;

  return {
    x: impulse.initialVelocityX * displacementFactor,
    y: impulse.initialVelocityY * displacementFactor,
    vx: impulse.initialVelocityX * decayFactor * config.impulseSensitivity,
    vy: impulse.initialVelocityY * decayFactor * config.impulseSensitivity,
    settled: decayFactor < 0.005,
  };
}
