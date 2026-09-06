/**
 * AI Orchestrator.
 *
 * Coordinates the end-to-end AI intelligence pipeline:
 * User query → Intent classification → Deterministic data retrieval → Impact evaluation
 * → Grounded context construction → LLM completion → Response validation.
 */

import type {
  AIResponse,
  ChatRequest,
  GroundedContext,
  IntentCategory,
  GroundingStatus,
  AICitation,
} from "@/types/ai";
import type { EventLocation, WeatherEvent } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";
import type { ImpactAssessment } from "@/types/impact";
import type { Result } from "@/types/common";
import { AppError } from "@/lib/errors";
import { aiResponseSchema } from "@/schemas/ai";
import { generateDeterministicHash } from "@/lib/deduplicator";

import { IntentRouter, globalIntentRouter } from "./intent-router";
import { ContextBuilder, globalContextBuilder } from "./context-builder";
import type { AIProvider } from "./ai-provider";
import { GeminiProvider } from "./gemini-provider";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { LocationService } from "@/services/location/location-service";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { ImpactEngine, globalImpactEngine } from "@/services/impact/impact-engine";

export interface AIOrchestratorConfig {
  aiProvider?: AIProvider;
  intentRouter?: IntentRouter;
  contextBuilder?: ContextBuilder;
  weatherService?: WeatherService;
  locationService?: LocationService;
  impactEngine?: ImpactEngine;
}

export class AIOrchestrator {
  private aiProvider: AIProvider;
  private intentRouter: IntentRouter;
  private contextBuilder: ContextBuilder;
  private weatherService: WeatherService;
  private locationService: LocationService;
  private impactEngine: ImpactEngine;

  constructor(config: AIOrchestratorConfig = {}) {
    this.aiProvider = config.aiProvider || new GeminiProvider();
    this.intentRouter = config.intentRouter || globalIntentRouter;
    this.contextBuilder = config.contextBuilder || globalContextBuilder;
    this.weatherService = config.weatherService || new WeatherService(new OpenMeteoProvider());
    this.locationService = config.locationService || new LocationService();
    this.impactEngine = config.impactEngine || globalImpactEngine;
  }

