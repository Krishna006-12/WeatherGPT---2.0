/**
 * Antigravity Mascot Animation Physics Engine.
 *
 * Implements:
 * - Deterministic smoothed 1D lattice value noise for natural wandering without repetition.
 * - Damped harmonic spring oscillator with semi-implicit Euler integration.
 * - Multi-layer parallax depth factors & phase offsets.
 * - Weather-adaptive motion presets (sunny, cloudy, rainy, snowy).
 */

export interface AntigravityMascotConfig {
  stiffness: number;
  damping: number;
  noiseFrequency: number;
  bobAmplitudePx: number;
  swayAmplitudePx: number;
  maxTiltDegrees: number;
  layerDepths: number[];
  layerPhaseOffsetMs: number[];
  particleCount: number;
  enableParticles: boolean;
}

/**
 * 1D Value Noise using a seeded pseudo-random lattice and smoothstep interpolation.
 * Produces organic, continuous, non-mechanical wander signals in [-1, 1].
 */
export class ValueNoise {
  private lattice: number[];

  constructor(seed: number = 42) {
    this.lattice = [];
    let state = (seed ^ 0x9e3779b9) >>> 0;
    for (let i = 0; i < 256; i++) {
      // Linear congruential generator step
      state = Math.imul(state, 1664525) + 1013904223;
      const normalized = ((state >>> 0) / 4294967296) * 2 - 1;
      this.lattice.push(normalized);
    }
  }

  /**
   * Sample the continuous noise curve at position `t`.
   */
  sample(t: number): number {
    const i = Math.floor(t);
    const f = t - i;
    const len = this.lattice.length;
    const idxA = ((i % len) + len) % len;
    const idxB = (((i + 1) % len) + len) % len;
    const a = this.lattice[idxA] ?? 0;
    const b = this.lattice[idxB] ?? 0;
    // Smoothstep interpolation (3f^2 - 2f^3)
    const smooth = f * f * (3 - 2 * f);
    return a + (b - a) * smooth;
  }
}

export interface AntigravitySpringOptions {
  stiffness: number;
  damping: number;
  amplitude: number;
  frequency: number;
  noise: ValueNoise;
  phaseOffsetSeconds?: number;
}

/**
 * Critically-to-slightly-underdamped spring chasing a noise-driven wander target or external impulse.
 * Employs semi-implicit Euler integration for frame-rate-independent numerical stability.
 */
export class AntigravitySpring {
  readonly stiffness: number;
  readonly damping: number;
  readonly amplitude: number;
  readonly frequency: number;
  readonly phaseOffsetSeconds: number;
  private readonly noise: ValueNoise;

  position: number = 0;
  velocity: number = 0;
  private externalTarget: number = 0;
  useExternalTarget: boolean = false;

  constructor(options: AntigravitySpringOptions) {
    this.stiffness = options.stiffness;
    this.damping = options.damping;
    this.amplitude = options.amplitude;
    this.frequency = options.frequency;
    this.noise = options.noise;
    this.phaseOffsetSeconds = options.phaseOffsetSeconds ?? 0;
  }

  setExternalTarget(target: number): void {
    this.externalTarget = target;
    this.useExternalTarget = true;
  }

  clearExternalTarget(): void {
    this.useExternalTarget = false;
  }

  step(_dt: number, elapsedSeconds: number): void {
    const wanderTarget = this.useExternalTarget
      ? this.externalTarget
      : this.noise.sample((elapsedSeconds + this.phaseOffsetSeconds) * this.frequency) * this.amplitude;

    const accel = (wanderTarget - this.position) * this.stiffness;
    this.velocity = (this.velocity + accel) * this.damping;
    this.position += this.velocity;
  }
}

/**
 * Standard configuration presets tailored to different weather atmospheric conditions.
 */
export const DEFAULT_ANTIGRAVITY_CONFIG: AntigravityMascotConfig = {
  stiffness: 0.06,
  damping: 0.85,
  noiseFrequency: 0.09,
  bobAmplitudePx: 14.0,
  swayAmplitudePx: 8.0,
  maxTiltDegrees: 6.0,
  layerDepths: [0.35, 1.0, 1.6, 2.2], // [shadow, body, accessory/rim, particles]
  layerPhaseOffsetMs: [0, 90, 160, 230],
  particleCount: 10,
  enableParticles: true,
};

export function getWeatherAntigravityConfig(
  weatherType: "sunny" | "cloudy" | "rainy" | "snowy"
): AntigravityMascotConfig {
  switch (weatherType) {
    case "snowy":
      return {
        ...DEFAULT_ANTIGRAVITY_CONFIG,
        stiffness: 0.045,
        damping: 0.89,
        noiseFrequency: 0.06,
        bobAmplitudePx: 10.0,
        swayAmplitudePx: 6.0,
        maxTiltDegrees: 4.5,
        particleCount: 12,
      };
    case "rainy":
      return {
        ...DEFAULT_ANTIGRAVITY_CONFIG,
        stiffness: 0.055,
        damping: 0.86,
        noiseFrequency: 0.08,
        bobAmplitudePx: 12.0,
        swayAmplitudePx: 7.0,
        maxTiltDegrees: 5.0,
        particleCount: 10,
      };
    case "cloudy":
      return {
        ...DEFAULT_ANTIGRAVITY_CONFIG,
        stiffness: 0.075,
        damping: 0.82,
        noiseFrequency: 0.11,
        bobAmplitudePx: 16.0,
        swayAmplitudePx: 11.0,
        maxTiltDegrees: 7.5,
        particleCount: 8,
      };
    case "sunny":
    default:
      return {
        ...DEFAULT_ANTIGRAVITY_CONFIG,
        stiffness: 0.06,
        damping: 0.85,
        noiseFrequency: 0.09,
        bobAmplitudePx: 14.0,
        swayAmplitudePx: 8.0,
        maxTiltDegrees: 6.0,
        particleCount: 10,
      };
  }
}
