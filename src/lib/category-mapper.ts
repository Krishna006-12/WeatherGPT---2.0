/**
 * Deterministic weather event category classifier.
 * Maps article titles and excerpts to the 19 standard EventCategory values.
 * No LLMs are used — categorization is explainable and rule-based.
 */

import type { EventCategory } from "@/types/events";

interface CategoryRule {
  category: EventCategory;
  patterns: RegExp[];
  priority: number; // Higher number = higher priority
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "tsunami",
    patterns: [/\btsunami(s)?\b/i, /\btidal\s*wave(s)?\b/i],
    priority: 100,
  },
  {
    category: "volcanic",
    patterns: [/\bvolcano\b/i, /\bvolcanic\s*(eruption|ash)?\b/i, /\blava\b/i],
    priority: 95,
  },
  {
    category: "earthquake",
    patterns: [/\bearthquake(s)?\b/i, /\bquake(s)?\b/i, /\btremor(s)?\b/i, /\bseismic\b/i, /\brichter\b/i],
    priority: 90,
  },
  {
    category: "cyclone",
    patterns: [/\bcyclone(s)?\b/i, /\bcyclonic\b/i, /\btyphoon(s)?\b/i, /\bhurricane(s)?\b/i],
    priority: 85,
  },
  {
    category: "tropical_storm",
    patterns: [/\btropical\s*storm(s)?\b/i, /\btropical\s*depression\b/i],
    priority: 80,
  },
  {
    category: "flash_flood",
    patterns: [/\bflash\s*flood(s|ing)?\b/i, /\bcloudburst(s)?\b/i],
    priority: 75,
  },
  {
    category: "flood",
    patterns: [
      /\bflood(s|ing|ed)?\b/i,
      /\binundat(ion|ed)\b/i,
      /\bwaterlogg(ed|ing)\b/i,
      /\briver\s*(overflow|swollen|cresting)\b/i,
    ],
    priority: 70,
  },
  {
    category: "landslide",
    patterns: [/\blandslide(s)?\b/i, /\bmudslide(s)?\b/i, /\bdebris\s*flow\b/i, /\brockslide(s)?\b/i],
    priority: 65,
  },
  {
    category: "avalanche",
    patterns: [/\bavalanche(s)?\b/i, /\bsnow\s*slide\b/i],
    priority: 65,
  },
  {
    category: "wildfire",
    patterns: [/\bwildfire(s)?\b/i, /\bbushfire(s)?\b/i, /\bforest\s*fire(s)?\b/i],
    priority: 60,
  },
  {
    category: "heatwave",
    patterns: [/\bheat\s*wave(s)?\b/i, /\bextreme\s*heat\b/i, /\bscorching\s*temperature(s)?\b/i],
    priority: 55,
  },
  {
    category: "cold_wave",
    patterns: [/\bcold\s*wave(s)?\b/i, /\bextreme\s*cold\b/i, /\bblizzard(s)?\b/i, /\bfreeze\s*warning\b/i, /\bfrost\b/i],
    priority: 55,
  },
  {
    category: "drought",
    patterns: [/\bdrought(s)?\b/i, /\bwater\s*scarcity\b/i, /\barid\s*conditions\b/i],
    priority: 50,
  },
  {
    category: "lightning",
    patterns: [/\blightning\s*(strike|strikes|hit)?\b/i, /\bthunderbolt\b/i],
    priority: 48,
  },
  {
    category: "dust_storm",
    patterns: [/\bdust\s*storm(s)?\b/i, /\bsand\s*storm(s)?\b/i, /\bhaboob\b/i],
    priority: 45,
  },
  {
    category: "thunderstorm",
    patterns: [/\bthunderstorm(s)?\b/i, /\bthunder\s*and\s*lightning\b/i],
    priority: 40,
  },
  {
    category: "heavy_rain",
    patterns: [
      /\bheavy\s*(rain|rainfall|downpour|showers|precipitation)\b/i,
      /\btorrential\s*(rain|downpour)\b/i,
      /\bdeluge\b/i,
      /\bintense\s*rain\b/i,
    ],
    priority: 35,
  },
  {
    category: "severe_storm",
    patterns: [/\bsevere\s*storm(s)?\b/i, /\bgale(s)?\b/i, /\bsquall(s)?\b/i, /\btornado(es|s)?\b/i, /\bhailstorm(s)?\b/i],
    priority: 30,
  },
];

/**
 * Deterministically detect the primary weather/disaster hazard category
 * from text (title, summary, tags).
 */
export function detectEventCategory(text: string): EventCategory {
  if (!text || text.trim().length === 0) {
    return "other";
  }

  let matchedCategory: EventCategory = "other";
  let maxPriority = -1;

  for (const rule of CATEGORY_RULES) {
    if (rule.priority > maxPriority) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          matchedCategory = rule.category;
          maxPriority = rule.priority;
          break;
        }
      }
    }
  }

  return matchedCategory;
}
