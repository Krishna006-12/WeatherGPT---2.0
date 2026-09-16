/**
 * Decision Support Type Definitions — WeatherGPT 2.0.
 *
 * Contracts for role-specific, evidence-based decision intelligence.
 * All recommendation items must be 100% transparent and traceable to source data.
 */

import type { PersonaId } from "./persona";

export type DecisionPriority = "urgent" | "high" | "moderate" | "routine";

export type DecisionItemStatus = "pending" | "in_progress" | "completed";

export type DecisionCategory =
  | "safety"
  | "operations"
  | "agronomy"
  | "evacuation"
  | "public_info"
  | "infrastructure";

export interface DecisionTraceability {
  sourceType: "active_alert" | "forecast_threshold" | "risk_model" | "historical_comparison";
  metricName: string;
  observedValue: string | number;
  thresholdValue: string | number;
  sourceReference: string; // e.g., "Active Extreme Heat Alert #alt_452", "24h Rainfall Forecast"
}

export interface DecisionItem {
  id: string;
  title: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  status: DecisionItemStatus;
  actionText: string;
  recommendedTimeframe: string;
  traceability: DecisionTraceability;
}

export interface PersonaDecisionSupport {
  personaId: PersonaId;
  personaName: string;
  overallStatus: "normal" | "caution" | "action_required" | "emergency";
  summary: string;
  generatedAt: string;
  items: DecisionItem[];
}
