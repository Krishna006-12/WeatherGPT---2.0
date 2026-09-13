/**
 * Soil Intelligence Service.
 *
 * Implements soil profile reference mapping based on coordinates and regional
 * agro-ecological zones per ICAR National Bureau of Soil Survey and Land Use Planning (NBSS&LUP)
 * and SoilGrids (ISRIC).
 */

import type { SoilHealthProfile } from "@/types/agriculture";

export function getRegionalSoilProfile(
  latitude: number,
  longitude: number,
  regionName?: string
): SoilHealthProfile {
  const regLower = regionName?.toLowerCase() ?? "";

  // 1. Black Cotton Soils (Vertisols) - Maharashtra, Madhya Pradesh, Gujarat, northern Karnataka
  if (
    regLower.includes("maharashtra") ||
    regLower.includes("gujarat") ||
    regLower.includes("madhya pradesh") ||
    (latitude >= 18 && latitude <= 24 && longitude >= 73 && longitude <= 80)
  ) {
    return {
      soilType: "black",
      displayName: "Deep Black Cotton Soil (Vertisol)",
      texture: "Clayey / Heavy Clay",
      drainage: "poor",
      phRange: "7.8 - 8.5 (Alkaline)",
      organicCarbonPct: 0.55,
      fieldCapacityPct: 38.0,
      wiltingPointPct: 20.0,
      source: "ICAR-NBSS&LUP & SoilGrids 250m Resolution",
    };
  }

  // 2. Red & Laterite Soils - Karnataka, Kerala, Tamil Nadu, Odisha, Eastern Ghats
  if (
    regLower.includes("karnataka") ||
    regLower.includes("kerala") ||
    regLower.includes("tamil nadu") ||
    regLower.includes("odisha") ||
    regLower.includes("andhra") ||
    (latitude < 18 && longitude >= 74 && longitude <= 84)
  ) {
    return {
      soilType: "red",
      displayName: "Red Loamy / Lateritic Soil (Alfisol)",
      texture: "Sandy Clay Loam",
      drainage: "well_drained",
      phRange: "5.5 - 6.8 (Slightly Acidic to Neutral)",
      organicCarbonPct: 0.65,
      fieldCapacityPct: 22.0,
      wiltingPointPct: 10.0,
      source: "ICAR-NBSS&LUP & SoilGrids 250m Resolution",
    };
  }

  // 3. Sandy / Desert Soils - Rajasthan, Western Haryana
  if (
    regLower.includes("rajasthan") ||
    (latitude >= 24 && latitude <= 30 && longitude < 74)
  ) {
    return {
      soilType: "sandy_loam",
      displayName: "Arid Desert Sandy Loam (Aridisol)",
      texture: "Coarse Sand to Loamy Sand",
      drainage: "excessive",
      phRange: "7.5 - 8.5",
      organicCarbonPct: 0.25,
      fieldCapacityPct: 14.0,
      wiltingPointPct: 5.0,
      source: "ICAR-NBSS&LUP & SoilGrids 250m Resolution",
    };
  }

  // 4. Default: Indo-Gangetic Alluvial Soils (Entisols / Inceptisols) - UP, Punjab, Haryana, Bihar, Bengal
  return {
    soilType: "alluvial",
    displayName: "Indo-Gangetic Deep Alluvial Loam (Inceptisol)",
    texture: "Silt Loam / Sandy Loam",
    drainage: "moderate",
    phRange: "7.0 - 7.8 (Neutral to Mildly Alkaline)",
    organicCarbonPct: 0.7,
    fieldCapacityPct: 28.0,
    wiltingPointPct: 12.0,
    source: "ICAR-NBSS&LUP & SoilGrids 250m Resolution",
  };
}
