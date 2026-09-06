/**
 * Mock AI Provider for deterministic testing and local offline simulation.
 */

import type { AIProvider, AICompletionOptions } from "./ai-provider";
import { AppError } from "@/lib/errors";

export interface MockAIProviderOptions {
  customResponse?: string;
  simulateError?: "timeout" | "rate_limit" | "malformed" | "unavailable";
  responseGenerator?: (prompt: string) => string;
}

export class MockAIProvider implements AIProvider {
  public readonly name = "mock";
  private options: MockAIProviderOptions;

  constructor(options: MockAIProviderOptions = {}) {
    this.options = options;
  }

  setOptions(options: MockAIProviderOptions): void {
    this.options = options;
  }

  async generateCompletion(
    prompt: string,
    _systemInstruction?: string,
    _options?: AICompletionOptions
  ): Promise<string> {
    if (this.options.simulateError === "timeout") {
      throw new AppError("AI_PROVIDER_UNAVAILABLE", "Gemini API request timed out", 504);
    }
    if (this.options.simulateError === "rate_limit") {
      throw new AppError("AI_RATE_LIMITED", "Gemini API rate limit exceeded", 429);
    }
    if (this.options.simulateError === "unavailable") {
      throw new AppError("AI_PROVIDER_UNAVAILABLE", "AI service temporarily unavailable", 502);
    }
    if (this.options.simulateError === "malformed") {
      return "This is a raw text response that is not valid JSON { malformed";
    }

    if (this.options.customResponse) {
      return this.options.customResponse;
    }

    if (this.options.responseGenerator) {
      return this.options.responseGenerator(prompt);
    }

    // Default intelligent mock generator: parses the prompt and generates realistic grounded output
    return this.generateDefaultResponse(prompt);
  }

  private generateDefaultResponse(prompt: string): string {
    const isImpact = prompt.includes("Intent Detected: impact");
    const isForecast = prompt.includes("Intent Detected: forecast");
    const isEvent = prompt.includes("Intent Detected: weather_event");
    const isGeneral = prompt.includes("Intent Detected: general");

    if (isImpact) {
      const promptUpper = prompt.toUpperCase();
      if (
        promptUpper.includes("DOWNSTREAM_UNESTABLISHED") ||
        promptUpper.includes("MONITORING") ||
        promptUpper.includes("UNLIKELY") ||
        prompt.includes('"groundingStatus": "insufficient_evidence"')
      ) {
        return JSON.stringify({
          answer: "Based on official advisories, direct downstream flood impact on this location is not established by current reports. Authorities are monitoring the situation.",
          groundingStatus: "insufficient_evidence",
          uncertainty: "Downstream hydrological propagation across state/national borders is not confirmed by river gauge or meteorological advisories.",
          keyPoints: ["No direct impact confirmed", "Monitoring status in effect"],
        });
      }

      return JSON.stringify({
        answer: "Verified reports confirm that the hazard currently affects the specified region with high severity. Please follow local disaster authority advisories.",
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["Direct regional impact confirmed", "High severity alert active"],
      });
    }

    if (isForecast) {
      return JSON.stringify({
        answer: "The upcoming forecast indicates varying conditions over the next few days. Please review the 5-day outlook for detailed high/low temperatures and precipitation probabilities.",
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["5-day outlook available", "Precipitation signals tracked"],
      });
    }

    if (isEvent) {
      return JSON.stringify({
        answer: "Active disaster bulletins indicate verified weather hazard activity in the reported region. Emergency and meteorological agencies are providing continuous updates.",
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["Verified event bulletins cited", "Official agency tracking"],
      });
    }

    if (isGeneral) {
      return JSON.stringify({
        answer: "Flash floods are typically caused by intense, heavy rainfall occurring over a short duration, overwhelming local drainage systems and river basins.",
        groundingStatus: "general_knowledge",
        uncertainty: null,
        keyPoints: ["Meteorological mechanism explained", "Educational overview"],
      });
    }

    // Extract location name if available
    const locMatch = prompt.match(/<target_location>[\s\S]*?Name:\s*([^\n]+)/i);
    const locName = locMatch && locMatch[1] ? locMatch[1].trim() : "the requested location";

    // Weather Risk Assessment prompt
    if (prompt.includes("<verified_weather_risk")) {
      const isUnfavorable = prompt.includes('riskLevel="high"') || prompt.includes('riskLevel="critical"');
      const statusText = isUnfavorable ? "caution or postponement" : "favorable conditions";
      return JSON.stringify({
        answer: `Weather risk assessment for ${locName}: Verified meteorological indicators suggest ${statusText} for outdoor activities and travel based on current conditions and forecasts.`,
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["Deterministic risk criteria evaluated", "Activity advisory provided"],
      });
    }

    // Forecast prompt
    if (prompt.includes("<verified_forecast") || prompt.includes("Intent Detected: forecast")) {
      const temporalMatch = prompt.match(/Target Period:\s*([^\n(]+)/i);
      const period = temporalMatch && temporalMatch[1] ? temporalMatch[1].trim() : "upcoming period";
      return JSON.stringify({
        answer: `Weather forecast for ${locName} (${period}): Verified model data reports expected temperatures, precipitation probabilities, and sky conditions.`,
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["Verified forecast data cited", "Precipitation probability included"],
      });
    }

    // If no verified weather data is present in prompt, return insufficient_evidence
    if (!prompt.includes("<verified_weather_data")) {
      return JSON.stringify({
        answer: "No verified weather observations or geographic data could be retrieved for the specified location. Evidence is insufficient to provide live conditions.",
        groundingStatus: "insufficient_evidence",
        uncertainty: "Location coordinates or live observation feeds could not be verified.",
        keyPoints: ["No verified observations available", "Insufficient evidence"],
      });
    }

    // Default current weather
    return JSON.stringify({
      answer: `Current verified weather observations report active conditions for ${locName}. Measurements include temperature, wind speed, and humidity.`,
      groundingStatus: "grounded",
      uncertainty: null,
      keyPoints: ["Live observation data cited", "Observation timestamp verified"],
    });
  }
}
