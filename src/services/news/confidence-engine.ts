/**
 * Deterministic Confidence Engine.
 *
 * Computes multi-factor evidence confidence scores and tiers:
 * HIGH, MODERATE, LOW, INSUFFICIENT_EVIDENCE
 *
 * Rules:
 * - Tier 1 authoritative sources establish strong baseline confidence.
 * - Independent corroboration from multiple sources boosts confidence.
 * - Missing coordinates and stale data reduce confidence.
 * - Never allows LLM outputs to arbitrarily adjust confidence.
 */

import type { NewsArticle, SourceTier } from "@/types/news";
import type { FreshnessLevel } from "@/types/events";
import { globalFreshnessEngine } from "./freshness-engine";

export type ConfidenceTier =
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "INSUFFICIENT_EVIDENCE";

export interface ConfidenceEvaluation {
  score: number; // 0.00 to 1.00
  tier: ConfidenceTier;
  highestSourceTier: SourceTier;
  independentSourceCount: number;
  factors: string[];
}

export class ConfidenceEngine {
  /**
   * Calculate deterministic confidence for a cluster of articles backing an event.
   */
  evaluate(
    articles: NewsArticle[],
    options?: {
      hasCoordinates?: boolean;
      freshnessLevel?: FreshnessLevel;
    }
  ): ConfidenceEvaluation {
    const factors: string[] = [];

    if (!articles || articles.length === 0) {
      return {
        score: 0.0,
        tier: "INSUFFICIENT_EVIDENCE",
        highestSourceTier: 3,
        independentSourceCount: 0,
        factors: ["No verified source articles provided."],
      };
    }

    // 1. Highest Source Tier Baseline
    let highestTier: SourceTier = 3;
    const uniqueSources = new Set<string>();

    for (const art of articles) {
      const tier = art.sourceTier ?? art.source?.tier ?? 3;
      if (tier < highestTier) {
        highestTier = tier;
      }
      uniqueSources.add((art.source?.name || "unknown").toLowerCase());
    }

    let base = 0.45;
    if (highestTier === 1) {
      base = 0.85;
      factors.push("Authoritative Tier 1 official agency report (base: 0.85).");
    } else if (highestTier === 2) {
      base = 0.65;
      factors.push("Established Tier 2 wire service or institutional feed (base: 0.65).");
    } else {
      base = 0.45;
      factors.push("Tier 3 unverified or secondary media reporting (base: 0.45).");
    }

    // 2. Corroboration from Independent Sources
    const independentCount = uniqueSources.size;
    let corroborationBonus = 0;
    if (independentCount > 1) {
      corroborationBonus = Math.min(0.12, (independentCount - 1) * 0.04);
      factors.push(
        `Corroborated by ${independentCount} independent sources (+${corroborationBonus.toFixed(2)}).`
      );
    }

    // 3. Geographic Precision
    let geoBonus = 0;
    if (options?.hasCoordinates) {
      geoBonus = 0.05;
      factors.push("Verified geographic coordinate precision (+0.05).");
    }

    // 4. Freshness Adjustment
    let freshnessAdj = 0;
    if (options?.freshnessLevel === "fresh" || options?.freshnessLevel === "recent") {
      freshnessAdj = 0.02;
    } else if (options?.freshnessLevel === "stale") {
      freshnessAdj = -0.04;
      factors.push("Stale data penalty (-0.04).");
    } else if (options?.freshnessLevel === "expired") {
      freshnessAdj = -0.08;
      factors.push("Expired data penalty (-0.08).");
    }

    const rawScore = base + corroborationBonus + geoBonus + freshnessAdj;
    const score = Math.max(0.05, Math.min(0.98, Number(rawScore.toFixed(2))));

    let tier: ConfidenceTier = "LOW";
    if (score >= 0.8) {
      tier = "HIGH";
    } else if (score >= 0.6) {
      tier = "MODERATE";
    } else if (score >= 0.3) {
      tier = "LOW";
    } else {
      tier = "INSUFFICIENT_EVIDENCE";
    }

    return {
      score,
      tier,
      highestSourceTier: highestTier,
      independentSourceCount: independentCount,
      factors,
    };
  }

  /**
   * Helper method returning the confidence score number directly.
   */
  calculateConfidence(articles: NewsArticle[], now?: Date): number {
    if (!articles || articles.length === 0) return 0;
    let freshnessLevel: FreshnessLevel | undefined;
    if (now) {
      const mostRecent = articles.reduce((latest, a) => {
        const t = new Date(a.publishedAt).getTime();
        return t > latest ? t : latest;
      }, 0);
      if (mostRecent > 0) {
        freshnessLevel = globalFreshnessEngine.assessFreshness(new Date(mostRecent).toISOString(), now).level;
      }
    }
    const hasCoordinates = articles.some(
      (a) => "location" in a && Boolean((a as { location?: { coordinates?: unknown } }).location?.coordinates)
    );
    return this.evaluate(articles, { freshnessLevel, hasCoordinates }).score;
  }
}

export const globalConfidenceEngine = new ConfidenceEngine();

