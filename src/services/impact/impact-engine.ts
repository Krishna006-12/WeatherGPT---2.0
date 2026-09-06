/**
 * Deterministic, evidence-based Impact Engine.
 * Answers: "How relevant is this event to this location?"
 *
 * Implements strict hydrological safety, explicit evidence tracking,
 * and deterministic confidence scoring without relying on LLMs.
 */

import type {
  WeatherEvent,
  EventLocation,
  Severity,
  IndiaImpactAssessment,
} from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";
import type {
  ImpactAssessment,
  ImpactLevel,
  RelevanceStatus,
  EvidenceItem,
} from "@/types/impact";
import { calculateHaversineDistanceKm, getProximityTier } from "@/lib/geo-distance";
import { correlateWeatherWithHazard } from "@/lib/weather-correlator";
import { generateDeterministicHash } from "@/lib/deduplicator";

const METHODOLOGY_VERSION = "impact-engine-v1";

function severityToImpactLevel(severity: Severity): ImpactLevel {
  switch (severity) {
    case "info":
    case "low":
      return "low";
    case "moderate":
      return "moderate";
    case "high":
    case "severe":
      return "high";
    case "extreme":
    case "critical":
      return "extreme";
    default:
      return "moderate";
  }
}

export class ImpactEngine {
  /**
   * Assess the impact of a WeatherEvent on a target location.
   */
  assessImpact(
    event: WeatherEvent,
    targetLocation: EventLocation,
    weather?: WeatherSnapshot
  ): ImpactAssessment {
    const assessedAt = new Date().toISOString();
    const evidence: EvidenceItem[] = [];
    const reasons: string[] = [];

    const targetCity = targetLocation.city || targetLocation.name;
    const targetRegion = targetLocation.region;
    const targetCountry = targetLocation.country;

    // --- 1. Explicit Geographic Matching ---
    const isCityMatch = this.checkCityMatch(event, targetCity);
    const isRegionMatch = this.checkRegionMatch(event, targetRegion);
    const isCountryMatch = this.checkCountryMatch(event, targetCountry);

    // --- 2. Distance and Proximity Check ---
    let distanceKm: number | undefined;
    if (targetLocation.coordinates && event.location.coordinates) {
      distanceKm = calculateHaversineDistanceKm(
        targetLocation.coordinates,
        event.location.coordinates
      );
      const proximityTier = getProximityTier(distanceKm);
      evidence.push({
        type: "geographic_proximity",
        description: `Target location is approximately ${distanceKm} km (${proximityTier} proximity) from the reported event epicenter (${event.location.name}).`,
        weight: proximityTier === "immediate" || proximityTier === "near" ? "supporting" : "neutral",
      });
    }

    // --- 3. Hydrological Safety Guard Check ---
    const isWaterHazard =
      event.category === "flood" ||
      event.category === "flash_flood" ||
      event.category === "heavy_rain" ||
      event.category === "landslide";


    // --- 4. Weather Correlation (Supporting Evidence) ---
    if (weather) {
      const weatherCorr = correlateWeatherWithHazard(event.category, weather);
      evidence.push(weatherCorr.evidence);
      if (weatherCorr.isAligned) {
        reasons.push(weatherCorr.reason);
      }
    }

    // --- 5. Determine Relevance, Impact Level, Confidence, and Reasons ---
    let relevanceStatus: RelevanceStatus = "unknown";
    let impactLevel: ImpactLevel = "none";
    let confidence = 0.5;

    // Case A: Explicit City Match
    if (isCityMatch) {
      relevanceStatus = "confirmed";
      impactLevel = severityToImpactLevel(event.severity);
      confidence = 0.95;
      evidence.push({
        type: "explicit_city_match",
        description: `Target city (${targetCity}) is explicitly identified in the event records.`,
        weight: "supporting",
      });
      reasons.push(`Direct impact: ${targetCity} is explicitly named in the verified event bulletins.`);
    }
    // Case B: Explicit Region Match (e.g. Patna inside affected Bihar)
    else if (isRegionMatch) {
      const hasTier1 = event.sources.some((s) => s.tier === 1);
      relevanceStatus = hasTier1 ? "confirmed" : "likely";
      impactLevel = severityToImpactLevel(event.severity);
      confidence = hasTier1 ? 0.88 : 0.78;
      evidence.push({
        type: "explicit_region_match",
        description: `Target region (${targetRegion}) is explicitly listed in the affected regions of this event.`,
        weight: "supporting",
      });
      reasons.push(`Regional impact: ${targetRegion} is officially listed as an affected area.`);
    }
    // Case C: Hydrological / Transboundary safety check without explicit regional evidence
    else if (
      isWaterHazard &&
      (isCountryMatch || this.areGeographicNeighbors(event.location.country, targetCountry))
    ) {
      evidence.push({
        type: "downstream_unestablished",
        description: "Downstream hydrological impact across borders/states is not established without explicit official hydrological advisories or river gauge data.",
        weight: "neutral",
      });

      if (distanceKm !== undefined && distanceKm > 350) {
        relevanceStatus = "unlikely";
        impactLevel = "none";
        confidence = 0.75;
        reasons.push(`Target location (${targetCity || targetLocation.name}) is far (${distanceKm} km) from the event center without established downstream warnings.`);
      } else {
        relevanceStatus = "monitoring";
        impactLevel = "low";
        confidence = 0.65;
        reasons.push(`Monitoring: Event is in ${event.location.name} (${event.location.country}). Direct downstream impact on ${targetLocation.name} is not established by source reports.`);
      }
    }
    // Case D: Same Country Match but different region
    else if (isCountryMatch) {
      if (distanceKm !== undefined && distanceKm <= 100) {
        relevanceStatus = "possible";
        impactLevel = event.severity === "extreme" ? "moderate" : "low";
        confidence = 0.65;
        reasons.push(`Target location is within ${distanceKm} km of ${event.location.name} in ${targetCountry}, but not explicitly named in affected areas.`);
      } else {
        relevanceStatus = "unlikely";
        impactLevel = "none";
        confidence = 0.70;
        evidence.push({
          type: "explicit_country_match",
          description: `Target location is in the same country (${targetCountry}), but outside the specific affected regions.`,
          weight: "neutral",
        });
        reasons.push(`Target location is in ${targetCountry}, but outside the specific areas affected by this event.`);
      }
    }
    // Case E: Distinct Country / No Evidence
    else {
      relevanceStatus = "unlikely";
      impactLevel = "none";
      confidence = 0.85;
      evidence.push({
        type: "no_evidence_available",
        description: `Target location (${targetLocation.name}, ${targetCountry}) is completely outside the geographic domain of this event (${event.location.country}).`,
        weight: "refuting",
      });
      reasons.push(`No geographic or meteorological relationship between ${targetLocation.name} and this event.`);
    }

    // Include explicit authority citation if available
    const tier1Source = event.sources.find((s) => s.tier === 1);
    if (tier1Source) {
      evidence.push({
        type: "official_authority_citation",
        description: `Official authority ${tier1Source.name} provides verified source observations for this event.`,
        weight: "supporting",
        source: tier1Source.name,
      });
    }

    // Formulate explicit distinction fields
    const eventFact = `Event active in ${event.location.name}, ${event.location.country} (${event.hazard || event.category}, severity: ${event.severity}).`;

    let geographicRelevance = `Target location ${targetLocation.name} is in ${targetCountry}.`;
    if (distanceKm !== undefined) {
      geographicRelevance = `Target location is approximately ${distanceKm} km from event epicenter (${event.location.name}).`;
    }

    let actualHazardImpact = "No local meteorological hazard impact established.";
    if (isCityMatch) {
      actualHazardImpact = `Direct hazard impact confirmed in ${targetCity}.`;
    } else if (isRegionMatch) {
      actualHazardImpact = `Regional hazard impact confirmed in ${targetRegion}.`;
    } else if (
      isWaterHazard &&
      (isCountryMatch || this.areGeographicNeighbors(event.location.country, targetCountry))
    ) {
      actualHazardImpact =
        "Downstream hydrological impact across borders/states is not established without official hydrological bulletins.";
    }

    let advisory = "No direct action required.";
    if (impactLevel === "extreme" || impactLevel === "high") {
      advisory =
        "High hazard risk. Follow official emergency agency instructions and suspend exposed activities.";
    } else if (relevanceStatus === "monitoring") {
      advisory = "Monitor local weather bulletins; no immediate local action required.";
    }

    const indiaImpact = this.assessIndiaImpact(event);

    const id = `imp_${generateDeterministicHash(
      `${event.id}_${targetLocation.name}_${targetLocation.country}_${assessedAt.slice(0, 10)}`
    )}`;

    return {
      id,
      eventId: event.id,
      targetLocation,
      hazard: event.hazard || event.category,
      impactLevel,
      relevanceStatus,
      confidence: Number(confidence.toFixed(2)),
      reasons,
      evidence,
      assessedAt,
      methodology: METHODOLOGY_VERSION,
      provenance: [
        ...(event.provenance || []),
        ...(weather?.provenance || []),
      ],
      eventFact,
      geographicRelevance,
      actualHazardImpact,
      advisory,
      indiaImpact,
    };
  }

