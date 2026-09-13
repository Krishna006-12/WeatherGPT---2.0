/**
 * Deterministic Flood Risk Evaluator.
 *
 * Strictly adheres to rule:
 * - NEVER infer flood risk from rainfall alone.
 * - Uses existing Live Intelligence / verified event records from EventRepository.
 * - If an active flood event exists in geographic proximity -> High/Extreme or Moderate risk.
 * - If no event exists -> "no_evidence", explicitly documenting that this means absence of
 *   recorded flood bulletins rather than claiming "flooding is impossible".
 */

import type { LocationInfo } from "@/types/weather";
import type { WeatherEvent } from "@/types/events";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";
import { calculateHaversineDistanceKm } from "@/lib/geo-distance";
import { FLOOD_DISTANCE_THRESHOLDS } from "../risk-rules";

export async function evaluateFloodRisk(
  location: LocationInfo,
  eventRepository?: EventRepository,
  timeWindow: string = "Current Live Intelligence"
): Promise<RiskAssessment> {
  if (!eventRepository) {
    return {
      type: "flood",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: "Live Intelligence event repository unavailable to correlate flood events.",
      recommendation: "Regional flood intelligence currently unavailable.",
    };
  }

  try {
    const activeEvents = await eventRepository.findAll({ status: "active" });
    const floodEvents = activeEvents.filter(
      (e) => e.category === "flood" || e.category === "flash_flood" || e.hazard === "flood"
    );

    if (floodEvents.length === 0) {
      return {
        type: "flood",
        severity: "no_evidence",
        confidence: "high",
        status: "no_evidence",
        timeWindow,
        evidence: [],
        reason:
          "No verified flood events or official disaster bulletins on record for this location in Live Intelligence records. (Absence of bulletin does not preclude localized flash ponding in unmonitored street drains).",
        recommendation:
          "No active flood bulletins on record for this location. Observe standard local drainage during heavy downpours.",
      };
    }

    // Find geographically closest active flood event
    let closestEvent: WeatherEvent | undefined;
    let minDistanceKm = Infinity;

    for (const ev of floodEvents) {
      // 1. Check coordinates distance
      if (ev.location.coordinates && location.coordinates) {
        const dist = calculateHaversineDistanceKm(location.coordinates, ev.location.coordinates);
        if (dist < minDistanceKm) {
          minDistanceKm = dist;
          closestEvent = ev;
        }
      }

      // 2. Check multiple locations on event
      if (ev.locations && ev.locations.length > 0 && location.coordinates) {
        for (const loc of ev.locations) {
          if (loc.coordinates) {
            const dist = calculateHaversineDistanceKm(location.coordinates, loc.coordinates);
            if (dist < minDistanceKm) {
              minDistanceKm = dist;
              closestEvent = ev;
            }
          }
        }
      }

      // 3. Check direct region/country string match if coordinates didn't match
      if (
        location.region &&
        (ev.location.region?.toLowerCase() === location.region.toLowerCase() ||
          ev.affectedRegions?.some((r) => r.name.toLowerCase() === location.region.toLowerCase()))
      ) {
        if (minDistanceKm > 40) {
          minDistanceKm = 30; // Treat as within regional direct proximity
          closestEvent = ev;
        }
      }
    }

    // If closest event is beyond regional radius (150km), no relevant flood evidence
    if (!closestEvent || minDistanceKm > FLOOD_DISTANCE_THRESHOLDS.REGIONAL_PROXIMITY_KM) {
      return {
        type: "flood",
        severity: "no_evidence",
        confidence: "high",
        status: "no_evidence",
        timeWindow,
        evidence: [],
        reason:
          "No active flood events found within regional proximity (150 km) in Live Intelligence records.",
        recommendation:
          "No active flood bulletins on record within regional vicinity.",
      };
    }

    const primarySource = closestEvent.sources[0]?.name || "Verified Live Intelligence";
    const timestamp = closestEvent.lastUpdatedAt;
    const evidence: RiskEvidenceItem[] = [
      {
        metric: "active_flood_event",
        value: closestEvent.title,
        source: primarySource,
        timestamp,
      },
      {
        metric: "event_proximity",
        value: Number(minDistanceKm.toFixed(1)),
        unit: "km",
        source: primarySource,
        timestamp,
      },
      {
        metric: "event_severity",
        value: closestEvent.severity,
        source: primarySource,
        timestamp,
      },
    ];

    if (closestEvent.freshness?.label) {
      evidence.push({
        metric: "event_freshness",
        value: closestEvent.freshness.label,
        source: primarySource,
        timestamp,
      });
    }

    let severity: RiskSeverity = "moderate";
    let recommendation =
      "Upstream or regional flood monitoring active within 150 km. Monitor official bulletins and local water levels.";
    let confidence: RiskConfidence = "moderate";

    if (minDistanceKm <= FLOOD_DISTANCE_THRESHOLDS.DIRECT_PROXIMITY_KM) {
      confidence = "high";
      if (
        closestEvent.severity === "extreme" ||
        closestEvent.severity === "critical" ||
        closestEvent.severity === "severe"
      ) {
        severity = "extreme";
        recommendation =
          "Active severe flood emergency confirmed in immediate proximity. Comply with emergency evacuation orders, avoid all submerged roadways and river crossings.";
      } else {
        severity = "high";
        recommendation =
          "Active flood event reported in immediate vicinity. Avoid low-lying corridors, underground transit, and swollen waterways.";
      }
    }

    return {
      type: "flood",
      severity,
      confidence,
      status: "available",
      timeWindow,
      evidence,
      reason: `Active flood event "${closestEvent.title}" verified at ${minDistanceKm.toFixed(1)} km distance with ${closestEvent.severity} severity.`,
      recommendation,
    };
  } catch (error) {
    return {
      type: "flood",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: error instanceof Error ? error.message : "Error correlating live flood intelligence.",
      recommendation: "Flood risk correlation encountered an unexpected error.",
    };
  }
}
