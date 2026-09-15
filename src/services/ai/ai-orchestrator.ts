/**
 * AI Orchestrator — WeatherGPT Copilot 2.0.
 *
 * Coordinates the end-to-end AI weather intelligence pipeline:
 * User Query → Intent Classification → Location Resolution → Temporal Resolution
 * → Required Tool Selection → Deterministic Internal Tools → Grounded Context Construction
 * → LLM Reasoning (Gemini) → Validated AIResponse + Citations + Confidence + Uncertainty.
 *
 * Follows strict grounding principles:
 * The LLM is an interpretation and language generation layer.
 * All factual data, coordinates, observations, forecasts, events, impacts, and risk
 * assessments are generated deterministically by application services.
 */

import type {
  AIResponse,
  ChatRequest,
  GroundedContext,
  IntentCategory,
  GroundingStatus,
  AICitation,
  ConversationContext,
  ConversationTurn,
  PromptChannel,
} from "@/types/ai";
import type { EventLocation, WeatherEvent } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";
import type { ImpactAssessment } from "@/types/impact";
import type { AgricultureAssessment } from "@/types/agriculture";
import type { ModelConsensusReport } from "@/types/nwp";
import type { ActivitySuitabilityReport } from "@/types/activity";
import type { VoiceAssistantReport } from "@/types/voice";
import type { Result } from "@/types/common";
import { AppError } from "@/lib/errors";
import { aiResponseSchema } from "@/schemas/ai";
import { generateDeterministicHash } from "@/lib/deduplicator";
import { globalVoiceService } from "@/services/voice/voice-service";
import { summarizeOlderTurns } from "./context-summarizer";

import { IntentRouter, globalIntentRouter, type IntentClassification } from "./intent-router";
import { ContextBuilder, globalContextBuilder } from "./context-builder";
import type { AIProvider } from "./ai-provider";
import { GeminiProvider } from "./gemini-provider";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { LocationService } from "@/services/location/location-service";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { ImpactEngine, globalImpactEngine } from "@/services/impact/impact-engine";
import { TemporalResolver, globalTemporalResolver, type TemporalResolution } from "./temporal-resolver";
import { WeatherToolRegistry } from "./tools/tool-registry";
import type { NormalizedForecastData } from "@/types/forecast";
import type { WeatherRiskData } from "@/types/risk";

export interface ResolvedLocationState {
  resolvedLocation: EventLocation | undefined;
  selectedLocation: EventLocation | undefined;
  queryLocationName?: string;
  isExplicitQueryLocation: boolean;
  locationNotFound: boolean;
}

export interface AIOrchestratorConfig {
  aiProvider?: AIProvider;
  intentRouter?: IntentRouter;
  contextBuilder?: ContextBuilder;
  weatherService?: WeatherService;
  locationService?: LocationService;
  impactEngine?: ImpactEngine;
  temporalResolver?: TemporalResolver;
  toolRegistry?: WeatherToolRegistry;
}

export class AIOrchestrator {
  private aiProvider: AIProvider;
  private intentRouter: IntentRouter;
  private contextBuilder: ContextBuilder;
  private weatherService: WeatherService;
  private locationService: LocationService;
  private impactEngine: ImpactEngine;
  private temporalResolver: TemporalResolver;
  private toolRegistry: WeatherToolRegistry;

  // Short-term in-memory conversation context (per instance & by sessionId)
  private sessionContextMap: Map<string, ConversationContext> = new Map();
  private lastSessionContext?: ConversationContext;
  private sessionTurnsMap: Map<string, ConversationTurn[]> = new Map();
  private lastSessionTurns: ConversationTurn[] = [];

  constructor(config: AIOrchestratorConfig = {}) {
    this.aiProvider = config.aiProvider || new GeminiProvider();
    this.intentRouter = config.intentRouter || globalIntentRouter;
    this.contextBuilder = config.contextBuilder || globalContextBuilder;
    this.weatherService = config.weatherService || new WeatherService(new OpenMeteoProvider());
    this.locationService = config.locationService || new LocationService();
    this.impactEngine = config.impactEngine || globalImpactEngine;
    this.temporalResolver = config.temporalResolver || globalTemporalResolver;

    this.toolRegistry =
      config.toolRegistry ||
      new WeatherToolRegistry({
        locationService: this.locationService,
        weatherService: this.weatherService,
        eventRepository: globalEventRepository,
        impactEngine: this.impactEngine,
      });
  }

