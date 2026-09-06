/**
 * Deterministic Event Lifecycle Engine.
 *
 * Manages lifecycle states:
 * - ACTIVE: Fresh, ongoing disaster event requiring situational awareness.
 * - MONITORING: Precautionary or secondary event under observation.
 * - RESOLVED: Natural conclusion of an acute event (passed storm, earthquake aftershock window closed).
 * - EXPIRED: Aged beyond active intelligence tracking (> 7 days without fresh bulletin).
 *
 * Rule: Historical evidence is preserved in storage; events transition states rather than being deleted.
 */

import type { EventStatus, EventCategory, FreshnessLevel } from "@/types/events";
import { globalFreshnessEngine } from "./freshness-engine";

export interface LifecycleAssessmentParams {
  category: EventCategory;
  freshnessLevel: FreshnessLevel;
  ageMinutes: number;
  sourceStatus?: string; // e.g. "active", "cancelled", "expired", "resolved"
  hasActiveAdvisories?: boolean;
}

export class LifecycleEngine {
  /**
   * Determine deterministic lifecycle status based on category, age, freshness, and source signals.
   */
  determineStatus(params: LifecycleAssessmentParams): EventStatus {
    const { category, freshnessLevel, ageMinutes, sourceStatus, hasActiveAdvisories } = params;

    // 1. Explicit Source Cancellation / Expiration
    if (sourceStatus) {
      const lower = sourceStatus.toLowerCase();
      if (lower === "cancelled" || lower === "expired" || lower === "past") {
        return "resolved";
      }
      if (lower === "resolved" || lower === "cleared") {
        return "resolved";
      }
    }

    // 2. Freshness Hard Expiry (> 7 days)
    if (freshnessLevel === "expired" || ageMinutes >= 10080) {
      return "expired";
    }

    // 3. Stale Events (3 to 7 days without updates)
    if (freshnessLevel === "stale") {
      return "resolved";
    }

    // 4. Hazard-Specific Lifecycle Physics
    // Earthquakes: Initial shock is acute. After 72 hours (4320 min) without new tremor reports, transition to resolved
    if (category === "earthquake") {
      if (ageMinutes > 4320 && !hasActiveAdvisories) {
        return "resolved";
      }
      if (ageMinutes > 1440) {
        return "monitoring";
      }
    }

    // Flash Floods & Severe Storms: After 48 hours without fresh advisory, mark monitoring or resolved
    if (category === "flash_flood" || category === "severe_storm" || category === "thunderstorm") {
      if (ageMinutes > 2880 && !hasActiveAdvisories) {
        return "resolved";
      }
    }

    // Aging events (24h - 72h)
    if (freshnessLevel === "aging") {
      return hasActiveAdvisories ? "monitoring" : "monitoring";
    }

    // Fresh or Recent events
    return "active";
  }

  /**
   * Helper to determine lifecycle directly from ISO timestamps.
   */
  determineLifecycle(
    firstSeenAt: string,
    lastUpdatedAt: string,
    now: Date = new Date(),
    category: EventCategory = "flood"
  ): EventStatus {
    const lastUpdateMs = new Date(lastUpdatedAt).getTime();
    const ageMinutes = Math.max(0, Math.floor((now.getTime() - lastUpdateMs) / 60000));
    const freshness = globalFreshnessEngine.assessFreshness(lastUpdatedAt, now);
    return this.determineStatus({
      category,
      freshnessLevel: freshness.level,
      ageMinutes,
    });
  }
}

export const globalLifecycleEngine = new LifecycleEngine();

