/**
 * AI layer data contracts and types.
 * Derived from docs/MASTER_SPEC.md and docs/ARCHITECTURE.md.
 */

import type { ISOTimestamp } from "./common";
import type { EventLocation, WeatherEvent } from "./events";
import type { WeatherSnapshot } from "./weather";
import type { ImpactAssessment } from "./impact";
import type { AgricultureAssessment } from "./agriculture";
import type { NewsArticle } from "./news";
import type { RiskAssessment, WeatherRiskReport } from "./risk";
import type { ModelConsensusReport } from "./nwp";
import type { ActivitySuitabilityReport } from "./activity";
import type { VoiceAssistantReport } from "./voice";
import type { SupportedLanguage } from "@/lib/i18n/translations";
import type { PersonaId } from "./persona";

/** Supported high-level user intents. */
export type IntentCategory =
  | "weather"
  | "forecast"
  | "weather_event"
  | "impact"
  | "agriculture"
  | "general"
  | "consensus"
  | "activity";

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

/** Delivery channel: interactive visual chat vs text-to-speech voice */
export type PromptChannel = "chat" | "voice";

/** Single conversation turn in multi-turn chat sessions. */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp?: ISOTimestamp;
  intent?: IntentCategory;
}

/** Structured short-term conversation context for follow-up reasoning. */
export interface ConversationContext {
  lastResolvedLocation?: EventLocation;
  lastIntent?: IntentCategory;
  lastTemporalTarget?: string;
  lastEventId?: string;
  lastEventTitle?: string;
  turns?: ConversationTurn[];
  olderTurnsSummary?: string;
}

/** Structured agricultural intelligence assessment and activity suitability result. */
export type StructuredAgricultureData = AgricultureAssessment & {
  period?: string;
  factors?: {
    precipitationProbability: number;
    rainfall: number;
    temperature: { current?: number; max: number; min: number };
    humidity: number;
    wind: { current?: number; max: number };
    thunderstormRisk: boolean;
    condition: string;
  };
  activitySuitability?: {
    irrigation: { status: string; advisory: string; reason: string };
    spraying: { status: string; advisory: string; reason: string };
    sowing: { status: string; advisory: string; reason: string };
    harvesting: { status: string; advisory: string; reason: string };
    outdoor_field_work: { status: string; advisory: string; reason: string };
  };
  recommendation?: string;
  reason?: string;
  confidence?: string;
};

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
  crop?: string;
  agriculture?: StructuredAgricultureData;
  riskReport?: WeatherRiskReport;
  modelConsensus?: ModelConsensusReport;
  activitySuitability?: ActivitySuitabilityReport;
  voice?: VoiceAssistantReport;
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
    crop?: string;
    agriculture?: StructuredAgricultureData;
    riskReport?: WeatherRiskReport;
    modelConsensus?: ModelConsensusReport;
    activitySuitability?: ActivitySuitabilityReport;
    voice?: VoiceAssistantReport;
  };
}

/** Structured context passed to the AI prompt builder. */
export interface GroundedContext {
  userQuery: string;
  intent: IntentCategory;
  channel?: PromptChannel;
  recentTurns?: ConversationTurn[];
  olderTurnsSummary?: string;
  targetLocation?: EventLocation;
  weather?: WeatherSnapshot;
  events?: WeatherEvent[];
  articles?: NewsArticle[];
  impactAssessment?: ImpactAssessment;
  agricultureAssessment?: AgricultureAssessment;
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
    assessments?: RiskAssessment[];
  };
  modelConsensus?: ModelConsensusReport;
  activitySuitability?: ActivitySuitabilityReport;
  isVoiceQuery?: boolean;
  language?: SupportedLanguage;
  persona?: PersonaId;
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
  channel?: PromptChannel;
  language?: SupportedLanguage;
  persona?: PersonaId;
}
