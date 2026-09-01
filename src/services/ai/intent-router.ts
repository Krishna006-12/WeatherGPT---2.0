/**
 * Deterministic Intent Router.
 * Classifies user messages into structured intent categories without wasteful LLM round-trips.
 *
 * Supported intents:
 * - weather (current conditions)
 * - forecast (future predictions)
 * - weather_event (live disaster/event updates)
 * - impact (cross-location hazard impact assessment)
 * - general (conceptual meteorological knowledge)
 */

import type { IntentCategory } from "@/types/ai";

export interface IntentClassification {
  intent: IntentCategory;
  confidence: number;
  extractedLocation?: string;
  extractedEventKeyword?: string;
  targetImpactLocation?: string;
  isForecastQuery?: boolean;
}

const TEMPORAL_WORDS = [
  "today",
  "tomorrow",
  "yesterday",
  "tonight",
  "now",
  "this week",
  "next week",
  "weekend",
  "kal",
  "aaj",
  "parso",
];

const STOP_WORDS = [
  "the",
  "a",
  "an",
  "us",
  "me",
  "everything",
  "anyone",
  "the region",
  "the area",
  "it",
  "there",
  "here",
  "kya",
  "hai",
  "hoga",
  "par",
  "aur",
];

function sanitizeExtractedLocation(raw?: string): string | undefined {
  if (!raw) return undefined;
  let clean = raw.trim();

  for (const word of TEMPORAL_WORDS) {
    clean = clean.replace(new RegExp(`\\b${word}\\b`, "gi"), " ").trim();
  }

  // Remove common punctuation
  clean = clean.replace(/[?.,!]/g, "").trim();

  // Strip excessive spaces
  clean = clean.replace(/\s+/g, " ").trim();

  if (!clean || STOP_WORDS.includes(clean.toLowerCase()) || clean.length < 2) {
    return undefined;
  }

  return clean;
}

export class IntentRouter {
  /**
   * Classify a natural language user query.
   */
  classify(query: string): IntentClassification {
    const clean = query.trim().toLowerCase();

    // 1. Check for Impact Intent
    // "Will Nepal floods affect UP?", "Is Patna impacted by the flood?", "Nepal flood ka effect UP par kya hai..."
    if (this.isImpactQuery(clean)) {
      const impactTarget = this.extractImpactTargetLocation(clean);
      const generalLocation = this.extractLocation(clean);
      const eventKeyword = this.extractEventKeyword(clean);

      const target = impactTarget || generalLocation;

      return {
        intent: "impact",
        confidence: 0.9,
        extractedLocation: target,
        extractedEventKeyword: eventKeyword,
        targetImpactLocation: target,
      };
    }

    // 2. Check for General/Educational Queries (e.g. "What causes flash floods?", "How do cyclones form?")
    if (this.isGeneralKnowledgeQuery(clean)) {
      return {
        intent: "general",
        confidence: 0.95,
        extractedEventKeyword: this.extractEventKeyword(clean),
      };
    }

    // 3. Check for Live Weather Event queries
    // "What's happening with the Nepal flood?", "Active cyclones in Bay of Bengal", "Latest flood updates"
    if (this.isWeatherEventQuery(clean)) {
      const location = this.extractLocation(clean);
      const eventKeyword = this.extractEventKeyword(clean);

      return {
        intent: "weather_event",
        confidence: 0.85,
        extractedLocation: location,
        extractedEventKeyword: eventKeyword,
      };
    }

    // 4. Check for Forecast queries
    // "Will it rain tomorrow in Kanpur?", "7-day forecast for Delhi", "Forecast for next week"
    if (this.isForecastQuery(clean)) {
      const location = this.extractLocation(clean);

      return {
        intent: "forecast",
        confidence: 0.9,
        extractedLocation: location,
        isForecastQuery: true,
      };
    }

    // 5. Check for Current Weather queries
    // "What's the weather in Kanpur?", "Weather in Kanpur", "Current temperature in London"
    if (this.isWeatherQuery(clean)) {
      const location = this.extractLocation(clean);

      return {
        intent: "weather",
        confidence: 0.9,
        extractedLocation: location,
      };
    }

    // Default fallback: if a location is mentioned, default to weather; else general
    const fallbackLocation = this.extractLocation(clean);
    if (fallbackLocation) {
      return {
        intent: "weather",
        confidence: 0.6,
        extractedLocation: fallbackLocation,
      };
    }

    return {
      intent: "general",
      confidence: 0.5,
    };
  }

  private isImpactQuery(text: string): boolean {
    const impactVerbs = [
      /\b(affect|effect|impacting|impacted|impacts|impact)\b/i,
      /\b(reach|threaten|threatens|threatening|hit|hitting|hits)\b/i,
      /\b(damage|damages|damaging|spread to|spread)\b/i,
      /\b(asar|prabhav|effect hoga|asar hoga|asar padega|asar hai|effect hai)\b/i,
      /\b(flooded from|flooding from|affected by|impacted by|flooded due to)\b/i,
    ];

    const hasImpactVerb = impactVerbs.some((pattern) => pattern.test(text));
    const hasHazard = this.extractEventKeyword(text) !== undefined;

    return hasImpactVerb && (hasHazard || /\b(will|is|can|could|kya)\b/i.test(text));
  }

