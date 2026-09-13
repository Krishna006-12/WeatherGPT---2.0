/**
 * WeatherGPT 2.0 — Apple System Easings & Spring Physics.
 *
 * Provides Apple-caliber system cubic-bezier curves, spring parameters,
 * and an exact analytical damped harmonic oscillator solver for interactive
 * fluid inertia and velocity-aware snap settling.
 */

export interface CubicBezierCurve {
  name: string;
  css: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const APPLE_BEZIER_CURVES = {
  standard: {
    name: "--ease-standard",
    css: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    x1: 0.4,
    y1: 0.0,
    x2: 0.2,
    y2: 1.0,
  },
  decelerate: {
    name: "--ease-decelerate",
    css: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    x1: 0.0,
    y1: 0.0,
    x2: 0.2,
    y2: 1.0,
  },
  accelerate: {
    name: "--ease-accelerate",
    css: "cubic-bezier(0.4, 0.0, 1, 1)",
    x1: 0.4,
    y1: 0.0,
    x2: 1.0,
    y2: 1.0,
  },
} as const;

export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  name: string;
}

export type AppleSpringPreset = "soft" | "snappy" | "criticallyDamped";

export const APPLE_SPRINGS: Record<AppleSpringPreset, SpringConfig> = {
  soft: {
    mass: 1.0,
    stiffness: 120,
    damping: 15.5, // damping ratio ~0.707 (controlled 4–8% overshoot)
    name: "--ease-spring-soft",
  },
  snappy: {
    mass: 1.0,
    stiffness: 280,
    damping: 24.5, // damping ratio ~0.732 (crisp, restrained snap)
    name: "--ease-spring-snappy",
  },
  criticallyDamped: {
    mass: 1.0,
    stiffness: 180,
    damping: 26.83, // damping ratio = 1.0 (zero overshoot for medium/low device tier)
    name: "--ease-spring-critical",
  },
};

export interface SpringState {
  position: number;
  velocity: number; // px/ms
  target: number;
  settled: boolean;
}

/**
 * Analytical Damped Harmonic Oscillator Solver.
 * Computes exact position and velocity at any arbitrary elapsed time t (in seconds),
 * without step-by-step Euler numerical integration errors.
 */
export function solveSpring(
  initialDisplacement: number, // x0 = current - target
  initialVelocity: number, // v0 in units/sec
  elapsedSeconds: number,
  config: SpringConfig
): { displacement: number; velocity: number; settled: boolean } {
  const m = config.mass;
  const k = config.stiffness;
  const c = config.damping;

  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
  const t = Math.max(0, elapsedSeconds);

  // Underdamped (0 <= zeta < 1): controlled elastic overshoot
  if (zeta < 0.999) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const c1 = initialDisplacement;
    const c2 = (initialVelocity + zeta * omega0 * initialDisplacement) / omegaD;

    const decay = Math.exp(-zeta * omega0 * t);
    const cosVal = Math.cos(omegaD * t);
    const sinVal = Math.sin(omegaD * t);

    const displacement = decay * (c1 * cosVal + c2 * sinVal);
    const velocity =
      -zeta * omega0 * displacement +
      decay * (-c1 * omegaD * sinVal + c2 * omegaD * cosVal);

    const isSettled =
      Math.abs(displacement) < 0.2 && Math.abs(velocity) < 2.0 && t > 0.15;

    return {
      displacement: isSettled ? 0 : displacement,
      velocity: isSettled ? 0 : velocity,
      settled: isSettled,
    };
  }

  // Critically damped (zeta >= 0.999): settles smoothly with zero overshoot
  const c1 = initialDisplacement;
  const c2 = initialVelocity + omega0 * initialDisplacement;
  const decay = Math.exp(-omega0 * t);

  const displacement = decay * (c1 + c2 * t);
  const velocity = decay * (c2 - omega0 * (c1 + c2 * t));

  const isSettled =
    Math.abs(displacement) < 0.2 && Math.abs(velocity) < 2.0 && t > 0.15;

  return {
    displacement: isSettled ? 0 : displacement,
    velocity: isSettled ? 0 : velocity,
    settled: isSettled,
  };
}

/**
 * Calculates velocity-aware snap target point for carousels / paged strips.
 * If release velocity exceeds 0.5 px/ms (500 px/s), snaps in velocity direction
 * even if displacement alone did not cross the 50% threshold.
 */
export function calculateVelocityAwareSnap(
  currentOffset: number,
  itemWidth: number,
  releaseVelocityPxMs: number,
  totalItems: number
): number {
  const currentIndex = Math.round(-currentOffset / itemWidth);
  const thresholdVelocity = 0.45; // px/ms

  let targetIndex = currentIndex;

  if (releaseVelocityPxMs < -thresholdVelocity) {
    targetIndex = Math.min(totalItems - 1, currentIndex + 1);
  } else if (releaseVelocityPxMs > thresholdVelocity) {
    targetIndex = Math.max(0, currentIndex - 1);
  } else {
    targetIndex = Math.max(0, Math.min(totalItems - 1, Math.round(-currentOffset / itemWidth)));
  }

  const rawOffset = -targetIndex * itemWidth;
  return rawOffset === 0 ? 0 : rawOffset;
}
