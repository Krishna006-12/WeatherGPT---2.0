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
import type { ActivityType } from "@/types/activity";

export interface IntentClassification {
  intent: IntentCategory;
  intents: IntentCategory[];
  confidence: number;
  extractedLocation?: string;
  extractedEventKeyword?: string;
  targetImpactLocation?: string;
  extractedCrop?: CropType;
  extractedActivity?: AgricultureActivityType;
  isForecastQuery?: boolean;
  isRiskQuery?: boolean;
  isConsensusQuery: boolean;
  isActivityQuery: boolean;
  activityCategory?: ActivityType;
  activityType?: "outdoor_work" | "travel" | "general";
  isFollowUp?: boolean;
  isVoiceQuery?: boolean;
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
  "risk",
  "risks",
  "weather risk",
  "hazard",
  "hazards",
  "voice",
  "audio",
  "briefing",
  "spoken",
  "speak",
  "listen",
  "read",
  "sunao",
  "bolkar",
  "boliye",
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
    const isVoice = this.isVoiceQuery(clean);
    const result = this.classifyInternal(clean);
    return {
      ...result,
      isVoiceQuery: isVoice,
    };
  }

  private classifyInternal(clean: string): IntentClassification {
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
        intents: ["agriculture"],
        confidence: 0.9,
        extractedLocation: location,
        extractedCrop, // Never assume a crop if the user did not provide one
        extractedActivity,
        isForecastQuery: isFuture,
        isRiskQuery: true,
        isConsensusQuery: false,
        isActivityQuery: false,
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
        intents: ["impact"],
        confidence: 0.9,
        extractedLocation: target,
        extractedEventKeyword: eventKeyword,
        targetImpactLocation: target,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // 3. Check for NWP Model Consensus / Forecast Confidence Intent
    // "How confident is this forecast?", "Do models agree on rain?", "What is the ECMWF vs GFS consensus?"
    if (this.isConsensusQuery(clean)) {
      const cleanForLoc = clean.replace(
        /\b(?:model|models|consensus|agreement|divergence|spread|ecmwf|gfs|icon|nwp|ensemble|accuracy|reliable|reliability|certainty|confident|confidence|agree|kar\s+rahe\s+hain|difference|kitna|kya|hai|vs)\b/gi,
        " "
      );
      const location = this.extractLocation(cleanForLoc) || this.extractLocation(clean);
      const isFuture = /\b(tomorrow|next week|weekend|next 24|next 48|kal|parso)\b/i.test(clean);

      return {
        intent: "consensus",
        intents: ["consensus"],
        confidence: 0.9,
        extractedLocation: location,
        isForecastQuery: isFuture,
        isConsensusQuery: true,
        isActivityQuery: false,
      };
    }

    // 4. Check for Activity Suitability / Decision Intelligence Intent
    // "Can I go running today?", "Is road travel safe to Jaipur?", "Best time for kids to play sports outside?", "Outdoor construction tomorrow"
    if (this.isActivityQuery(clean)) {
      const extractedCategory = this.extractActivityCategory(clean);
      const cleanForLoc = clean.replace(
        /\b(?:can\s+i|is\s+it\s+safe\s+to|best\s+time\s+to|suitability\s+for|weather\s+for|safe\s+for|should\s+i|good\s+for|kya|hai|safe|go|running|jogging|run|cycling|cycle|commute|driving|drive|travel|outdoor\s+construction|construction\s+work|construction|building\s+work|site\s+work|outdoor\s+work|outdoor\s+labor|school\s+sports|children\s+play|kids\s+play|sports|cricket|picnic|event|gathering|today|tomorrow|aaj|kal|shaam|morning|afternoon)\b/gi,
        " "
      );
      const location = this.extractLocation(cleanForLoc) || this.extractLocation(clean);
      const isFuture = /\b(tomorrow|next week|weekend|next 24|next 48|kal|parso)\b/i.test(clean);

      return {
        intent: "activity",
        intents: ["activity"],
        confidence: 0.92,
        extractedLocation: location,
        isForecastQuery: isFuture,
        isRiskQuery: true,
        isConsensusQuery: false,
        isActivityQuery: true,
        activityCategory: extractedCategory,
        activityType:
          extractedCategory === "travel_road"
            ? "travel"
            : extractedCategory === "outdoor_work"
            ? "outdoor_work"
            : "general",
      };
    }

    // 5. Check for General/Educational Queries (e.g. "What causes flash floods?", "How do cyclones form?")
    if (this.isGeneralKnowledgeQuery(clean)) {
      return {
        intent: "general",
        intents: ["general"],
        confidence: 0.95,
        extractedEventKeyword: this.extractEventKeyword(clean),
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // 6. Check for Weather Risk / Activity Assessment Intent
    // "Is tomorrow good for outdoor work?", "Is it safe to go outside?", "Will there be heavy rain?", "Is there flood risk?"
    if (this.isRiskQuery(clean)) {
      const cleanForLoc = clean
        .replace(
          /\b(?:is\s+it\s+)?(?:good\s+for|safe\s+to|safe\s+for|should\s+i)?\s*(?:outdoor\s+work|work\s+outside|outside|travel|drive|trip|weather\s+risk|risk|baarish\s+ka\s+risk|barish\s+ka\s+risk|bahar\s+kaam\s+karna\s+safe\s+hai|kaam\s+karna\s+safe\s+hai|kya\s+hai|kitna\s+hai|heavy\s+rain|thunderstorm|wind|flood)\b/gi,
          " "
        )
        .replace(/\s+/g, " ")
        .trim();
      const location = this.extractLocation(cleanForLoc) || this.extractLocation(clean);
      const isFuture = /\b(tomorrow|next week|weekend|next 24|next 48|kal|parso|will there be|how strong will)\b/i.test(clean);
      const activityType: "outdoor_work" | "travel" | "general" =
        /\b(travel|road|drive|trip|driving)\b/i.test(clean)
          ? "travel"
          : /\b(outdoor work|work outside|construction|fieldwork|outdoor|kaam karna|bahar kaam)\b/i.test(clean)
          ? "outdoor_work"
          : "general";

      const matchedIntent: IntentCategory = isFuture ? "forecast" : "weather";
      return {
        intent: matchedIntent,
        intents: [matchedIntent],
        confidence: 0.9,
        extractedLocation: location,
        isForecastQuery: isFuture,
        isRiskQuery: true,
        isConsensusQuery: false,
        isActivityQuery: false,
        activityType,
      };
    }

    // 7. Check for Live Weather Event queries
    // "What's happening with the Nepal flood?", "Active cyclones in Bay of Bengal", "Latest flood updates"
    if (this.isWeatherEventQuery(clean)) {
      const location = this.extractLocation(clean);
      const eventKeyword = this.extractEventKeyword(clean);

      return {
        intent: "weather_event",
        intents: ["weather_event"],
        confidence: 0.85,
        extractedLocation: location,
        extractedEventKeyword: eventKeyword,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // 8. Check for pure follow-up queries (e.g. "Tomorrow?", "Will it rain?", "And the temperature?")
    if (this.isFollowUpQuery(clean)) {
      const isForecast = /\b(tomorrow|next week|rain|will it rain|weekend)\b/i.test(clean);
      const matchedIntent: IntentCategory = isForecast ? "forecast" : "weather";
      return {
        intent: matchedIntent,
        intents: [matchedIntent],
        confidence: 0.85,
        isForecastQuery: isForecast,
        isFollowUp: true,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // 9. Check for Forecast queries
    // "Will it rain tomorrow in Kanpur?", "7-day forecast for Delhi", "Forecast for next week"
    if (this.isForecastQuery(clean)) {
      const location = this.extractLocation(clean);

      return {
        intent: "forecast",
        intents: ["forecast"],
        confidence: 0.9,
        extractedLocation: location,
        isForecastQuery: true,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // 10. Check for Current Weather queries
    // "What's the weather in Kanpur?", "Weather in Kanpur", "Current temperature in London"
    if (this.isWeatherQuery(clean)) {
      const location = this.extractLocation(clean);

      return {
        intent: "weather",
        intents: ["weather"],
        confidence: 0.9,
        extractedLocation: location,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    // Default fallback: if a location is mentioned, default to weather; else general
    const fallbackLocation = this.extractLocation(clean);
    if (fallbackLocation) {
      return {
        intent: "weather",
        intents: ["weather"],
        confidence: 0.6,
        extractedLocation: fallbackLocation,
        isConsensusQuery: false,
        isActivityQuery: false,
      };
    }

    return {
      intent: "general",
      intents: ["general"],
      confidence: 0.5,
      isConsensusQuery: false,
      isActivityQuery: false,
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
    // If it asks about consensus or model confidence, it is not general knowledge
    if (this.isConsensusQuery(text)) {
      return false;
    }

    // If it asks about activity suitability, it is not general knowledge
    if (this.isActivityQuery(text)) {
      return false;
    }

    // If it asks for voice/audio briefing, it is not general knowledge
    if (this.isVoiceQuery(text)) {
      return false;
    }

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

  private isConsensusQuery(text: string): boolean {
    const consensusPatterns = [
      /\b(?:model|models)\s+(?:consensus|agree|agreement|divergence|spread|disagreement)\b/i,
      /\b(?:forecast|model)\s+agreement\b/i,
      /\b(?:weather\s+models|forecast\s+models)\b/i,
      /\bwhich\s+(?:weather\s+)?models\s+agree\b/i,
      /\b(?:ecmwf|gfs|icon|nwp|multi-model|ensemble forecast|ensemble mean|ensemble spread)\b/i,
      /\bhow\s+(?:confident|reliable|accurate|certain)\b.*\b(?:forecast|prediction)\b/i,
      /\b(?:weather\s+)?forecast\s+(?:confidence|certainty|reliability|accuracy)\b/i,
      /\b(?:do\s+(?:the\s+)?(?:weather\s+)?models\s+agree|are\s+models\s+in\s+agreement)\b/i,
      /\bcompare\s+(?:ecmwf|gfs|icon|models)\b/i,
      /\b(?:ecmwf|gfs|icon)\s+(?:vs|and|aur)\s+(?:ecmwf|gfs|icon)\b/i,
      // Hindi / Hinglish consensus patterns
      /\bkya\s+models\s+(?:me\s+|mein\s+)?(?:agree|consensus|agreement)\b/i,
      /\bmodels\s+(?:me\s+|mein\s+)?consensus\b/i,
      /\bmodels\s+agree\s+kar\s+rahe\b/i,
      /\bforecast\s+kitna\s+(?:reliable|accurate)\b/i,
      /\bkitna\s+sure\s+hai\s+forecast\b/i,
      /\bforecast\s+kitna\s+sure\s+hai\b/i,
      /\b(?:farak|difference)\s+(?:hai|kya\s+hai)\b/i,
      /\bforecast\s+confidence\s+kya\s+hai\b/i,
      /\bmodels\s+kya\s+keh\s+rahe\b/i,
    ];
    return consensusPatterns.some((pattern) => pattern.test(text));
  }

  private isActivityQuery(text: string): boolean {
    if (this.isAgricultureQuery(text)) {
      return false;
    }

    const activityPatterns = [
      /\b(?:running|jogging|jog|run|cycling|cycle|bike ride|biking)\b/i,
      /\b(?:commute|daily commute|drive to work|office travel|road travel|highway travel|road trip|long drive|driving safe)\b/i,
      /\b(?:outdoor\s+construction|construction\s+work|construction|building\s+work|site\s+work|civil\s+work|roof\s+work|roofing|painting\s+work|outdoor\s+labor(?:\/work)?|outdoor\s+labour|manual\s+labor|manual\s+labour)\b/i,
      /\b(?:good\s+for|safe\s+for|safe\s+to|best\s+time\s+for|suitable\s+for)\s+(?:outdoor\s+construction|construction\s+work|construction|building\s+work|site\s+work|civil\s+work|roof\s+work|roofing|outdoor\s+labor|outdoor\s+labour|manual\s+labor)\b/i,
      /\b(?:school sports|children play|kids play|playground|recess|sports day|cricket match|football match)\b/i,
      /\b(?:outdoor event|outdoor party|wedding outdoors|picnic|outdoor dining|barbecue|bbq)\b/i,
      /\b(?:best time to (?:run|cycle|travel|drive|work outside|go outside|play))\b/i,
      /\b(?:is it safe to (?:run|cycle|travel|drive|play outside|commute))\b/i,
      /\b(?:activity suitability|weather suitability)\b/i,
      // Hindi / Hinglish activity patterns
      /\bkya (?:running|cycling|travel|driving|bahar khelna) safe hai\b/i,
      /\b(?:travel karne ke liye|driving ke liye|running ke liye|bahar khelne ke liye)\b/i,
      /\b(?:aaj|kal|shaam ko|subah) (?:running|cycling|travel|driving)\b/i,
    ];

    return activityPatterns.some((pattern) => pattern.test(text));
  }

  private extractActivityCategory(text: string): ActivityType {
    if (/\b(?:running|jogging|jog|run|cycling|cycle|biking)\b/i.test(text)) {
      return "running_cycling";
    }
    if (/\b(?:school|children|kids|playground|recess|sports|cricket|football)\b/i.test(text)) {
      return "school_sports";
    }
    if (
      /\b(?:construction|building\s+work|site\s+work|civil\s+work|field\s+work|roof|roofing|painting|labor|labour|outdoor\s+labor|outdoor\s+labour|work\s+outside|outside\s+work|bahar\s+kaam)\b/i.test(
        text
      )
    ) {
      return "outdoor_work";
    }
    if (/\b(?:commute|metro|bus|traffic|office travel)\b/i.test(text)) {
      return "commute";
    }
    if (/\b(?:event|party|wedding|marriage|picnic|dining|gathering|bbq)\b/i.test(text)) {
      return "outdoor_events";
    }
    if (/\b(?:travel|road|highway|driving|drive|trip|car travel)\b/i.test(text)) {
      return "travel_road";
    }
    return "running_cycling";
  }

  private isRiskQuery(text: string): boolean {
    const riskPatterns = [
      /\b(weather risk|risk tomorrow|risk today|risk factor)\b/i,
      /\b(safe to work outside|work outside tomorrow|work outside safe|safe for outdoor|safe to go outside|good for outdoor work|outdoor work|safe outside|should i travel|travel tomorrow|safe to travel|safe for travel)\b/i,
      /\b(can i go out|is it safe outside|is it safe to travel|good for travel)\b/i,
      /\b(travel safe|outdoor safe|work outside safe)\b/i,
      /\b(heavy rain|heavy rainfall|torrential rain)\b/i,
      /\b(thunderstorm risk|thunderstorm|lightning risk)\b/i,
      /\b(how strong (will|is) the wind|wind risk|strong wind)\b/i,
      /\b(flood risk|flooding risk|is there (a )?flood risk|any flood risk)\b/i,
      // Hindi / Hinglish risk patterns
      /\b(bahar kaam karna safe|kaam karna safe hai|bahar kaam|bahar safe)\b/i,
      /\b(baarish ka risk|barish ka risk|baarish risk|risk kitna hai|risk kya hai)\b/i,
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
      /\b(voice briefing|audio briefing|voice update|audio update|audio summary)\b/i,
      /\b(boliye mausam|sunao|bolkar bataiye)\b/i,
    ];

    return weatherKeywords.some((pattern) => pattern.test(text));
  }

  /**
   * Check if query requests voice briefing or spoken output.
   */
  isVoiceQuery(text: string): boolean {
    const voiceTerms = [
      /\b(?:voice\s+briefing|audio\s+briefing|spoken\s+briefing|voice\s+update|audio\s+update|audio\s+summary|voice\s+report)\b/i,
      /\b(?:speak\s+the\s+weather|read\s+out|read\s+to\s+me|read\s+me|listen\s+to\s+(?:the\s+)?weather|speak\s+to\s+me)\b/i,
      /\b(?:bolkar\s+batao|bolkar\s+bataiye|sunao|boliye\s+mausam|aawaz\s+me|aawaz\s+mein)\b/i,
    ];
    return voiceTerms.some((pattern) => pattern.test(text));
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
      /\b([a-zA-Z0-9\s\-_]+?)\s+mein(?::|\s+|$|\?|\.|\,)\s*(?:kal|aaj|parso)?\s*(?:weather|mausam|rain|baarish)?(?:\b|$|\?|\.|\,)/i,
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
      /\b(outdoor field work|field work|fieldwork|khet ka kaam|farm work)\b/i,
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
