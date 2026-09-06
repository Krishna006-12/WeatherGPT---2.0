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
} from "@/types/ai";
import type { EventLocation, WeatherEvent } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";
import type { ImpactAssessment } from "@/types/impact";
import type { Result } from "@/types/common";
import { AppError } from "@/lib/errors";
import { aiResponseSchema } from "@/schemas/ai";
import { generateDeterministicHash } from "@/lib/deduplicator";

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
import type { NormalizedForecastData } from "./tools/get-forecast-tool";
import type { WeatherRiskAssessment } from "./tools/get-weather-risk-tool";

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

      // Retrieve incoming conversation context (from request payload, sessionId, or instance memory)
      const currentContext: ConversationContext | undefined =
        request.context ||
        (request.sessionId ? this.sessionContextMap.get(request.sessionId) : undefined) ||
        this.lastSessionContext;

      // 1. Intent Classification
      const classification = this.intentRouter.classify(message);
      let intent: IntentCategory = classification.intent;

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
      let weatherRisk: WeatherRiskAssessment | undefined;
      let events: WeatherEvent[] = [];
      let impactAssessment: ImpactAssessment | undefined;

      // If location is unknown, fail fast with insufficient evidence without executing weather tools
      if (locationState.locationNotFound) {
        return this.generateDeterministicFallback({
          userQuery: message,
          intent,
          targetLocation,
          selectedLocationName: locationState.selectedLocation?.name,
          queryLocationName: locationState.queryLocationName,
          locationNotFound: true,
          temporalResolution,
          citations: [],
          initialGroundingStatus: "insufficient_evidence",
          generatedAt,
          conversationContext: currentContext,
        });
      }

      // Execute Weather / Forecast Tools
      if (
        (intent === "weather" || intent === "forecast" || intent === "impact" || intent === "general") &&
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

        // Evaluate Weather Risk via get_weather_risk tool if risk query or activity advisory
        if (classification.isRiskQuery && weather) {
          const rRes = await this.toolRegistry.getWeatherRiskTool.execute({
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

      // 5. Grounded Context Construction with XML Boundaries
      const groundedContext: GroundedContext = {
        userQuery: message,
        intent,
        targetLocation,
        weather,
        events: events.length > 0 ? events : undefined,
        impactAssessment,
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
            }
          : undefined,
        untrustedSourceDelimiters: "XML_BOUNDED",
        builtAt: generatedAt,
      };

      const { systemInstruction, prompt, citations, initialGroundingStatus } =
        this.contextBuilder.buildPrompt(groundedContext);

      // 6. Compute Short-Term Conversation Context
      const updatedContext: ConversationContext = {
        lastResolvedLocation: targetLocation?.coordinates ? targetLocation : currentContext?.lastResolvedLocation,
        lastIntent: intent,
        lastTemporalTarget: temporalResolution.target,
        lastEventId: events[0]?.id,
        lastEventTitle: events[0]?.title,
      };
      this.lastSessionContext = updatedContext;
      if (request.sessionId) {
        this.sessionContextMap.set(request.sessionId, updatedContext);
      }

      // 7. LLM Completion Generation with Resilient Fallback Handlers
      let rawAnswerText = "";
      let modelGroundingStatus = initialGroundingStatus;
      let uncertaintyNote: string | undefined;

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
      } catch (providerError: unknown) {
        console.error("[AIOrchestrator] Provider error during completion:", providerError);

        // Fallback: If AI provider is unavailable, rate limited, or returned invalid response, generate clean deterministic response
        if (
          providerError instanceof AppError &&
          (providerError.code === "AI_PROVIDER_UNAVAILABLE" ||
            providerError.code === "AI_RATE_LIMITED" ||
            providerError.code === "AI_RESPONSE_INVALID")
        ) {
          return this.generateDeterministicFallback({
            userQuery: message,
            intent,
            targetLocation,
            selectedLocationName: locationState.selectedLocation?.name,
            queryLocationName: locationState.queryLocationName,
            locationNotFound: locationState.locationNotFound,
            weather,
            forecastData,
            weatherRisk,
            events,
            impactAssessment,
            temporalResolution,
            citations,
            initialGroundingStatus,
            generatedAt,
            fallbackReason: providerError.message,
            conversationContext: updatedContext,
          });
        }
        throw providerError;
      }

      // 8. Response Assembly & Zod Validation
      const responseId = `air_${generateDeterministicHash(`${message}_${generatedAt}`)}`;

      const responsePayload: AIResponse = {
        id: responseId,
        answer: rawAnswerText,
        intent,
        groundingStatus: modelGroundingStatus,
        citations,
        generatedAt,
        model: this.aiProvider.name,
        uncertainty: uncertaintyNote,
        metadata: {
          locationName: targetLocation?.name,
          selectedLocationName: locationState.selectedLocation?.name,
          queryLocationName: locationState.queryLocationName,
          temporalContext: temporalResolution.label,
          confidence: impactAssessment?.confidence,
          relevanceStatus:
            impactAssessment?.relevanceStatus || (intent === "impact" ? "unknown" : undefined),
          impactLevel: impactAssessment?.impactLevel,
          isFallback: false,
          conversationContext: updatedContext,
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

    // 3. If explicit location was mentioned in the user's query:
    if (queryLocationName && queryLocationName.trim().length > 0) {
      const trimmedQueryLoc = queryLocationName.trim();
      const displayQueryLoc = trimmedQueryLoc
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      // If query explicitly mentions the exact same location name as selectedLocation, reuse coordinates
      if (
        selectedLocation?.coordinates &&
        selectedLocation.name.toLowerCase() === trimmedQueryLoc.toLowerCase()
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
    if ((isFollowUp || !request.location) && context?.lastResolvedLocation?.coordinates) {
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
    weather?: WeatherSnapshot;
    forecastData?: NormalizedForecastData;
    weatherRisk?: WeatherRiskAssessment;
    events?: WeatherEvent[];
    impactAssessment?: ImpactAssessment;
    temporalResolution?: TemporalResolution;
    citations: AICitation[];
    initialGroundingStatus: GroundingStatus;
    generatedAt: string;
    fallbackReason?: string;
    conversationContext?: ConversationContext;
  }): Result<AIResponse> {
    const id = `air_fallback_${generateDeterministicHash(`${context.userQuery}_${context.generatedAt}`)}`;
    let answer = "";
    const locName = context.targetLocation?.name || "your location";

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
    } else if (context.weatherRisk) {
      const wr = context.weatherRisk;
      answer = `Weather risk assessment for ${locName} (${context.temporalResolution?.label || "target period"}): Overall risk is ${wr.riskLevel.toUpperCase()} (${wr.confidence} confidence). ${wr.activitySuitability.advisory} ${wr.recommendation}`;
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
      answer = `Current weather for ${locName}: ${c.temperature}°C, ${c.condition}. Humidity: ${c.humidity}%, Wind: ${c.windSpeed} km/h, Precipitation: ${c.precipitation} mm/h.`;
    } else {
      const reasonNote = context.fallbackReason ? ` (${context.fallbackReason})` : "";
      answer = `Live AI intelligence service is currently operating in deterministic backup mode${reasonNote}. Please check the verified live observation cards on your dashboard or ask about weather for a specific city.`;
    }

    const groundingStatus: GroundingStatus =
      context.locationNotFound ||
      (context.targetLocation && !context.weather && !context.targetLocation.coordinates)
        ? "insufficient_evidence"
        : context.initialGroundingStatus;

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
        metadata: {
          locationName: context.targetLocation?.name,
          selectedLocationName: context.selectedLocationName,
          queryLocationName: context.queryLocationName,
          temporalContext: context.temporalResolution?.label,
          confidence: context.impactAssessment?.confidence,
          relevanceStatus:
            context.impactAssessment?.relevanceStatus || (context.intent === "impact" ? "unknown" : undefined),
          impactLevel: context.impactAssessment?.impactLevel,
          isFallback: true,
          fallbackReason: context.fallbackReason,
          conversationContext: context.conversationContext,
        },
      },
    };
  }
}

export const globalAIOrchestrator = new AIOrchestrator();