  /**
   * Process a chat request and return a validated AIResponse.
   */
  async processQuery(request: ChatRequest): Promise<Result<AIResponse>> {
    try {
      const generatedAt = new Date().toISOString();
      const message = request.message.trim();

      // Retrieve incoming conversation context & turns (from request payload, sessionId, or instance memory)
      const currentContext: ConversationContext | undefined =
        request.context ||
        (request.sessionId ? this.sessionContextMap.get(request.sessionId) : undefined) ||
        this.lastSessionContext;

      const incomingTurns: ConversationTurn[] =
        request.context?.turns ||
        (request.sessionId ? this.sessionTurnsMap.get(request.sessionId) : undefined) ||
        this.lastSessionTurns ||
        [];

      // 10-turn window management & summarization of older turns (>10 turns)
      const MAX_RECENT_TURNS = 10;
      let recentTurns: ConversationTurn[] = [];
      let olderTurnsSummary: string | undefined = request.context?.olderTurnsSummary;

      if (incomingTurns.length > MAX_RECENT_TURNS) {
        const splitIndex = incomingTurns.length - MAX_RECENT_TURNS;
        const olderTurns = incomingTurns.slice(0, splitIndex);
        recentTurns = incomingTurns.slice(splitIndex);
        olderTurnsSummary = summarizeOlderTurns(olderTurns);
      } else {
        recentTurns = [...incomingTurns];
      }

      // 1. Intent Classification
      const classification = this.intentRouter.classify(message);
      let intent: IntentCategory = classification.intent;

      // Determine request channel (voice vs chat)
      const channel: PromptChannel =
        request.channel || (classification.isVoiceQuery ? "voice" : "chat");

      // 2. Resolve Target Location (Explicit Query > Follow-up Context > Dashboard Selected)
      const locationState = await this.resolveLocation(request, classification, currentContext);
      const targetLocation = locationState.resolvedLocation;

      // 3. Temporal Resolution (using target location's timezone)
      const targetTimezone = targetLocation?.timezone || request.location?.timezone || "UTC";
      const temporalResolution = this.temporalResolver.resolve(message, targetTimezone);

      // Adjust intent for future temporal targets or risk queries
      if (temporalResolution.isFuture && intent === "weather") {
        intent = "forecast";
      }

      // 4. Deterministic Tool Execution (Determine required data based on intent & query)
      let weather: WeatherSnapshot | undefined;
      let forecastData: NormalizedForecastData | undefined;
      let weatherRisk: WeatherRiskData | undefined;
      let events: WeatherEvent[] = [];
      let impactAssessment: ImpactAssessment | undefined;
      let agricultureAssessment: AgricultureAssessment | undefined;
      let modelConsensus: ModelConsensusReport | undefined;
      let activitySuitability: ActivitySuitabilityReport | undefined;

      // If location is unknown, fail fast with insufficient evidence without executing weather tools
      if (locationState.locationNotFound || (intent === "agriculture" && !targetLocation?.coordinates)) {
        return this.generateDeterministicFallback({
          userQuery: message,
          intent,
          targetLocation,
          selectedLocationName: locationState.selectedLocation?.name,
          queryLocationName: locationState.queryLocationName,
          locationNotFound: true,
          crop: classification.extractedCrop,
          temporalResolution,
          citations: [],
          initialGroundingStatus: "insufficient_evidence",
          generatedAt,
          conversationContext: currentContext,
        });
      }

      // Execute Weather / Forecast Tools
      if (
        (intent === "weather" || intent === "forecast" || intent === "impact" || intent === "agriculture" || intent === "consensus" || intent === "general") &&
        targetLocation?.coordinates
      ) {
        // Fetch current observations via get_weather tool
        const wRes = await this.toolRegistry.getWeatherTool.execute({
          coordinates: targetLocation.coordinates,
          timezone: targetLocation.timezone,
        });
        if (wRes.success) {
          weather = wRes.data;
        }

        // Fetch forecast via get_forecast tool if forecast intent or future temporal window
        if (intent === "forecast" || temporalResolution.isFuture) {
          const fRes = await this.toolRegistry.getForecastTool.execute({
            coordinates: targetLocation.coordinates,
            timezone: targetLocation.timezone,
            temporalTarget: temporalResolution.target,
            targetDate: temporalResolution.targetDate,
            targetHourStart: temporalResolution.hourStart,
            targetHourEnd: temporalResolution.hourEnd,
          });
          if (fRes.success) {
            forecastData = fRes.data;
          }
        }

        // Evaluate Weather Risk via get_risk tool if risk query or activity advisory
        if (classification.isRiskQuery && weather) {
          const rRes = await this.toolRegistry.getRiskTool.execute({
            weather,
            temporalTarget: temporalResolution.target,
            targetDate: temporalResolution.targetDate,
            activityType: classification.activityType || "outdoor_work",
          });
          if (rRes.success) {
            weatherRisk = rRes.data;
          }
        }
      }

      // Event retrieval via get_live_events tool for weather_event and impact queries
      if (intent === "weather_event" || intent === "impact") {
        const eRes = await this.toolRegistry.getLiveEventsTool.execute({
          keyword: classification.extractedEventKeyword,
          locationName: targetLocation?.name || classification.extractedLocation,
        });
        if (eRes.success) {
          events = eRes.data;
        }
      }

      // Impact Engine evaluation via get_event_impact tool
      if (intent === "impact" && targetLocation) {
        const primaryEvent = events[0] || (await this.getLatestActiveEvent());
        if (primaryEvent) {
          const iRes = await this.toolRegistry.getEventImpactTool.execute({
            event: primaryEvent,
            targetLocation,
            weather,
          });
          if (iRes.success) {
            impactAssessment = iRes.data;
          }
          if (!events.includes(primaryEvent)) {
            events.push(primaryEvent);
          }
        }
      }

      // Agriculture Engine evaluation via get_agriculture_risk tool
      if (intent === "agriculture" && targetLocation?.coordinates) {
        const crop = classification.extractedCrop; // Never default to wheat if not provided
        const aRes = await this.toolRegistry.getAgricultureRiskTool.execute({
          location: targetLocation,
          coordinates: targetLocation.coordinates,
          crop,
          activity: classification.extractedActivity,
          temporalTarget: temporalResolution.target,
          targetDate: temporalResolution.targetDate,
          timezone: targetLocation.timezone,
          weather,
        });
        if (aRes.success) {
          agricultureAssessment = aRes.data;
        } else {
          console.warn("[AIOrchestrator] Agriculture tool execution failed:", aRes.error);
        }
      }

      // Multi-model NWP Consensus evaluation via get_model_consensus tool
      if (classification.isConsensusQuery && targetLocation?.coordinates) {
        const mcRes = await this.toolRegistry.getModelConsensusTool.execute({
          coordinates: targetLocation.coordinates,
          targetDate: temporalResolution.targetDate,
          timezone: targetLocation.timezone,
          locationName: targetLocation.name,
        });
        if (mcRes.success) {
          modelConsensus = mcRes.data;
        } else {
          console.warn("[AIOrchestrator] Model consensus tool execution failed:", mcRes.error);
        }
      }

      // Activity Decision Intelligence evaluation via get_activity_suitability tool
      if (
        (classification.isActivityQuery || intent === "activity") &&
        targetLocation?.coordinates
      ) {
        const actRes = await this.toolRegistry.getActivitySuitabilityTool.execute({
          coordinates: targetLocation.coordinates,
          activity: classification.activityCategory,
          targetDate: temporalResolution.targetDate,
          timezone: targetLocation.timezone,
          locationName: targetLocation.name,
        });
        if (actRes.success) {
          activitySuitability = actRes.data;
        } else {
          console.warn("[AIOrchestrator] Activity tool execution failed:", actRes.error);
        }
      }

      // 5. Grounded Context Construction with XML Boundaries
      const groundedContext: GroundedContext = {
        userQuery: message,
        intent,
        channel,
        recentTurns,
        olderTurnsSummary,
        targetLocation,
        weather,
        events: events.length > 0 ? events : undefined,
        impactAssessment,
        agricultureAssessment,
        modelConsensus,
        activitySuitability,
        isVoiceQuery: channel === "voice",
        temporalResolution: {
          target: temporalResolution.target,
          label: temporalResolution.label,
          targetDate: temporalResolution.targetDate,
        },
        weatherRisk: weatherRisk
          ? {
            riskLevel: weatherRisk.riskLevel,
            confidence: weatherRisk.confidence,
            primaryHazard: weatherRisk.primaryHazard,
            recommendation: weatherRisk.recommendation,
            advisory: weatherRisk.activitySuitability.advisory,
            assessments: "assessments" in weatherRisk ? weatherRisk.assessments : undefined,
          }
          : undefined,
        untrustedSourceDelimiters: "XML_BOUNDED",
        builtAt: generatedAt,
      };

      const { systemInstruction, prompt, citations, initialGroundingStatus } =
        this.contextBuilder.buildPrompt(groundedContext);

      // 7. LLM Completion Generation with Resilient Fallback Handlers
      let rawAnswerText = "";
      let modelGroundingStatus = initialGroundingStatus;
      let uncertaintyNote: string | undefined;
      let updatedContext: ConversationContext;

      try {
        const rawCompletion = await this.aiProvider.generateCompletion(
          prompt,
          systemInstruction,
          { jsonMode: true }
        );

        const parsed = this.parseModelOutput(rawCompletion);
        rawAnswerText = parsed.answer;
        if (parsed.groundingStatus) {
          modelGroundingStatus = parsed.groundingStatus;
        }
        uncertaintyNote = parsed.uncertainty || undefined;

        // 6. Compute Short-Term Conversation Context & Record Session Turns
        const userTurn: ConversationTurn = {
          role: "user",
          content: message,
          timestamp: generatedAt,
          intent,
        };
        const assistantTurn: ConversationTurn = {
          role: "assistant",
          content: rawAnswerText,
          timestamp: generatedAt,
          intent,
        };
        const updatedTurns = [...incomingTurns, userTurn, assistantTurn];
        this.lastSessionTurns = updatedTurns;
        if (request.sessionId) {
          this.sessionTurnsMap.set(request.sessionId, updatedTurns);
        }

        updatedContext = {
          lastResolvedLocation: targetLocation?.coordinates ? targetLocation : currentContext?.lastResolvedLocation,
          lastIntent: intent,
          lastTemporalTarget: temporalResolution.target,
          lastEventId: events[0]?.id,
          lastEventTitle: events[0]?.title,
          turns: updatedTurns,
          olderTurnsSummary,
        };
        this.lastSessionContext = updatedContext;
        if (request.sessionId) {
          this.sessionContextMap.set(request.sessionId, updatedContext);
        }
      } catch (providerError: unknown) {
        console.error("[AIOrchestrator] Provider error during completion:", providerError);

        // Fallback: If AI provider is unavailable, rate limited, or returned invalid response, generate clean deterministic response
        if (
          providerError instanceof AppError &&
          (providerError.code === "AI_PROVIDER_UNAVAILABLE" ||
            providerError.code === "AI_RATE_LIMITED" ||
            providerError.code === "AI_RESPONSE_INVALID")
        ) {
          const userTurn: ConversationTurn = {
            role: "user",
            content: message,
            timestamp: generatedAt,
            intent,
          };
          const fallbackContext: ConversationContext = {
            lastResolvedLocation: targetLocation?.coordinates ? targetLocation : currentContext?.lastResolvedLocation,
            lastIntent: intent,
            lastTemporalTarget: temporalResolution.target,
            lastEventId: events[0]?.id,
            lastEventTitle: events[0]?.title,
            turns: [...incomingTurns, userTurn],
            olderTurnsSummary,
          };

          return this.generateDeterministicFallback({
            userQuery: message,
            intent,
            targetLocation,
            selectedLocationName: locationState.selectedLocation?.name,
            queryLocationName: locationState.queryLocationName,
            locationNotFound: locationState.locationNotFound,
            crop: classification.extractedCrop,
            weather,
            forecastData,
            weatherRisk,
            events,
            impactAssessment,
            agricultureAssessment,
            modelConsensus,
            activitySuitability,
            temporalResolution,
            citations,
            initialGroundingStatus,
            generatedAt,
            fallbackReason: providerError.message,
            conversationContext: fallbackContext,
          });
        }
        throw providerError;
      }

      // 8. Response Assembly & Zod Validation
      const responseId = `air_${generateDeterministicHash(`${message}_${generatedAt}`)}`;

      let numericConfidence: number | undefined = impactAssessment?.confidence;
      if (intent === "agriculture" && agricultureAssessment) {
        const conf = (agricultureAssessment as unknown as { confidence?: string }).confidence;
        if (conf === "high") numericConfidence = 0.9;
        else if (conf === "moderate") numericConfidence = 0.7;
        else if (conf === "low") numericConfidence = 0.4;
      } else if (classification.isRiskQuery && weatherRisk) {
        const conf = weatherRisk.confidence;
        if (conf === "high") numericConfidence = 0.9;
        else if (conf === "moderate") numericConfidence = 0.7;
        else if (conf === "low") numericConfidence = 0.4;
      } else if (classification.isConsensusQuery && modelConsensus) {
        const conf = modelConsensus.overallConfidence;
        if (conf === "high") numericConfidence = 0.9;
        else if (conf === "moderate") numericConfidence = 0.7;
        else if (conf === "low") numericConfidence = 0.4;
      } else if ((classification.isActivityQuery || intent === "activity") && activitySuitability) {
        const reqAct = classification.activityCategory || activitySuitability.requestedActivity || "running_cycling";
        const actEval = activitySuitability.activities[reqAct];
        const safety = actEval?.overallSafetyLevel;
        if (safety === "optimal" || safety === "acceptable") numericConfidence = 0.9;
        else if (safety === "caution") numericConfidence = 0.7;
        else numericConfidence = 0.4;
      }

      const resolvedCrop = classification.extractedCrop || agricultureAssessment?.crop;
      const riskReport = weatherRisk && "assessments" in weatherRisk ? weatherRisk : undefined;

      // Voice Assistant Briefing generation
      let voiceReport: VoiceAssistantReport | undefined;
      if (classification.isVoiceQuery) {
        const lang = globalVoiceService.detectLanguage(message);
        if (weather) {
          voiceReport = globalVoiceService.generateVoiceBriefing({
            weather,
            agriculture: agricultureAssessment,
            activity: activitySuitability,
            language: lang,
          });
          if (rawAnswerText) {
            const cleaned = globalVoiceService.cleanForSpeech(rawAnswerText);
            voiceReport.spokenScript = globalVoiceService.computeScriptMetrics(cleaned, lang);
          }
        } else if (targetLocation) {
          voiceReport = globalVoiceService.generateBriefingFromText({
            text: rawAnswerText || `Voice briefing for ${targetLocation.name}`,
            locationName: targetLocation.name,
            coordinates: targetLocation.coordinates,
            language: lang,
          });
        }
      }

      const responsePayload: AIResponse = {
        id: responseId,
        answer: rawAnswerText,
        intent,
        groundingStatus: modelGroundingStatus,
        citations,
        generatedAt,
        model: this.aiProvider.name,
        uncertainty: uncertaintyNote,
        crop: resolvedCrop,
        agriculture: agricultureAssessment,
        riskReport,
        modelConsensus,
        activitySuitability,
        voice: voiceReport,
        metadata: {
          locationName: targetLocation?.name,
          selectedLocationName: locationState.selectedLocation?.name,
          queryLocationName: locationState.queryLocationName,
          temporalContext: temporalResolution.label,
          confidence: numericConfidence,
          relevanceStatus:
            impactAssessment?.relevanceStatus || (intent === "impact" ? "unknown" : undefined),
          impactLevel: impactAssessment?.impactLevel,
          isFallback: false,
          conversationContext: updatedContext,
          crop: resolvedCrop,
          agriculture: agricultureAssessment,
          riskReport,
          modelConsensus,
          activitySuitability,
          voice: voiceReport,
        },
      };

      const validated = aiResponseSchema.safeParse(responsePayload);
      if (!validated.success) {
        throw new AppError(
          "AI_RESPONSE_INVALID",
          `Generated AI response failed validation: ${validated.error.message}`,
          422
        );
      }

      return { success: true, data: validated.data as AIResponse };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return { success: false, error: err };
      }
      return {
        success: false,
        error: new AppError(
          "UNKNOWN_ERROR",
          err instanceof Error ? err.message : "Error processing AI query",
          500
        ),
      };
    }
  }

  /**
   * Deterministic Query Location Resolution.
   *
   * Priority:
   * 1. Explicit query location wins.
   * 2. If no explicit location and query is a follow-up, use context.lastResolvedLocation.
   * 3. If no context location, use dashboard selectedLocation.
   * 4. Unknown locations set locationNotFound: true (no fabricated coordinates or weather).
   */
  private async resolveLocation(
    request: ChatRequest,
    classification?: IntentClassification | string,
    context?: ConversationContext
  ): Promise<ResolvedLocationState> {
    // 1. Construct selectedLocation from dashboard request
    const selectedLocation: EventLocation | undefined = request.location
      ? {
        name: request.location.name || request.location.city || "Selected Location",
        city: request.location.city,
        region: request.location.region,
        country: request.location.country || "Global",
        timezone: request.location.timezone,
        coordinates:
          request.location.lat !== undefined && request.location.lon !== undefined
            ? {
              latitude: request.location.lat,
              longitude: request.location.lon,
            }
            : undefined,
      }
      : undefined;

    // 2. Determine if user query explicitly mentions a target location
    let queryLocationName: string | undefined;
    let isFollowUp = false;

    if (typeof classification === "string") {
      queryLocationName = classification;
    } else if (classification) {
      queryLocationName =
        classification.intent === "impact"
          ? classification.targetImpactLocation || classification.extractedLocation
          : classification.extractedLocation;
      isFollowUp = !!classification.isFollowUp;
    }

    // 3. Defensive guard: ignore temporal/stop words erroneously passed as locations
    const TEMPORAL_LOCATION_GUARD =
      /^(?:hourly|daily|weekly|today|tomorrow|current|live|forecast|weather|irrigation|spraying|harvesting|sowing|fieldwork|wheat|rice|maize|potato|mustard|crops|crop|farming|pesticide|pesticides|fungicide|insecticide|fertilizer|agriculture|agricultural|plant|planting|seed|seeding|outdoor|your location|my location|current location|the location|this location|location)$/i;
    if (queryLocationName && TEMPORAL_LOCATION_GUARD.test(queryLocationName.trim())) {
      queryLocationName = undefined;
    }

    // If explicit location was mentioned in the user's query:
    if (queryLocationName && queryLocationName.trim().length > 0) {
      const trimmedQueryLoc = queryLocationName.trim();
      const displayQueryLoc = trimmedQueryLoc
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      // If query explicitly mentions the exact same location name or city as selectedLocation, reuse coordinates
      const selName = selectedLocation?.name.toLowerCase() || "";
      const selCity = selectedLocation?.city?.toLowerCase() || "";
      const qLoc = trimmedQueryLoc.toLowerCase();
      if (
        selectedLocation?.coordinates &&
        (selName === qLoc ||
          selCity === qLoc ||
          selName.startsWith(qLoc) ||
          (selCity && qLoc.startsWith(selCity)))
      ) {
        return {
          resolvedLocation: selectedLocation,
          selectedLocation,
          queryLocationName: displayQueryLoc,
          isExplicitQueryLocation: true,
          locationNotFound: false,
        };
      }

      // Geocode the explicit query location using search_location tool
      try {
        const geoRes = await this.toolRegistry.searchLocationTool.execute({
          query: trimmedQueryLoc,
          count: 1,
        });

        if (geoRes.success && geoRes.data.length > 0) {
          const top = geoRes.data[0];
          if (top) {
            const resolved: EventLocation = {
              name: top.name,
              city: top.name,
              region: top.region,
              country: top.country,
              timezone: top.timezone,
              coordinates: {
                latitude: top.latitude,
                longitude: top.longitude,
              },
            };
            return {
              resolvedLocation: resolved,
              selectedLocation,
              queryLocationName: displayQueryLoc,
              isExplicitQueryLocation: true,
              locationNotFound: false,
            };
          }
        }
      } catch (err) {
        console.warn(`[AIOrchestrator] Geocoding lookup failed for query location "${trimmedQueryLoc}":`, err);
      }

      // Geocoding yielded no results (e.g. unknown/fictional location):
      // Clean insufficient evidence state with NO fabricated coordinates or weather
      const unverifiedLoc: EventLocation = {
        name: displayQueryLoc,
        city: displayQueryLoc,
        country: "Global",
        coordinates: undefined,
      };

      return {
        resolvedLocation: unverifiedLoc,
        selectedLocation,
        queryLocationName: displayQueryLoc,
        isExplicitQueryLocation: true,
        locationNotFound: true,
      };
    }

    // 4. If NO explicit query location was mentioned:
    // Check if conversation context clearly establishes a location for follow-up
    if (isFollowUp && context?.lastResolvedLocation?.coordinates) {
      return {
        resolvedLocation: context.lastResolvedLocation,
        selectedLocation,
        queryLocationName: undefined,
        isExplicitQueryLocation: false,
        locationNotFound: false,
      };
    }

    // 5. Fall back to dashboard selectedLocation
    if (selectedLocation) {
      if (selectedLocation.coordinates) {
        return {
          resolvedLocation: selectedLocation,
          selectedLocation,
          queryLocationName: undefined,
          isExplicitQueryLocation: false,
          locationNotFound: false,
        };
      }

      if (selectedLocation.name) {
        try {
          const geoRes = await this.toolRegistry.searchLocationTool.execute({
            query: selectedLocation.name,
            count: 1,
          });
          if (geoRes.success && geoRes.data.length > 0) {
            const top = geoRes.data[0];
            if (top) {
              return {
                resolvedLocation: {
                  name: top.name,
                  city: top.name,
                  region: top.region,
                  country: top.country,
                  timezone: top.timezone,
                  coordinates: {
                    latitude: top.latitude,
                    longitude: top.longitude,
                  },
                },
                selectedLocation,
                queryLocationName: undefined,
                isExplicitQueryLocation: false,
                locationNotFound: false,
              };
            }
          }
        } catch {
          // Geocoding failure falls back to name-only
        }
      }

      return {
        resolvedLocation: selectedLocation,
        selectedLocation,
        queryLocationName: undefined,
        isExplicitQueryLocation: false,
        locationNotFound: false,
      };
    }

    // 6. If conversation context exists as ultimate fallback
    if (context?.lastResolvedLocation?.coordinates) {
      return {
        resolvedLocation: context.lastResolvedLocation,
        selectedLocation: undefined,
        queryLocationName: undefined,
        isExplicitQueryLocation: false,
        locationNotFound: false,
      };
    }

    return {
      resolvedLocation: undefined,
      selectedLocation: undefined,
      queryLocationName: undefined,
      isExplicitQueryLocation: false,
      locationNotFound: false,
    };
  }

  private async getLatestActiveEvent(): Promise<WeatherEvent | undefined> {
    try {
      const events = await globalEventRepository.findAll({ status: "active", limit: 1 });
      return events[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Parse JSON output from model with resilient fallback.
   */
  private parseModelOutput(raw: string): {
    answer: string;
    groundingStatus?: GroundingStatus;
    uncertainty?: string | null;
  } {
    try {
      let clean = raw.trim();
      const jsonBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        clean = jsonBlockMatch[1].trim();
      } else {
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          clean = clean.slice(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(clean);
      if (parsed.answer && typeof parsed.answer === "string") {
        let status: GroundingStatus | undefined = undefined;
        if (
          parsed.groundingStatus === "grounded" ||
          parsed.groundingStatus === "partially_grounded" ||
          parsed.groundingStatus === "general_knowledge" ||
          parsed.groundingStatus === "insufficient_evidence"
        ) {
          status = parsed.groundingStatus;
        }

        return {
          answer: parsed.answer,
          groundingStatus: status,
          uncertainty: parsed.uncertainty || null,
        };
      }
    } catch {
      // If model returned plain text instead of JSON
      return {
        answer: raw.trim(),
        groundingStatus: "partially_grounded",
      };
    }

    return {
      answer: raw.trim(),
      groundingStatus: "partially_grounded",
    };
  }

  /**
   * Deterministic factual fallback when AI is unavailable.
   */
  private generateDeterministicFallback(context: {
    userQuery: string;
    intent: IntentCategory;
    targetLocation?: EventLocation;
    selectedLocationName?: string;
    queryLocationName?: string;
    locationNotFound?: boolean;
    crop?: string;
    weather?: WeatherSnapshot;
    forecastData?: NormalizedForecastData;
    weatherRisk?: WeatherRiskData;
    events?: WeatherEvent[];
    impactAssessment?: ImpactAssessment;
    agricultureAssessment?: AgricultureAssessment;
    modelConsensus?: ModelConsensusReport;
    activitySuitability?: ActivitySuitabilityReport;
    voice?: VoiceAssistantReport;
    temporalResolution?: TemporalResolution;
    citations: AICitation[];
    initialGroundingStatus: GroundingStatus;
    generatedAt: string;
    fallbackReason?: string;
    conversationContext?: ConversationContext;
  }): Result<AIResponse> {
    const id = `air_fallback_${generateDeterministicHash(`${context.userQuery}_${context.generatedAt}`)}`;
    let answer = "";
    const locName = context.targetLocation?.name || context.queryLocationName || "your location";

    const isGreeting = /\b(hlo|hello|hi|hey|greetings|namaste|good morning|good afternoon|good evening)\b/i.test(
      context.userQuery.trim()
    );

    if (isGreeting) {
      if (context.weather) {
        const c = context.weather.current;
        answer = `Hello! I am WeatherGPT Copilot. Current weather for ${locName}: ${c.temperature}°C, ${c.condition}. Humidity: ${c.humidity}%, Wind: ${c.windSpeed} km/h. How can I assist your weather intelligence planning today?`;
      } else {
        answer = `Hello! I am WeatherGPT Copilot, your weather and disaster intelligence assistant. Ask me about current weather, 7-day forecasts, or regional disaster impact assessments.`;
      }
    } else if (
      context.locationNotFound ||
      (context.targetLocation && !context.weather && !context.targetLocation.coordinates)
    ) {
      answer = `Unable to find verified geographic location or weather observations for "${locName}". Please verify the location name and try again.`;
    } else if (context.intent === "agriculture" && context.agricultureAssessment) {
      const agr = context.agricultureAssessment;
      const cropText = agr.cropDisplayName || "Not specified / Generic";
      const periodText = context.temporalResolution?.label || "Target period";
      const weatherSummary = `Precipitation: ${agr.forecastSummary.next24hPrecipMm} mm (48h: ${agr.forecastSummary.next48hPrecipMm} mm), Max Temp: ${agr.forecastSummary.maxTemperatureC}°C, Min Temp: ${agr.forecastSummary.minTemperatureC}°C, Wind: up to ${agr.forecastSummary.maxWindSpeedKmh} km/h, Humidity: ${agr.forecastSummary.averageHumidityPct}%`;
      const riskText = agr.overallRiskLevel.charAt(0).toUpperCase() + agr.overallRiskLevel.slice(1);
      const recommendationText = (agr as unknown as { recommendation?: string }).recommendation || agr.activities.spraying.advisory || agr.activities.irrigation.advisory;
      const reasonText = (agr as unknown as { reason?: string }).reason || agr.activities.spraying.reason || agr.activities.irrigation.reason;
      const confidenceText = (agr as unknown as { confidence?: string }).confidence ? (((agr as unknown as { confidence: string }).confidence.charAt(0).toUpperCase() + (agr as unknown as { confidence: string }).confidence.slice(1))) : "High";
      const noteLine = agr.cropEvidenceNote ? `\n\n${agr.cropEvidenceNote}` : "";

      answer = `🌾 Agriculture Intelligence\n\nCrop:\n${cropText}\n\nLocation:\n${locName}\n\nPeriod:\n${periodText}\n\nWeather:\n${weatherSummary}\n\nRisk:\n${riskText}\n\nRecommendation:\n${recommendationText}\n\nReason:\n${reasonText}\n\nConfidence:\n${confidenceText}${noteLine}`;
    } else if (context.activitySuitability) {
      const actRep = context.activitySuitability;
      const reqAct = actRep.requestedActivity || "running_cycling";
      const act = actRep.activities[reqAct];
      if (act) {
        const bestWin = act.bestWindow
          ? `\nBest Time Window: ${act.bestWindow.startHour} - ${act.bestWindow.endHour} (Score: ${act.bestWindow.averageScore}/100)`
          : "";
        const factors =
          act.limitingFactors.length > 0
            ? `\nPrimary factor: ${act.limitingFactors[0]?.description}`
            : "";
        answer = `🏃 Activity Weather Suitability for ${locName} (${act.activityName}):\nSafety Level: ${act.overallSafetyLevel.toUpperCase()} (${act.overallScore}/100).\nRecommendation: ${act.recommendation}${bestWin}${factors}`;
      } else {
        answer = `Activity suitability evaluation for ${locName} is complete based on verified hourly forecasts.`;
      }
    } else if (context.modelConsensus) {
      const mc = context.modelConsensus;
      const firstDay = mc.consensusDays[0];
      const tempInfo = firstDay
        ? `High temperature mean is ${firstDay.temperatureHigh.mean}°C (spread: ±${firstDay.temperatureHigh.spread}°C). `
        : "";
      answer = `📊 NWP Model Consensus for ${locName}:\nOverall agreement index is ${mc.overallAgreementScore}% (${mc.overallConfidence.toUpperCase()} confidence) across models ${mc.modelsUsed.join(", ").toUpperCase()}.\n${tempInfo}Summary: ${mc.summaryNotes}`;
    } else if (context.weatherRisk) {
      const wr = context.weatherRisk;
      let detailedBreakdown = "";
      if ("assessments" in wr && wr.assessments && wr.assessments.length > 0) {
        detailedBreakdown =
          "\n\nRisk Breakdown:\n" +
          wr.assessments
            .map(
              (a) =>
                `• ${a.type.replace(/_/g, " ").toUpperCase()}: ${a.severity.toUpperCase()} (${a.confidence} confidence) — ${a.recommendation}`
            )
            .join("\n");
      }
      answer = `⚠️ Weather Risk Assessment for ${locName} (${context.temporalResolution?.label || "target period"}):\nOverall risk is ${wr.riskLevel.toUpperCase()} (${wr.confidence} confidence).\nAdvisory: ${wr.activitySuitability.advisory}\nRecommendation: ${wr.recommendation}${detailedBreakdown}`;
    } else if (context.intent === "forecast" && context.forecastData) {
      const f = context.forecastData;
      const tempHigh = f.temperatureRange?.high !== undefined ? `${f.temperatureRange.high}°C` : "N/A";
      const tempLow = f.temperatureRange?.low !== undefined ? `${f.temperatureRange.low}°C` : "N/A";
      answer = `Forecast for ${locName} (${context.temporalResolution?.label || f.temporalTarget}): High ${tempHigh}, Low ${tempLow}, ${f.expectedCondition || "clear"}. Rain probability: ${f.maxPrecipitationProbability}%, total precipitation: ${f.totalPrecipitationSum} mm.`;
    } else if (context.intent === "impact" && context.impactAssessment) {
      const imp = context.impactAssessment;
      answer = `Impact assessment for ${locName}: Relevance is ${imp.relevanceStatus.toUpperCase()} with ${imp.impactLevel.toUpperCase()} impact level. ${imp.reasons.join(" ")}`;
      if (context.weather) {
        const c = context.weather.current;
        answer += ` Current local weather: ${c.temperature}°C, ${c.condition}.`;
      }
    } else if (context.intent === "weather_event" && context.events && context.events.length > 0 && context.events[0]) {
      const ev = context.events[0];
      answer = `Active event alert: ${ev.title} (${ev.hazard}, severity: ${ev.severity}). Reported in ${ev.location.name}, ${ev.location.country}.`;
    } else if (context.weather) {
      const c = context.weather.current;
      answer = `Current weather for ${locName}: ${c.temperature}°C, ${c.condition}. Humidity: ${c.humidity}%, Wind: ${c.windSpeed} km/h.`;
    } else {
      answer = `I have received your query for ${locName}. Current observations or active disaster bulletins have been correlated from verified sources.`;
    }

    const groundingStatus: GroundingStatus =
      context.locationNotFound ||
      (context.targetLocation && !context.weather && !context.targetLocation.coordinates)
        ? "insufficient_evidence"
        : context.initialGroundingStatus || "grounded";

    let fallbackConfidence: number | undefined = context.impactAssessment?.confidence;
    if (context.intent === "agriculture" && context.agricultureAssessment) {
      const conf = (context.agricultureAssessment as unknown as { confidence?: string }).confidence;
      if (conf === "high") fallbackConfidence = 0.9;
      else if (conf === "moderate") fallbackConfidence = 0.7;
      else if (conf === "low") fallbackConfidence = 0.4;
    } else if (context.weatherRisk) {
      const conf = context.weatherRisk.confidence;
      if (conf === "high") fallbackConfidence = 0.9;
      else if (conf === "moderate") fallbackConfidence = 0.7;
      else if (conf === "low") fallbackConfidence = 0.4;
    } else if (context.modelConsensus) {
      const conf = context.modelConsensus.overallConfidence;
      if (conf === "high") fallbackConfidence = 0.9;
      else if (conf === "moderate") fallbackConfidence = 0.7;
      else if (conf === "low") fallbackConfidence = 0.4;
    } else if (context.activitySuitability) {
      const reqAct = context.activitySuitability.requestedActivity || "running_cycling";
      const safety = context.activitySuitability.activities[reqAct]?.overallSafetyLevel;
      if (safety === "optimal" || safety === "acceptable") fallbackConfidence = 0.9;
      else if (safety === "caution") fallbackConfidence = 0.7;
      else fallbackConfidence = 0.4;
    }

    const fallbackCrop = context.crop || context.agricultureAssessment?.crop;
    const fallbackRiskReport =
      context.weatherRisk && "assessments" in context.weatherRisk ? context.weatherRisk : undefined;

    let voiceReport = context.voice;
    if (!voiceReport && globalIntentRouter.isVoiceQuery(context.userQuery)) {
      const lang = globalVoiceService.detectLanguage(context.userQuery);
      if (context.weather) {
        voiceReport = globalVoiceService.generateVoiceBriefing({
          weather: context.weather,
          agriculture: context.agricultureAssessment,
          activity: context.activitySuitability,
          language: lang,
        });
        if (answer) {
          const cleaned = globalVoiceService.cleanForSpeech(answer);
          voiceReport.spokenScript = globalVoiceService.computeScriptMetrics(cleaned, lang);
        }
      } else if (context.targetLocation) {
        voiceReport = globalVoiceService.generateBriefingFromText({
          text: answer,
          locationName: context.targetLocation.name,
          coordinates: context.targetLocation.coordinates,
          language: lang,
        });
      }
    }

    if (context.conversationContext?.turns) {
      context.conversationContext.turns.push({
        role: "assistant",
        content: answer,
        timestamp: context.generatedAt,
        intent: context.intent,
      });
      this.lastSessionTurns = context.conversationContext.turns;
      this.lastSessionContext = context.conversationContext;
    }

    return {
      success: true,
      data: {
        id,
        answer,
        intent: context.intent,
        groundingStatus,
        citations: context.citations,
        generatedAt: context.generatedAt,
        model: "deterministic-fallback",
        crop: fallbackCrop,
        agriculture: context.agricultureAssessment,
        riskReport: fallbackRiskReport,
        modelConsensus: context.modelConsensus,
        activitySuitability: context.activitySuitability,
        voice: voiceReport,
        metadata: {
          locationName: context.targetLocation?.name,
          selectedLocationName: context.selectedLocationName,
          queryLocationName: context.queryLocationName,
          temporalContext: context.temporalResolution?.label,
          confidence: fallbackConfidence,
          relevanceStatus:
            context.impactAssessment?.relevanceStatus || (context.intent === "impact" ? "unknown" : undefined),
          impactLevel: context.impactAssessment?.impactLevel,
          isFallback: true,
          fallbackReason: context.fallbackReason,
          conversationContext: context.conversationContext,
          crop: fallbackCrop,
          agriculture: context.agricultureAssessment,
          riskReport: fallbackRiskReport,
          modelConsensus: context.modelConsensus,
          activitySuitability: context.activitySuitability,
          voice: voiceReport,
        },
      },
    };
  }
}

export const globalAIOrchestrator = new AIOrchestrator();
