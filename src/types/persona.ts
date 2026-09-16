/**
 * Persona Profile Type Definitions — WeatherGPT 2.0.
 *
 * Implements Phase 5 role-based customization:
 * Shapes units, detail levels, alert prioritization, and domain advisories
 * via pure configuration/templates without scattered branching.
 */

import type { AlertCategory, Alert } from "./alert";

export type PersonaId = "general_public" | "farmer";

export interface PersonaUnits {
  temperature: "celsius" | "fahrenheit";
  windSpeed: "kmh" | "beaufort" | "mph";
  precipitation: "mm" | "inches";
}

export interface PersonaAdvisoryContext {
  locationName: string;
  temperature: number;
  condition: string;
  alerts?: Alert[];
  crop?: string;
  rainfallMm?: number;
  windSpeedKmh?: number;
}

export interface PersonaProfile {
  id: PersonaId;
  name: string;
  description: string;
  detailLevel: "concise" | "technical";
  units: PersonaUnits;
  prioritizedAlertCategories: AlertCategory[];
  advisoryFocus: string[];
  instructionAddendum: string;
  formatAdvisory(context: PersonaAdvisoryContext): string;
}
