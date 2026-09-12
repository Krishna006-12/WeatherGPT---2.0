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
import type { CropType, AgricultureActivityType } from "@/types/agriculture";

export interface IntentClassification {
  intent: IntentCategory;
  confidence: number;
  extractedLocation?: string;
  extractedEventKeyword?: string;
  targetImpactLocation?: string;
  extractedCrop?: CropType;
  extractedActivity?: AgricultureActivityType;
  isForecastQuery?: boolean;
  isRiskQuery?: boolean;
  activityType?: "outdoor_work" | "travel" | "general";
  isFollowUp?: boolean;
}

const TEMPORAL_WORDS = [
  "right now",
  "right-now",
  "currently",
  "this morning",
  "this afternoon",
  "this evening",
  "tomorrow morning",
  "tomorrow afternoon",
  "tomorrow evening",
  "tomorrow night",
  "next 24 hours",
  "next 48 hours",
  "24 hours",
  "48 hours",
  "coming day",
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
  "outside",
  "right",
  "hourly",
  "daily",
  "weekly",
  "7-day",
  "7 day",
  "5-day",
  "5 day",
  "day",
  "days",
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
  "current",
  "live",
  "latest",
  "kya",
  "hai",
  "hoga",
  "par",
  "aur",
  "ke",
  "liye",
  "ka",
  "ki",
  "ko",
  "se",
  "mein",
  "weather",
  "temperature",
  "temp",
  "forecast",
  "mausam",
  "what",
  "is",
  "whats",
  "what's",
  "how",
  "hows",
  "how's",
  "will",
  "tell",
  "show",
  "give",
  "check",
  "get",
  "over",
  "about",
  "good",
  "for",
  "safe",
  "to",
  "go",
  "travel",
  "should",
  "outside",
  "outdoor",
  "work",
  "fieldwork",
  "construction",
  "detailed",
  "hourly",
  "daily",
  "weekly",
  "day",
  "days",
  "crop",
  "crops",
  "farming",
  "farm",
  "agriculture",
  "agricultural",
  "fasal",
  "kheti",
  "irrigation",
  "irrigate",
  "sinchai",
  "paani",
  "spraying",
  "spray",
  "pesticide",
  "pesticides",
  "fungicide",
  "foliar",
  "insecticide",
  "chhidkav",
  "dawai",
  "harvesting",
  "harvest",
  "cutting",
  "reaping",
  "katai",
  "sowing",
  "sow",
  "planting",
  "plant",
  "seeding",
  "bone",
  "buvai",
  "wheat",
  "gehun",
  "rice",
  "paddy",
  "dhan",
  "maize",
  "corn",
  "makka",
  "potato",
  "potatoes",
  "aloo",
  "mustard",
  "sarson",
  "precautions",
  "precaution",
  "your location",
  "my location",
  "current location",
  "the location",
  "this location",
  "location",
  "locations",
];

