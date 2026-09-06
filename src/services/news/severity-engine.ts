/**
 * Deterministic Severity Engine.
 *
 * Classifies factual hazard severity based on authoritative source metadata,
 * official alert ratings, physical magnitude/intensity, and lexical evidence.
 *
 * Priority order:
 * 1. Authoritative official alerts (GDACS Red/Orange/Green, USGS PAGER alerts & Richter magnitude, NWS alert severity)
 * 2. Event type physical characteristics (e.g. major cyclones, flash floods)
 * 3. Lexical urgency markers in verified bulletins
 *
 * Rule: Gemini never sets factual severity; severity is strictly computed deterministically.
 */

import type { Severity, EventCategory } from "@/types/events";
import type { NewsArticle } from "@/types/news";

export interface AuthoritativeSeverityHints {
  gdacsAlertLevel?: string; // "Red" | "Orange" | "Green"
  usgsAlert?: string; // "red" | "orange" | "yellow" | "green"
  magnitude?: number;
  officialSeverity?: string; // "Extreme" | "Severe" | "Moderate" | "Minor"
  isTsunamiWarning?: boolean;
}

export class SeverityEngine {
  /**
   * Helper method to assess severity directly from a NewsArticle object.
   */
  assessArticleSeverity(
    article: Partial<NewsArticle> & {
      category?: string;
      authoritativeHint?: Record<string, unknown>;
    }
  ): Severity {
    const category = (article.category || "other") as EventCategory;
    const text = `${article.title || ""} ${article.summary || ""} ${article.content || ""}`;
    const hint = article.authoritativeHint;
    const hints: AuthoritativeSeverityHints | undefined = hint
      ? {
          gdacsAlertLevel: typeof hint.alertLevel === "string" ? hint.alertLevel : undefined,
          usgsAlert: typeof hint.alert === "string" ? hint.alert : undefined,
          magnitude: typeof hint.magnitude === "number" ? hint.magnitude : undefined,
          officialSeverity: typeof hint.severity === "string" ? hint.severity : undefined,
          isTsunamiWarning: Boolean(hint.isTsunamiWarning),
        }
      : undefined;
    return this.calculateSeverity(category, text, hints);
  }

  /**
   * Determine deterministic severity for an event given its category, text, and optional authoritative hints.
   */
  calculateSeverity(
    category: EventCategory,
    text: string,
    hints?: AuthoritativeSeverityHints
  ): Severity {
    // 1. Authoritative Official Hints (Tier 1 Priority)
    if (hints) {
      if (hints.isTsunamiWarning) {
        return "critical";
      }

      // GDACS official alert level
      if (hints.gdacsAlertLevel) {
        const lvl = hints.gdacsAlertLevel.trim().toLowerCase();
        if (lvl === "red") return "extreme";
        if (lvl === "orange") return "high";
        if (lvl === "green") return "moderate";
      }

      // USGS official earthquake alerts & magnitude
      if (hints.usgsAlert) {
        const uLvl = hints.usgsAlert.trim().toLowerCase();
        if (uLvl === "red") return "critical";
        if (uLvl === "orange") return "severe";
        if (uLvl === "yellow") return "high";
        if (uLvl === "green") return "moderate";
      }

      if (hints.magnitude !== undefined && !isNaN(hints.magnitude)) {
        if (hints.magnitude >= 7.5) return "critical";
        if (hints.magnitude >= 6.5) return "severe";
        if (hints.magnitude >= 5.5) return "high";
        if (hints.magnitude >= 4.5) return "moderate";
        if (hints.magnitude < 4.5) return "low";
      }

      // NWS / meteorological official severity
      if (hints.officialSeverity) {
        const oLvl = hints.officialSeverity.trim().toLowerCase();
        if (oLvl === "extreme") return "extreme";
        if (oLvl === "severe") return "high";
        if (oLvl === "moderate") return "moderate";
        if (oLvl === "minor") return "low";
      }
    }

    // 2. Extract hints embedded in text (e.g. "GDACS Alert: Red", "Magnitude: 6.8")
    const extractedHints = this.extractHintsFromText(text);
    if (extractedHints) {
      return this.calculateSeverity(category, text, extractedHints);
    }

    // 3. Deterministic Lexical Urgency Analysis
    const lower = text.toLowerCase();

    if (
      /\b(catastrophic|devastating|mass\s*casualties|unprecedented|state\s*of\s*emergency|red\s*alert|critical\s*emergency)\b/i.test(
        lower
      )
    ) {
      return "extreme";
    }

    if (
      /\b(severe|destructive|evacuat(e|ion)\s*order|danger|orange\s*alert|life[- ]threatening|major\s*damage)\b/i.test(
        lower
      )
    ) {
      return "high";
    }

    if (
      /\b(moderate|warning|advisory|yellow\s*alert|disrupt(ion|ive)|rising\s*water)\b/i.test(
        lower
      )
    ) {
      return "moderate";
    }

    if (/\b(minor|watch|informational|statement|notice|small)\b/i.test(lower)) {
      return "low";
    }

    // 4. Default Category Baselines
    if (category === "cyclone" || category === "tsunami") {
      return "high";
    }
    if (category === "flood" || category === "flash_flood" || category === "earthquake") {
      return "moderate";
    }

    return "low";
  }

  /**
   * Calculate aggregate severity across a cluster of articles.
   */
  calculateClusterSeverity(category: EventCategory, articles: NewsArticle[]): Severity {
    const combinedText = articles
      .map((a) => `${a.title} ${a.summary || ""} ${a.content || ""}`)
      .join("\n");

    const hints = this.extractHintsFromText(combinedText);
    return this.calculateSeverity(category, combinedText, hints);
  }

  private extractHintsFromText(text: string): AuthoritativeSeverityHints | undefined {
    const hints: AuthoritativeSeverityHints = {};
    let found = false;

    const gdacsMatch = text.match(/gdacs\s*alert:\s*(red|orange|green)/i);
    if (gdacsMatch && gdacsMatch[1]) {
      hints.gdacsAlertLevel = gdacsMatch[1];
      found = true;
    }

    const magMatch = text.match(/magnitude:?\s*([0-9]+\.?[0-9]*)/i);
    if (magMatch && magMatch[1]) {
      const parsedMag = parseFloat(magMatch[1]);
      if (!isNaN(parsedMag)) {
        hints.magnitude = parsedMag;
        found = true;
      }
    }

    const usgsAlertMatch = text.match(/usgs\s*pager\s*alert:\s*(red|orange|yellow|green)/i);
    if (usgsAlertMatch && usgsAlertMatch[1]) {
      hints.usgsAlert = usgsAlertMatch[1];
      found = true;
    }

    const tsunamiMatch = text.match(/tsunami\s*(?:warning|advisory):\s*possible/i);
    if (tsunamiMatch) {
      hints.isTsunamiWarning = true;
      found = true;
    }

    const offSevMatch = text.match(/severity:\s*(extreme|severe|moderate|minor)/i);
    if (offSevMatch && offSevMatch[1]) {
      hints.officialSeverity = offSevMatch[1];
      found = true;
    }

    return found ? hints : undefined;
  }
}

export const globalSeverityEngine = new SeverityEngine();
