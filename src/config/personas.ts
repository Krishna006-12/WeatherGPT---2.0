/**
 * Persona Profiles Configuration — WeatherGPT 2.0.
 *
 * Provides declarative configurations and templates for pilot personas:
 * 1. "general_public" — Everyday commuting, clothing, hydration, and direct safety.
 * 2. "farmer" — Agricultural decision intelligence, crop stages, spraying windows, and soil moisture.
 *
 * RULE:
 * Persona logic lives strictly as configuration and templates, never hardcoded branching.
 */

import type { Alert } from "@/types/alert";
import type { PersonaId, PersonaProfile, PersonaAdvisoryContext } from "@/types/persona";

export const GENERAL_PUBLIC_PERSONA: PersonaProfile = {
  id: "general_public",
  name: "General Public",
  description: "Everyday decisions: commuting, daily clothing, hydration, and immediate weather awareness.",
  detailLevel: "concise",
  units: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
  },
  prioritizedAlertCategories: ["heat", "cyclone", "thunderstorm", "air_quality", "heavy_rain"],
  advisoryFocus: [
    "commute and travel ease",
    "outdoor comfort and hydration",
    "umbrella and clothing suggestions",
    "direct physical safety and storm shelter",
  ],
  instructionAddendum: `// ============================================================
// ACTIVE PERSONA: GENERAL PUBLIC (Daily Citizen)
// ============================================================
- Audience: Everyday citizens, commuters, and families.
- Tone: Accessible, direct, friendly, and free of dense meteorological jargon.
- Priorities:
  1. Immediate practical guidance: what to wear, commute disruption risks, umbrella needs.
  2. Clear heat/cold advisories (hydration, shade, warmth).
  3. Direct safety actions during severe storms without panic.
- Style: Keep explanations concise, scannable, and grounded in real-world activities.`,
  formatAdvisory(ctx: PersonaAdvisoryContext): string {
    const hasHeat = ctx.alerts?.some((a) => a.category === "heat");
    const hasRain = ctx.alerts?.some((a) => a.category === "heavy_rain") || (ctx.rainfallMm ?? 0) > 5;
    const hasStorm = ctx.alerts?.some((a) => a.category === "thunderstorm" || a.category === "cyclone");

    if (hasStorm) {
      return "Safety Advisory: Active severe storm warnings in your area. Avoid unnecessary outdoor travel and stay indoors.";
    }
    if (hasHeat) {
      return "Health Advisory: Elevated heat conditions. Stay well hydrated and limit prolonged direct sun exposure during peak afternoon hours.";
    }
    if (hasRain) {
      return "Commute Advisory: Wet weather expected. Keep an umbrella on hand and anticipate slower travel speeds.";
    }
    return `Daily Advisory: Pleasant conditions for outdoor activities and commuting in ${ctx.locationName}.`;
  },
};

