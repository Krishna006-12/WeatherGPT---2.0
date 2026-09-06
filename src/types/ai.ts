/**
 * AI layer data contracts and types.
 * Derived from docs/MASTER_SPEC.md and docs/ARCHITECTURE.md.
 */

import type { ISOTimestamp } from "./common";
import type { EventLocation, WeatherEvent } from "./events";
import type { WeatherSnapshot } from "./weather";
import type { ImpactAssessment } from "./impact";
import type { NewsArticle } from "./news";

/** Supported high-level user intents. */
export type IntentCategory =
  | "weather"
  | "forecast"
  | "weather_event"
  | "impact"
  | "general";

/** Grounding verification status of an AI answer. */
export type GroundingStatus =
  | "grounded"
  | "partially_grounded"
  | "general_knowledge"
  | "insufficient_evidence";

/** Machine-readable citation tracking back to verified source facts. */
export interface AICitation {
  title: string;
  source: string;
  url?: string;
  publishedAt?: ISOTimestamp;
}

/** Structured short-term conversation context for follow-up reasoning. */
export interface ConversationContext {
  lastResolvedLocation?: EventLocation;
  lastIntent?: IntentCategory;
  lastTemporalTarget?: string;
  lastEventId?: string;
  lastEventTitle?: string;
}

/**
 * Validated AI response contract.
 * Every response returned to clients must adhere to this structure.
 */
export interface AIResponse {
  id: string;
  answer: string;
  intent: IntentCategory;
  groundingStatus: GroundingStatus;
  citations: AICitation[];
  generatedAt: ISOTimestamp;
  model?: string;
  uncertainty?: string;
  metadata?: {
    locationName?: string;
    selectedLocationName?: string;
    queryLocationName?: string;
    temporalContext?: string;
    confidence?: number;
    relevanceStatus?: string;
    impactLevel?: string;
    isFallback?: boolean;
    fallbackReason?: string;
    conversationContext?: ConversationContext;
  };
}

/** Structured context passed to the AI prompt builder. */
export interface GroundedContext {
  userQuery: string;
  intent: IntentCategory;
  targetLocation?: EventLocation;
  weather?: WeatherSnapshot;
  events?: WeatherEvent[];
  articles?: NewsArticle[];
  impactAssessment?: ImpactAssessment;
  temporalResolution?: {
    target: string;
    label: string;
    targetDate: string;
  };
  weatherRisk?: {
    riskLevel: string;
    confidence: string;
    primaryHazard?: string;
    recommendation: string;
    advisory: string;
  };
  untrustedSourceDelimiters: string;
  builtAt: ISOTimestamp;
}

/** Input request payload for POST /api/chat. */
export interface ChatRequest {
  message: string;
  location?: {
    name?: string;
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
  };
  context?: ConversationContext;
  sessionId?: string;
}