  private isGeneralKnowledgeQuery(text: string): boolean {
    // If it asks about ongoing event updates, it's not general knowledge
    if (/\b(what('s| is) happening|latest on|latest updates|situation in|status of)\b/i.test(text)) {
      return false;
    }

    const generalStarters = [
      /^(what is|what are|what causes|how do|how does|why do|why does|explain|define|describe)\b/i,
      /\b(difference between|how are .* formed|how is .* formed|meaning of)\b/i,
    ];

    // If it asks "What is the weather in Delhi", that's weather
    if (/\b(weather in|temp in|temperature in|forecast|mausam|weather today|rainfall today)\b/i.test(text)) {
      return false;
    }

    return generalStarters.some((pattern) => pattern.test(text));
  }

  private isWeatherEventQuery(text: string): boolean {
    const eventKeywords = [
      /\b(flood|floods|flooding|flash flood|flash floods)\b/i,
      /\b(cyclone|cyclones|cyclonic|hurricane|typhoon)\b/i,
      /\b(storm|storms|wildfire|wildfires|earthquake|earthquakes)\b/i,
      /\b(landslide|landslides|tsunami|heatwave|cold wave)\b/i,
      /\b(disaster|alert|bulletin|warning|evacuation)\b/i,
    ];

    const updatePatterns = [
      /\b(what('s| is) happening (with|in))\b/i,
      /\b(latest (on|updates|news)|situation in|status of)\b/i,
    ];

    const hasEventWord = eventKeywords.some((pattern) => pattern.test(text));
    const hasUpdateWord = updatePatterns.some((pattern) => pattern.test(text));

    if (hasUpdateWord && hasEventWord) return true;

    return hasEventWord && !/\b(tomorrow|next week|forecast|weather in)\b/i.test(text);
  }

  private isForecastQuery(text: string): boolean {
    const forecastKeywords = [
      /\b(tomorrow|kal|parso|next week|weekend|upcoming|days ahead)\b/i,
      /\b(forecast|hourly|daily|extended forecast|outlook)\b/i,
      /\b(will it rain|going to rain|chances of rain|probability of rain)\b/i,
      /\b(will it snow|will it storm|rain expected)\b/i,
    ];

    return forecastKeywords.some((pattern) => pattern.test(text));
  }

  private isWeatherQuery(text: string): boolean {
    const weatherKeywords = [
      /\b(weather|temperature|temp|humidity|wind speed|feels like)\b/i,
      /\b(how hot|how cold|is it raining|is it sunny|is it cloudy)\b/i,
      /\b(current weather|today's weather|mausam|aaj ka mausam)\b/i,
      /\b(weather in|temp in|temperature in)\b/i,
    ];

    return weatherKeywords.some((pattern) => pattern.test(text));
  }

  /**
   * Extract target location mentioned in query.
   */
  extractLocation(text: string): string | undefined {
    const locationRegexes = [
      /\b(?:in|for|at|around|near|across)\s+([a-zA-Z\s]+?)(?:\?|\.|\,| tomorrow| today| yesterday| next week| aur | and |$)/i,
      /\b(?:weather in|temp in|forecast for|mausam in)\s+([a-zA-Z\s]+?)(?:\?|\.|\,|$)/i,
      /\b([a-zA-Z]+)\s+mein\s+(?:kal|aaj|parso)?\s*(?:weather|mausam|rain|baarish)?\b/i,
      /\b([a-zA-Z]+)\s+(?:weather|temperature|forecast|mausam)\b/i,
    ];

    for (const regex of locationRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const candidate = sanitizeExtractedLocation(match[1]);
        if (candidate) {
          return candidate;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract impact target location (e.g. "Will Nepal floods affect UP/Kanpur/Bihar?" -> "UP" / "Kanpur" / "Bihar").
   */
  private extractImpactTargetLocation(text: string): string | undefined {
    const targetPatterns = [
      /\b(?:is|will|can|could)\s+([a-zA-Z\s]+?)\s+(?:impacted|affected|hit|threatened|facing|flooded|submerged)\b/i,
      /\b(?:affect|impacting|impact|hit|hitting|reach|threatening|threaten|damage)\s+([a-zA-Z\s]+?)(?:\s+(?:today|tomorrow|now|soon)|\?|\.|$)/i,
      /\b(?:effect on|impact on|asar on|effect in|impact in|asar in)\s+([a-zA-Z\s]+?)(?:\s+(?:par|aur|mein)|\?|\.|$)/i,
      /\b(?:effect|asar)\s+([a-zA-Z\s]+?)\s+par\b/i,
      /\b([a-zA-Z\s]+?)\s+par\s+(?:effect|asar|kya asar|kya effect)\b/i,
      /\b([a-zA-Z\s]+?)\s+(?:par effect|par asar|ko affect)\b/i,
    ];

    for (const pattern of targetPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = sanitizeExtractedLocation(match[1]);
        if (candidate) {
          return candidate;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract event/hazard keyword (e.g. "nepal flood" -> "flood", "cyclone dana" -> "cyclone").
   */
  private extractEventKeyword(text: string): string | undefined {
    const hazards = [
      "flash flood",
      "flood",
      "cyclone",
      "hurricane",
      "typhoon",
      "storm",
      "wildfire",
      "earthquake",
      "landslide",
      "tsunami",
      "heatwave",
      "cold wave",
      "drought",
    ];

    for (const hazard of hazards) {
      if (text.toLowerCase().includes(hazard)) {
        return hazard;
      }
    }

    return undefined;
  }
}

export const globalIntentRouter = new IntentRouter();