  /**
   * Process a chat request and return a validated AIResponse.
   */
  async processQuery(request: ChatRequest): Promise<Result<AIResponse>> {
    try {
      const generatedAt = new Date().toISOString();
      const message = request.message.trim();

      // 1. Intent Classification
      const classification = this.intentRouter.classify(message);
      const intent: IntentCategory = classification.intent;

      // 2. Resolve Target Location
      const targetLocation = await this.resolveLocation(request, classification.extractedLocation);

      // 3. Deterministic Data Retrieval based on Intent
      let weather: WeatherSnapshot | undefined;
      let events: WeatherEvent[] = [];
      let impactAssessment: ImpactAssessment | undefined;

      // Weather / Forecast retrieval (also retrieved for general queries when location coordinates are present to ground context)
      if ((intent === "weather" || intent === "forecast" || intent === "impact" || intent === "general") && targetLocation?.coordinates) {
        try {
          const wRes = await this.weatherService.getWeather(
            targetLocation.coordinates,
            targetLocation.timezone
          );
          if (wRes.success) {
            weather = wRes.data;
          }
        } catch {
          // Weather fetch failure is non-fatal for general/event queries
        }
      }

      // Event retrieval for weather_event and impact queries
      if (intent === "weather_event" || intent === "impact") {
        events = await this.findRelevantEvents(
          classification.extractedEventKeyword,
          targetLocation?.name || classification.extractedLocation
        );
      }

      // Impact Engine evaluation
      if (intent === "impact" && targetLocation) {
        const primaryEvent = events[0] || (await this.getLatestActiveEvent());
        if (primaryEvent) {
          impactAssessment = this.impactEngine.assessImpact(primaryEvent, targetLocation, weather);
          if (!events.includes(primaryEvent)) {
            events.push(primaryEvent);
          }
        }
      }

      // 4. Grounded Context Construction
      const groundedContext: GroundedContext = {
        userQuery: message,
        intent,
        targetLocation,
        weather,
        events: events.length > 0 ? events : undefined,
        impactAssessment,
        untrustedSourceDelimiters: "XML_BOUNDED",
        builtAt: generatedAt,
      };

      const { systemInstruction, prompt, citations, initialGroundingStatus } =
        this.contextBuilder.buildPrompt(groundedContext);

      // 5. LLM Completion Generation with Error Handlers
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
            weather,
            events,
            impactAssessment,
            citations,
            initialGroundingStatus,
            generatedAt,
            fallbackReason: providerError.message,
          });
        }
        throw providerError;
      }

      // 6. Response Assembly & Zod Validation
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
          confidence: impactAssessment?.confidence,
          relevanceStatus: impactAssessment?.relevanceStatus,
          impactLevel: impactAssessment?.impactLevel,
          isFallback: false,
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
   * Resolve location from request or query string.
   */
  private async resolveLocation(
    request: ChatRequest,
    extractedName?: string
  ): Promise<EventLocation | undefined> {
    // If request already provides coordinates
    if (request.location?.lat !== undefined && request.location?.lon !== undefined) {
      return {
        name: request.location.name || request.location.city || "Target Location",
        city: request.location.city,
        region: request.location.region,
        country: request.location.country || "Global",
        timezone: request.location.timezone,
        coordinates: {
          latitude: request.location.lat,
          longitude: request.location.lon,
        },
      };
    }

    // Try to geocode extracted location name
    const queryName = request.location?.name || request.location?.city || extractedName;
    if (queryName) {
      try {
        const geoRes = await this.locationService.search(queryName);
        if (geoRes.success && geoRes.data.length > 0) {
          const top = geoRes.data[0];
          if (top) {
            return {
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
          }
        }
      } catch {
        // Geocoding failure falls back to name-only location
      }

      return {
        name: queryName,
        city: queryName,
        country: "Global",
      };
    }

    return undefined;
  }

  /**
   * Search for relevant weather events in the local repository.
   */
  private async findRelevantEvents(
    keyword?: string,
    locationName?: string
  ): Promise<WeatherEvent[]> {
    try {
      const allEvents = await globalEventRepository.findAll({ limit: 50 });
      if (allEvents.length === 0) return [];

      if (!keyword && !locationName) {
        return allEvents.slice(0, 3);
      }

      const kwLower = keyword?.toLowerCase();
      const locLower = locationName?.toLowerCase();

      return allEvents.filter((ev) => {
        const text = `${ev.title} ${ev.description} ${ev.location.name} ${ev.location.country}`.toLowerCase();
        const matchesKw = kwLower ? text.includes(kwLower) : false;
        const matchesLoc = locLower ? text.includes(locLower) : false;
        return matchesKw || matchesLoc;
      });
    } catch {
      return [];
    }
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
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          clean = clean.substring(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(clean);
      if (parsed.answer && typeof parsed.answer === "string") {
        const validStatuses: GroundingStatus[] = [
          "grounded",
          "partially_grounded",
          "general_knowledge",
          "insufficient_evidence",
        ];
        const status = validStatuses.includes(parsed.groundingStatus)
          ? (parsed.groundingStatus as GroundingStatus)
          : undefined;

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
    weather?: WeatherSnapshot;
    events?: WeatherEvent[];
    impactAssessment?: ImpactAssessment;
    citations: AICitation[];
    initialGroundingStatus: GroundingStatus;
    generatedAt: string;
    fallbackReason?: string;
  }): Result<AIResponse> {
    const id = `air_fallback_${generateDeterministicHash(`${context.userQuery}_${context.generatedAt}`)}`;
    let answer = "";
    const locName = context.targetLocation?.name || "your location";

    const isGreeting = /\b(hlo|hello|hi|hey|greetings|namaste|good morning|good afternoon|good evening)\b/i.test(context.userQuery.trim());

    if (isGreeting) {
      if (context.weather) {
        const c = context.weather.current;
        answer = `Hello! I am WeatherGPT Copilot. Current weather for ${locName}: ${c.temperature}°C, ${c.condition}. Humidity: ${c.humidity}%, Wind: ${c.windSpeed} km/h. How can I assist your weather intelligence planning today?`;
      } else {
        answer = `Hello! I am WeatherGPT Copilot, your weather and disaster intelligence assistant. Ask me about current weather, 7-day forecasts, or regional disaster impact assessments.`;
      }
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

    return {
      success: true,
      data: {
        id,
        answer,
        intent: context.intent,
        groundingStatus: context.initialGroundingStatus,
        citations: context.citations,
        generatedAt: context.generatedAt,
        model: "deterministic-fallback",
        metadata: {
          locationName: context.targetLocation?.name,
          confidence: context.impactAssessment?.confidence,
          relevanceStatus: context.impactAssessment?.relevanceStatus,
          impactLevel: context.impactAssessment?.impactLevel,
          isFallback: true,
          fallbackReason: context.fallbackReason,
        },
      },
    };
  }
}

export const globalAIOrchestrator = new AIOrchestrator();