  /**
   * Deterministically evaluate the specific relevance and impact of a WeatherEvent on India.
   * Levels: DIRECT | REGIONAL | POSSIBLE | LOW | NONE | INSUFFICIENT_EVIDENCE
   */
  assessIndiaImpact(event: WeatherEvent): IndiaImpactAssessment {
    const isDirectIndia = this.checkCountryMatch(event, "India");

    if (isDirectIndia) {
      return {
        level: "DIRECT",
        relevanceStatus: "confirmed",
        confidence: 0.95,
        summary: `Direct verified event impact in India (${event.location.name}).`,
        reasons: ["Event location or affected regions explicitly identify territory in India."],
        isTransboundary: false,
      };
    }

    const eventCountry = event.location.country.toLowerCase();

    // Check if event is in a neighboring country to India
    const neighboringCountries = ["nepal", "bangladesh", "pakistan", "bhutan", "myanmar", "china"];
    if (neighboringCountries.includes(eventCountry)) {
      const isWaterHazard =
        event.category === "flood" ||
        event.category === "flash_flood" ||
        event.category === "heavy_rain" ||
        event.category === "landslide";

      if (isWaterHazard) {
        return {
          level: "REGIONAL",
          relevanceStatus: "monitoring",
          confidence: 0.70,
          summary: `The event is in ${event.location.name} (${event.location.country}). India relevance is regional/possible based on geographic proximity and available evidence. Direct downstream impact on Indian locations is not established without official cross-border hydrological advisories.`,
          reasons: [
            `Event epicenter is located in neighboring country ${event.location.country}.`,
            "Downstream flood propagation across international borders requires explicit CWC/IMD bulletin evidence.",
          ],
          isTransboundary: true,
        };
      }

      if (
        event.category === "cyclone" ||
        event.category === "tropical_storm" ||
        event.category === "severe_storm"
      ) {
        return {
          level: "POSSIBLE",
          relevanceStatus: "monitoring",
          confidence: 0.65,
          summary: `Severe storm system active in neighboring ${event.location.country}. Precautionary border tracking in effect.`,
          reasons: [`Severe storm activity active in border-adjacent ${event.location.country}.`],
          isTransboundary: true,
        };
      }

      if (event.category === "earthquake") {
        return {
          level: "POSSIBLE",
          relevanceStatus: "monitoring",
          confidence: 0.75,
          summary: `Earthquake reported in neighboring ${event.location.country}. Tremors may be felt in northern and border Indian states.`,
          reasons: [`Seismic shockwave propagation in adjacent geographic zone (${event.location.country}).`],
          isTransboundary: true,
        };
      }

      return {
        level: "REGIONAL",
        relevanceStatus: "monitoring",
        confidence: 0.60,
        summary: `Event active in neighboring ${event.location.country} with potential regional proximity.`,
        reasons: [`Geographic proximity to Indian border from ${event.location.country}.`],
        isTransboundary: true,
      };
    }

    if (!eventCountry || eventCountry === "global" || eventCountry === "unknown") {
      return {
        level: "INSUFFICIENT_EVIDENCE",
        relevanceStatus: "unknown",
        confidence: 0.30,
        summary: "Insufficient geographic evidence to establish Indian relevance.",
        reasons: ["No verified coordinates or country details provided in event records."],
        isTransboundary: false,
      };
    }

    // Distant country
    return {
      level: "NONE",
      relevanceStatus: "unlikely",
      confidence: 0.90,
      summary: `Event is located in ${event.location.country} with no geographic relevance to India.`,
      reasons: [`Event domain (${event.location.country}) is geographically distinct from India.`],
      isTransboundary: false,
    };
  }

