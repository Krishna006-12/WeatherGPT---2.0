import { describe, it, expect } from "vitest";
import {
  APPLE_BEZIER_CURVES,
  APPLE_SPRINGS,
  solveSpring,
  calculateVelocityAwareSnap,
} from "@/lib/motion/easings";

describe("Apple System Easings & Spring Physics", () => {
  describe("1. Apple Cubic Bezier Curves", () => {
    it("defines valid Apple system standard curves", () => {
      expect(APPLE_BEZIER_CURVES.standard.css).toBe("cubic-bezier(0.4, 0.0, 0.2, 1)");
      expect(APPLE_BEZIER_CURVES.decelerate.css).toBe("cubic-bezier(0.0, 0.0, 0.2, 1)");
      expect(APPLE_BEZIER_CURVES.accelerate.css).toBe("cubic-bezier(0.4, 0.0, 1, 1)");
    });
  });

  describe("2. Damped Harmonic Oscillator Solver", () => {
    it("settles smoothly with controlled 4–8% overshoot for snappy spring", () => {
      const initialDisplacement = 100; // px
      const initialVelocity = 0;
      const spring = APPLE_SPRINGS.snappy;

      let minDisplacement = 0;

      // Sample over 1.5 seconds at 10ms intervals
      for (let i = 0; i <= 150; i++) {
        const t = i * 0.01;
        const res = solveSpring(initialDisplacement, initialVelocity, t, spring);
        if (res.displacement < minDisplacement) {
          minDisplacement = res.displacement;
        }
      }

      // Overshoot percentage = |minDisplacement| / initialDisplacement * 100
      const overshootPercent = (Math.abs(minDisplacement) / initialDisplacement) * 100;

      // Restrained overshoot between 3% and 9% (matches Apple's premium restraint)
      expect(overshootPercent).toBeGreaterThanOrEqual(3.0);
      expect(overshootPercent).toBeLessThanOrEqual(9.0);

      // Verify eventual settlement
      const settledRes = solveSpring(initialDisplacement, initialVelocity, 1.2, spring);
      expect(settledRes.settled).toBe(true);
      expect(settledRes.displacement).toBe(0);
    });

    it("settles monotonically with zero overshoot when critically damped", () => {
      const initialDisplacement = 100;
      const initialVelocity = 0;
      const spring = APPLE_SPRINGS.criticallyDamped;

      let crossedZero = false;

      for (let i = 0; i <= 100; i++) {
        const t = i * 0.01;
        const res = solveSpring(initialDisplacement, initialVelocity, t, spring);
        if (res.displacement < -0.01) {
          crossedZero = true;
        }
      }

      // Critically damped must never cross zero into negative overshoot
      expect(crossedZero).toBe(false);
    });
  });

  describe("3. Velocity-Aware Snap Calculation", () => {
    const itemWidth = 200;
    const totalItems = 5;

    it("snaps to next card on high forward velocity release even before 50% travel", () => {
      // Dragged only 20px (10% of width) but with strong negative velocity (-0.6 px/ms)
      const currentOffset = -20;
      const releaseVelocity = -0.6;

      const target = calculateVelocityAwareSnap(
        currentOffset,
        itemWidth,
        releaseVelocity,
        totalItems
      );

      // Snaps to index 1 (-200px)
      expect(target).toBe(-200);
    });

    it("snaps to previous card on high backward velocity release", () => {
      // Currently at index 2 (-400px), dragged forward slightly to -380px with positive velocity
      const currentOffset = -380;
      const releaseVelocity = 0.7;

      const target = calculateVelocityAwareSnap(
        currentOffset,
        itemWidth,
        releaseVelocity,
        totalItems
      );

      // Snaps back to index 1 (-200px)
      expect(target).toBe(-200);
    });

    it("snaps to nearest card when release velocity is low", () => {
      // Dragged 120px (60% of itemWidth) with gentle release
      const currentOffset = -120;
      const releaseVelocity = 0.05;

      const target = calculateVelocityAwareSnap(
        currentOffset,
        itemWidth,
        releaseVelocity,
        totalItems
      );

      // Snaps to index 1 (-200px) because > 50%
      expect(target).toBe(-200);

      // Dragged only 60px (30% of itemWidth) with gentle release
      const gentleOffset = -60;
      const targetGentle = calculateVelocityAwareSnap(
        gentleOffset,
        itemWidth,
        0.05,
        totalItems
      );

      // Snaps to index 0 (0px) because < 50%
      expect(targetGentle).toBe(0);
    });
  });
});