export const FARMER_PERSONA: PersonaProfile = {
  id: "farmer",
  name: "Farmer / Agricultural Producer",
  description: "Agronomic decision support: crop safety, sowing, irrigation, pesticide spraying, and harvest protection.",
  detailLevel: "technical",
  units: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
  },
  prioritizedAlertCategories: ["heavy_rain", "flood", "heat", "cold_wave", "cyclone", "wind"],
  advisoryFocus: [
    "soil moisture and waterlogging management",
    "spraying efficacy (wind drift & rain wash-off risks)",
    "irrigation scheduling and conservation",
    "crop thermal stress and frost defense",
    "harvest protection and post-harvest drying",
  ],
  instructionAddendum: `// ============================================================
// ACTIVE PERSONA: AGRICULTURAL PRODUCER (Farmer)
// ============================================================
- Audience: Farmers, agronomists, and agricultural planners.
- Tone: Professional, practical, technical, and focused on agronomic outcomes.
- Priorities:
  1. Soil and field workability: evaluate waterlogging, field compaction, and drying windows.
  2. Chemical application windows: highlight pesticide/fertilizer wash-off risk (rainfall) and spray drift risk (wind speed > 15 km/h).
  3. Crop thermal thresholds: identify heat stress (flowering stage) and frost risk (cold wave).
  4. Specific crops: if a crop is mentioned or detected, tailor guidance to its specific growth phase.
- Style: Deliver actionable agricultural intelligence with specific meteorological metrics.`,
  formatAdvisory(ctx: PersonaAdvisoryContext): string {
    const cropLabel = ctx.crop ? ` for ${ctx.crop}` : "";
    const rain = ctx.rainfallMm ?? 0;
    const wind = ctx.windSpeedKmh ?? 0;

    const hasFlood = ctx.alerts?.some((a) => a.category === "flood" || a.category === "heavy_rain");
    const hasHeat = ctx.alerts?.some((a) => a.category === "heat");
    const hasCold = ctx.alerts?.some((a) => a.category === "cold_wave");

    if (hasFlood || rain >= 30) {
      return `Agronomic Advisory${cropLabel}: Heavy precipitation risk (${rain} mm). Suspend irrigation immediately and clear drainage channels to prevent root-zone waterlogging. Delay chemical spraying.`;
    }
    if (hasCold || ctx.temperature <= 4) {
      return `Agronomic Advisory${cropLabel}: Severe frost/cold stress detected (${ctx.temperature}°C). Apply light evening irrigation or mulch to protect sensitive crop root systems.`;
    }
    if (hasHeat || ctx.temperature >= 38) {
      return `Agronomic Advisory${cropLabel}: High heat stress (${ctx.temperature}°C). Schedule irrigation during cooler early-morning hours to maintain plant transpiration and avoid midday moisture loss.`;
    }
    if (wind >= 20) {
      return `Agronomic Advisory${cropLabel}: Wind speeds of ${wind} km/h present chemical drift risks. Postpone pesticide/foliar spraying until calmer conditions prevail.`;
    }
    return `Agronomic Advisory${cropLabel}: Favorable conditions for routine field operations, cultivation, and scheduled farm activities in ${ctx.locationName}.`;
  },
};

export const PERSONA_REGISTRY: Record<PersonaId, PersonaProfile> = {
  general_public: GENERAL_PUBLIC_PERSONA,
  farmer: FARMER_PERSONA,
};

/**
 * Retrieve a persona profile by ID, safely defaulting to "general_public".
 */
export function getPersonaProfile(id?: string | null): PersonaProfile {
  if (id === "farmer") {
    return FARMER_PERSONA;
  }
  return GENERAL_PUBLIC_PERSONA;
}

/**
 * Prioritizes a list of alerts based on persona configuration.
 * Categories prioritized by the persona are floated to the top while preserving severity order.
 */
export function prioritizeAlertsForPersona(
  alerts: Alert[],
  personaIdOrProfile?: PersonaId | PersonaProfile
): Alert[] {
  if (!alerts || alerts.length === 0) return [];

  const profile =
    typeof personaIdOrProfile === "string"
      ? getPersonaProfile(personaIdOrProfile)
      : personaIdOrProfile || GENERAL_PUBLIC_PERSONA;

  const severityWeight: Record<Alert["severity"], number> = {
    extreme: 100,
    severe: 50,
    moderate: 20,
    minor: 10,
  };

  return [...alerts].sort((a, b) => {
    // 1. Extreme alerts always lead regardless of persona
    if (a.severity === "extreme" && b.severity !== "extreme") return -1;
    if (b.severity === "extreme" && a.severity !== "extreme") return 1;

    // 2. Persona category priority
    const aIsPrioritized = profile.prioritizedAlertCategories.includes(a.category);
    const bIsPrioritized = profile.prioritizedAlertCategories.includes(b.category);

    const aScore = severityWeight[a.severity] + (aIsPrioritized ? 30 : 0);
    const bScore = severityWeight[b.severity] + (bIsPrioritized ? 30 : 0);

    return bScore - aScore;
  });
}