  private checkCityMatch(event: WeatherEvent, targetCity?: string): boolean {
    if (!targetCity || targetCity === "Global") return false;
    const cLower = targetCity.toLowerCase();

    if (event.location.city?.toLowerCase() === cLower) return true;
    if (event.location.name.toLowerCase() === cLower) return true;

    for (const loc of event.locations) {
      if (loc.city?.toLowerCase() === cLower || loc.name.toLowerCase() === cLower) {
        return true;
      }
    }

    const text = `${event.title} ${event.description}`.toLowerCase();
    const cityRegex = new RegExp(`\\b${cLower}\\b`, "i");
    return cityRegex.test(text);
  }

  private checkRegionMatch(event: WeatherEvent, targetRegion?: string): boolean {
    if (!targetRegion) return false;
    const rLower = targetRegion.toLowerCase();

    if (event.location.region?.toLowerCase() === rLower) return true;

    for (const loc of event.locations) {
      if (loc.region?.toLowerCase() === rLower) return true;
    }

    for (const reg of event.affectedRegions) {
      if (reg.name.toLowerCase() === rLower) return true;
    }

    const text = `${event.title} ${event.description}`.toLowerCase();
    const regRegex = new RegExp(`\\b${rLower}\\b`, "i");
    return regRegex.test(text);
  }