function sanitizeExtractedLocation(raw?: string): string | undefined {
  if (!raw) return undefined;
  let clean = raw.trim();

  for (const word of TEMPORAL_WORDS) {
    clean = clean.replace(new RegExp(`\\b${word}\\b`, "gi"), " ").trim();
  }

  // Remove common punctuation
  clean = clean.replace(/[?.,!;:'"]/g, "").trim();

  // Strip excessive spaces
  clean = clean.replace(/\s+/g, " ").trim();

  if (!clean || clean.length < 2) {
    return undefined;
  }

  if (
    STOP_WORDS.includes(clean.toLowerCase()) ||
    /^(?:your|my|current|the|this)\s+location$/i.test(clean)
  ) {
    return undefined;
  }

  // Check if every word in the candidate is a stop word
  const words = clean.split(/\s+/);
  if (words.every((w) => STOP_WORDS.includes(w.toLowerCase()))) {
    return undefined;
  }

  // Strip leading stop words (e.g. "the London" -> "London", "over Nepal" -> "Nepal")
  while (words.length > 0 && words[0] && STOP_WORDS.includes(words[0].toLowerCase())) {
    words.shift();
  }
  // Strip trailing stop words
  while (words.length > 0 && words[words.length - 1] && STOP_WORDS.includes(words[words.length - 1]!.toLowerCase())) {
    words.pop();
  }

  clean = words.join(" ").trim();

  if (
    !clean ||
    clean.length < 2 ||
    STOP_WORDS.includes(clean.toLowerCase()) ||
    /^(?:your|my|current|the|this)\s+location$/i.test(clean)
  ) {
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

    // 1. Check for Agriculture Intent
    // "Is tomorrow safe to spray wheat in Kanpur?", "Can I irrigate my rice field?", "Will rain affect wheat harvesting?"
    if (this.isAgricultureQuery(clean)) {
      const extractedCrop = this.extractCrop(clean);
      const extractedActivity = this.extractActivity(clean);
      const cleanForLoc = clean.replace(
        /\b(?:wheat|gehun|rice|paddy|dhan|maize|corn|makka|potato|potatoes|aloo|mustard|sarson|crop|crops|field|farming|farm|agriculture|agricultural|fasal|kheti|irrigation|spraying|spray|pesticide|pesticides|fungicide|insecticide|fertilizer|harvesting|harvest|sowing|sow|planting|plant|seed|seeding|outdoor|precautions|precaution|weather|mausam|affect|impact)\b/gi,
        " "
      );
      const location = this.extractLocation(cleanForLoc);
      const isFuture = /\b(tomorrow|next week|weekend|next 24|next 48|kal|parso)\b/i.test(clean);

      return {
        intent: "agriculture",
        confidence: 0.9,
        extractedLocation: location,
        extractedCrop, // Never assume a crop if the user did not provide one
        extractedActivity,
        isForecastQuery: isFuture,
        isRiskQuery: true,
      };
    }

    // 2. Check for Impact Intent
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

    // 3. Check for General/Educational Queries (e.g. "What causes flash floods?", "How do cyclones form?")
    if (this.isGeneralKnowledgeQuery(clean)) {
      return {
        intent: "general",
        confidence: 0.95,
        extractedEventKeyword: this.extractEventKeyword(clean),
      };
    }

    // 4. Check for Live Weather Event queries
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

    // 5. Check for Weather Risk / Activity Assessment Intent
    // "Is tomorrow good for outdoor work?", "Is it safe to go outside?", "Should I travel tomorrow?"
    if (this.isRiskQuery(clean)) {
      const cleanForLoc = clean.replace(
        /\b(?:is\s+it\s+)?(?:good\s+for|safe\s+to|safe\s+for|should\s+i)?\s*(?:outdoor\s+work|work\s+outside|outside|travel|drive|trip)\b/gi,
        " "
      );
      const location = this.extractLocation(cleanForLoc) || this.extractLocation(clean);
      const isFuture = /\b(tomorrow|next week|weekend|next 24|next 48|kal|parso)\b/i.test(clean);
      const activityType: "outdoor_work" | "travel" | "general" =
        /\b(travel|road|drive|trip|driving)\b/i.test(clean)
          ? "travel"
          : /\b(outdoor work|work outside|construction|fieldwork|outdoor)\b/i.test(clean)
          ? "outdoor_work"
          : "general";

      return {
        intent: isFuture ? "forecast" : "weather",
        confidence: 0.9,
        extractedLocation: location,
        isForecastQuery: isFuture,
        isRiskQuery: true,
        activityType,
      };
    }

    // 5. Check for pure follow-up queries (e.g. "Tomorrow?", "Will it rain?", "And the temperature?")
    if (this.isFollowUpQuery(clean)) {
      const isForecast = /\b(tomorrow|next week|rain|will it rain|weekend)\b/i.test(clean);
      return {
        intent: isForecast ? "forecast" : "weather",
        confidence: 0.85,
        isForecastQuery: isForecast,
        isFollowUp: true,
      };
    }

    // 6. Check for Forecast queries
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

    // 7. Check for Current Weather queries
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
    const hasHazard =
      this.extractEventKeyword(text) !== undefined ||
      /\b(disaster|event|crisis|emergency|storm|flood)\b/i.test(text);

    return (
      hasImpactVerb &&
      (hasHazard || /\b(will|is|can|could|would|does|do|did|might|may|kya)\b/i.test(text))
    );
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

    // If it asks about weather, conditions, or forecast, it's not a general knowledge query
    if (
      /\b(weather|temperature|temp|humidity|forecast|mausam|rainfall|rain today|rain tomorrow)\b/i.test(
        text
      )
    ) {
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

  private isFollowUpQuery(text: string): boolean {
    const followUpPatterns = [
      /^(?:tomorrow|kal|tonight|next week|this weekend)\??$/i,
      /^(?:will it rain|is it going to rain|rain expected|any rain|chances of rain)\??$/i,
      /^(?:and the weather|what about the weather|and temperature|what's the temperature)\??$/i,
      /^(?:how about tomorrow|what about tomorrow|and tomorrow)\??$/i,
    ];
    return followUpPatterns.some((pattern) => pattern.test(text.trim()));
  }

  private isRiskQuery(text: string): boolean {
    const riskPatterns = [
      /\b(safe to go outside|good for outdoor work|outdoor work|safe outside|should i travel|travel tomorrow|safe to travel|safe for travel)\b/i,
      /\b(safe for outdoor|can i go out|is it safe outside|is it safe to travel|good for travel)\b/i,
      /\b(travel safe|outdoor safe|work outside safe)\b/i,
    ];
    return riskPatterns.some((pattern) => pattern.test(text));
  }

  private isForecastQuery(text: string): boolean {
    const forecastKeywords = [
      /\b(tomorrow|kal|parso|next week|weekend|upcoming|days ahead|next 24|next 48|48 hours|24 hours)\b/i,
      /\b(forecast|extended forecast|outlook)\b/i,
      /\b(will it rain|going to rain|chances of rain|probability of rain|rain today|rain tomorrow)\b/i,
      /\b(will it snow|will it storm|rain expected)\b/i,
    ];

    if (forecastKeywords.some((pattern) => pattern.test(text))) {
      return true;
    }

    // "hourly" or "daily" without explicit "weather", "temperature", or "mausam" is treated as forecast progression
    // e.g. "Hourly forecast", "Hourly for Kanpur", "Hourly outlook"
    // whereas "Hourly weather in Kanpur" explicitly asks for weather conditions
    if (/\b(hourly|daily)\b/i.test(text)) {
      if (!/\b(weather|temperature|temp|mausam)\b/i.test(text)) {
        return true;
      }
    }

    return false;
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
      // "what about London", "how about Kanpur", "what about Nepal"
      /\b(?:what\s+about|how\s+about|and\s+for|and\s+in)\s+([a-zA-Z0-9\s\-_]+?)(?:\?|\.|\,|!|;|\b(?:right\s+now|currently|tomorrow|today|now)\b|$)/i,
      // Prepositional phrases: "over in Nepal today", "in New Delhi?", "for London", "at Mumbai", "across Bihar", "near Delhi"
      /\b(?:over\s+in|over\s+at|in|for|at|around|near|across|of)\s+([a-zA-Z0-9\s\-_]+?)(?:\?|\.|\,|!|;|\b(?:right\s+now|currently|tomorrow|today|yesterday|tonight|next\s+week|this\s+week|weekend|kal|aaj|parso|now|aur|and)\b|$)/i,
      // "weather in London", "temp in New Delhi", "forecast for Delhi"
      /\b(?:weather\s+in|temp\s+in|temperature\s+in|forecast\s+for|mausam\s+in)\s+([a-zA-Z0-9\s\-_]+?)(?:\?|\.|\,|!|;|\b(?:right\s+now|currently|tomorrow|today|now)\b|$)/i,
      // "weather London", "forecast Tokyo"
      /\b(?:weather|forecast|temperature|temp|mausam)\s+([a-zA-Z0-9\s\-_]+?)(?:\?|\.|\,|!|;|\b(?:right\s+now|currently|tomorrow|today|now)\b|$)/i,
      // Hinglish: "Kanpur mein kal mausam", "Kanpur mein: Ignore..."
      /\b([a-zA-Z0-9\s\-_]+?)\s+mein(?::|\s+|$|\?|\.|\,)\s*(?:kal|aaj|parso)?\s*(?:weather|mausam|rain|baarish)?\b/i,
      // "London weather", "New Delhi forecast" (excluding temporal/stop words)
      /\b(?!hourly\b|daily\b|weekly\b|today\b|tomorrow\b|current\b|live\b|detailed\b|forecast\b|weather\b)([a-zA-Z0-9\s\-_]+?)\s+(?:weather|temperature|forecast|mausam)\b/i,
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
      /\b(?:is|will|can|could)\s+([a-zA-Z0-9\s\-_]+?)\s+(?:impacted|affected|hit|threatened|facing|flooded|submerged)\b/i,
      /\b(?:affect|impacting|impact|hit|hitting|reach|threatening|threaten|damage)\s+([a-zA-Z0-9\s\-_]+?)(?:\s+(?:today|tomorrow|now|soon)|\?|\.|$)/i,
      /\b(?:effect on|impact on|asar on|effect in|impact in|asar in)\s+([a-zA-Z0-9\s\-_]+?)(?:\s+(?:par|aur|mein)|\?|\.|$)/i,
      /\b(?:effect|asar)\s+([a-zA-Z0-9\s\-_]+?)\s+par\b/i,
      /\b([a-zA-Z0-9\s\-_]+?)\s+par\s+(?:effect|asar|kya asar|kya effect)\b/i,
      /\b([a-zA-Z0-9\s\-_]+?)\s+(?:par effect|par asar|ko affect)\b/i,
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
      "disaster",
    ];

    for (const hazard of hazards) {
      if (text.toLowerCase().includes(hazard)) {
        return hazard;
      }
    }

    return undefined;
  }

  /**
   * Check if query contains agricultural/crop keywords.
   */
  private isAgricultureQuery(text: string): boolean {
    const agriTerms = [
      /\b(crop|crops|farming|farm|agriculture|agricultural|fasal|kheti)\b/i,
      /\b(irrigation|irrigate|watering|sinchai|paani)\b/i,
      /\b(spraying|spray|pesticide|pesticides|fungicide|foliar|insecticide|chhidkav|dawai|fertilizer|fertilizers)\b/i,
      /\b(harvest|harvesting|sowing|sow|planting|plant|cutting|katai|buvai|bone|seed|seeding)\b/i,
      /\b(wheat|gehun|rice|paddy|dhan|maize|corn|makka|potato|potatoes|aloo|mustard|sarson)\b/i,
      /\b(field work|outdoor field work|fieldwork|khet ka kaam|outdoor work)\b/i,
      /\b(precautions for wheat|precautions for rice|precautions for crop|precautions for farming)\b/i,
    ];
    return agriTerms.some((pattern) => pattern.test(text));
  }

  /**
   * Extract targeted agricultural activity from query.
   */
  extractActivity(text: string): AgricultureActivityType | undefined {
    if (/\b(irrigation|irrigate|watering|sinchai|paani)\b/i.test(text)) {
      return "irrigation";
    }
    if (/\b(spraying|spray|pesticide|pesticides|fungicide|foliar|insecticide|chhidkav|dawai)\b/i.test(text)) {
      return "spraying";
    }
    if (/\b(sowing|sow|planting|plant|seeding|bone|buvai)\b/i.test(text)) {
      return "sowing";
    }
    if (/\b(harvesting|harvest|cutting|reaping|katai)\b/i.test(text)) {
      return "harvesting";
    }
    if (/\b(outdoor field work|outdoor work|field work|fieldwork|field operations|khet ka kaam)\b/i.test(text)) {
      return "outdoor_field_work";
    }
    return undefined;
  }

  /**
   * Extract target crop from user text.
   */
  private extractCrop(text: string): CropType | undefined {
    if (/\b(wheat|gehun)\b/i.test(text)) return "wheat";
    if (/\b(rice|paddy|dhan)\b/i.test(text)) return "rice";
    if (/\b(maize|corn|makka)\b/i.test(text)) return "maize";
    if (/\b(potato|potatoes|aloo)\b/i.test(text)) return "potato";
    if (/\b(mustard|sarson)\b/i.test(text)) return "mustard";
    return undefined;
  }
}

export const globalIntentRouter = new IntentRouter();
