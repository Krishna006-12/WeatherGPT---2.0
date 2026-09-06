/**
 * Deterministic Freshness Engine.
 *
 * Classifies event and article freshness without hallucination:
 * FRESH   (< 6h)
 * RECENT  (6h - 24h)
 * AGING   (24h - 72h)
 * STALE   (72h - 7d)
 * EXPIRED (> 7d)
 *
 * Rule: Never reports "live" if data is AGING, STALE, or EXPIRED.
 */

import type { FreshnessInfo, FreshnessLevel } from "@/types/events";

export class FreshnessEngine {
  /**
   * Assess deterministic freshness for an event or article timestamp.
   */
  assessFreshness(
    timestamp: string | Date,
    referenceTime: string | Date = new Date()
  ): FreshnessInfo {
    return this.calculateFreshness(timestamp, referenceTime);
  }

  /**
   * Calculate deterministic freshness for an event or article timestamp.
   */
  calculateFreshness(
    timestamp: string | Date,
    referenceTime: string | Date = new Date()
  ): FreshnessInfo {
    const targetDate = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const refDate =
      typeof referenceTime === "string" ? new Date(referenceTime) : referenceTime;

    const lastCheckedAt = refDate.toISOString();

    if (isNaN(targetDate.getTime())) {
      return {
        level: "expired",
        label: "Unknown date",
        isLive: false,
        ageMinutes: Infinity,
        lastCheckedAt,
      };
    }

    const diffMs = Math.max(0, refDate.getTime() - targetDate.getTime());
    const ageMinutes = Math.floor(diffMs / (1000 * 60));

    let level: FreshnessLevel = "fresh";
    let isLive = true;

    if (ageMinutes < 360) {
      level = "fresh";
      isLive = true;
    } else if (ageMinutes < 1440) {
      level = "recent";
      isLive = true;
    } else if (ageMinutes < 4320) {
      level = "aging";
      isLive = false;
    } else if (ageMinutes < 10080) {
      level = "stale";
      isLive = false;
    } else {
      level = "expired";
      isLive = false;
    }

    const label = this.formatFreshnessLabel(ageMinutes, level);

    return {
      level,
      label,
      isLive,
      ageMinutes,
      lastCheckedAt,
    };
  }

  /**
   * Format human-readable freshness label with accurate relative time.
   */
  formatFreshnessLabel(ageMinutes: number, level: FreshnessLevel): string {
    if (level === "expired") {
      return "Expired (> 7 days ago)";
    }
    if (level === "stale") {
      const days = Math.floor(ageMinutes / 1440);
      return `Stale (${days} days ago)`;
    }
    if (ageMinutes < 1) {
      return "Updated just now";
    }
    if (ageMinutes === 1) {
      return "Updated 1 min ago";
    }
    if (ageMinutes < 60) {
      return `Updated ${ageMinutes} min ago`;
    }
    const hours = Math.floor(ageMinutes / 60);
    if (hours === 1) {
      return "Updated 1 hour ago";
    }
    if (hours < 24) {
      return `Updated ${hours} hours ago`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return "Updated 1 day ago";
    }
    return `Updated ${days} days ago`;
  }
}

export const globalFreshnessEngine = new FreshnessEngine();
