/**
 * Deterministic, evidence-based Impact Engine.
 * Answers: "How relevant is this event to this location?"
 *
 * Implements strict hydrological safety, explicit evidence tracking,
 * and deterministic confidence scoring without relying on LLMs.
 */

import type { WeatherEvent, EventLocation } from "@/types/events";
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

    const isCrossBorderOrCrossRegion =
      !isRegionMatch &&
      (!isCountryMatch || (targetRegion && !this.isRegionInEvent(event, targetRegion)));

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
      impactLevel = event.severity;
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
      impactLevel = event.severity;
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
      (isCountryMatch || this.areTransboundaryNeighbors(event.location.country, targetCountry))
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
        ...event.provenance,
        ...(weather?.provenance || []),
      ],
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

  private areTransboundaryNeighbors(countryA?: string, countryB?: string): boolean {
    if (!countryA || !countryB || countryA === "Global" || countryB === "Global") return false;
    const a = countryA.toLowerCase();
    const b = countryB.toLowerCase();
    if (a === b) return true;

    const neighbors: Record<string, string[]> = {
      nepal: ["india", "bangladesh"],
      india: ["nepal", "bangladesh", "pakistan", "bhutan"],
      bangladesh: ["india", "nepal", "myanmar"],
      pakistan: ["india", "afghanistan"],
    };

    return neighbors[a]?.includes(b) || neighbors[b]?.includes(a) || false;
  }
}

// Global service singleton
export const globalImpactEngine = new ImpactEngine();
