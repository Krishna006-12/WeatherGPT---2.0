/**
 * Deterministic geographic distance calculations.
 * Uses the Haversine formula to compute great-circle distance between coordinates.
 *
 * CRITICAL SAFETY NOTE:
 * Geographic proximity indicates distance only. It MUST NOT by itself establish
 * causality, transboundary river flows, or downstream flood propagation.
 */

import type { Coordinates } from "@/types/common";

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two geographic coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  coordA: Coordinates,
  coordB: Coordinates
): number {
  const lat1Rad = (coordA.latitude * Math.PI) / 180;
  const lat2Rad = (coordB.latitude * Math.PI) / 180;
  const deltaLat = ((coordB.latitude - coordA.latitude) * Math.PI) / 180;
  const deltaLon = ((coordB.longitude - coordA.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
}

export type ProximityTier = "immediate" | "near" | "moderate" | "distant";

/**
 * Categorize distance into an explainable proximity tier.
 */
export function getProximityTier(distanceKm: number): ProximityTier {
  if (distanceKm <= 50) return "immediate";
  if (distanceKm <= 150) return "near";
  if (distanceKm <= 500) return "moderate";
  return "distant";
}