  private isRegionInEvent(event: WeatherEvent, targetRegion: string): boolean {
    return this.checkRegionMatch(event, targetRegion);
  }

  private checkCountryMatch(event: WeatherEvent, targetCountry?: string): boolean {
    if (!targetCountry || targetCountry === "Global") return false;
    const cLower = targetCountry.toLowerCase();

    if (event.location.country.toLowerCase() === cLower) return true;

    for (const loc of event.locations) {
      if (loc.country.toLowerCase() === cLower) return true;
    }

    for (const reg of event.affectedRegions) {
      if (reg.country.toLowerCase() === cLower) return true;
    }

    return false;
  }

  /**
   * Checks if two countries share a geographic border.
   * This is a conservative proximity hint only — it does NOT imply
   * weather/disaster impact or causal downstream effects.
   */
  private areGeographicNeighbors(countryA?: string, countryB?: string): boolean {
    if (!countryA || !countryB || countryA === "Global" || countryB === "Global") return false;
    const a = countryA.toLowerCase();
    const b = countryB.toLowerCase();

    // Same country is not "neighboring" — handled by separate country-match logic
    if (a === b) return false;

    const neighbors: Record<string, string[]> = {
      nepal: ["india", "china"],
      india: ["nepal", "bangladesh", "pakistan", "bhutan", "myanmar", "china"],
      bangladesh: ["india", "myanmar"],
      pakistan: ["india", "afghanistan", "china", "iran"],
    };

    return neighbors[a]?.includes(b) || neighbors[b]?.includes(a) || false;
  }
}

// Global service singleton
export const globalImpactEngine = new ImpactEngine();
