/**
 * Type definitions for WeatherGPT 2.0 Evaluation Metrics & Telemetry.
 *
 * Designed for privacy-by-design evaluation report deliverables:
 * - Query-to-response latency tracking
 * - Task completion (direct answer vs degraded fallback vs error)
 * - Persona and language usage distribution
 * - Forecast shown vs. later-observed conditions accuracy tracking
 * - Strict PII-free contracts
 * - Explicit seed vs. live telemetry separation
 */

import type { ISOTimestamp } from "./common";
import type { PersonaId } from "./persona";
import type { SupportedLanguage } from "@/lib/i18n/translations";

/**
 * Telemetry source discriminant to keep seed/demo data strictly isolated from real pilot results.
 */
export type TelemetrySource = "seed" | "live";

/**
 * Task completion state indicating how the user query/session concluded.
 */
export type TaskCompletionStatus =
  | "direct_answer"
  | "degraded_fallback"
  | "provider_error"
  | "user_cancelled";

/**
 * Anonymized query latency record.
 * Strictly contains NO personal identifiers, IP addresses, or raw search queries.
 */
export interface QueryLatencyRecord {
  traceId: string;
  endpoint: string;
  latencyMs: number;
  statusCode: number;
  taskCompletion: TaskCompletionStatus;
  persona: PersonaId;
  language: SupportedLanguage;
  timestamp: ISOTimestamp;
  cacheHit: boolean;
  source: TelemetrySource;
}

/**
 * Forecast observation pair for quantitative accuracy tracking.
 * Compares numerical predictions shown to users against ground-truth later observed telemetry.
 */
export interface ForecastAccuracyRecord {
  recordId: string;
  locationName: string; // Regional/city name only, no precise GPS
  coarsenedCoordinates?: {
    latitude: number;
    longitude: number;
  };
  forecastGeneratedTime: ISOTimestamp;
  forecastTargetTime: ISOTimestamp;
  leadTimeHours: number;
  forecasted: {
    temperature: number;
    precipitationSum?: number;
    windSpeed?: number;
    condition?: string;
  };
  observed?: {
    temperature: number;
    precipitationSum?: number;
    windSpeed?: number;
    condition?: string;
  };
  tempErrorAbs?: number; // |observed - forecast|
  precipErrorAbs?: number; // |observed - forecast|
  windErrorAbs?: number;
  verifiedAt?: ISOTimestamp;
  source: TelemetrySource;
}

/**
 * Statistical summary of latency distribution.
 */
export interface LatencyDistribution {
  p50: number;
  p90: number;
  p95: number;
  avg: number;
  min: number;
  max: number;
  totalRecords: number;
}

/**
 * Summary of task completions across queries.
 */
export interface TaskCompletionBreakdown {
  directAnswer: number;
  degradedFallback: number;
  providerError: number;
  userCancelled: number;
  directAnswerRate: number; // 0 to 1
  degradedFallbackRate: number; // 0 to 1
  errorRate: number; // 0 to 1
}

/**
 * Summary of forecast accuracy metrics.
 */
export interface ForecastAccuracyMetrics {
  totalEvaluated: number;
  temperatureMae: number; // Mean Absolute Error (°C)
  windMae: number; // Mean Absolute Error (km/h)
  accuracyScore: number; // 0 to 100 benchmark score
}

/**
 * Real-time operational health report & SLA alerting during active pilots.
 */
export interface OperationalStatusReport {
  status: "healthy" | "warning" | "critical";
  p95LatencyMs: number;
  p95TargetMs: number;
  slaTargetExceeded: boolean;
  errorRate: number;
  errorRateExceeded: boolean;
  degradedModeActive: boolean;
  activeAlerts: string[];
  sourceFilter: "live_only" | "all_including_seed";
}

/**
 * Comprehensive Evaluation Summary report payload.
 * Serves the internal reporting view and powers the evaluation report deliverable.
 */
export interface EvaluationSummary {
  timeWindow: {
    start: ISOTimestamp;
    end: ISOTimestamp;
  };
  totalSessions: number;
  totalQueries: number;
  latency: LatencyDistribution;
  taskCompletion: TaskCompletionBreakdown;
  personaDistribution: Record<PersonaId, number>;
  languageDistribution: Record<string, number>;
  accuracy: ForecastAccuracyMetrics;
  operationalStatus: OperationalStatusReport;
  sourceFilter: "live_only" | "all_including_seed";
  liveRecordCount: number;
  seedRecordCount: number;
  generatedAt: ISOTimestamp;
}
