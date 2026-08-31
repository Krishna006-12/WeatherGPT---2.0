/**
 * Geographic entity normalizer.
 * Extracts and maps explicitly mentioned countries, states/regions, and major cities
 * from news and disaster alert text.
 *
 * CRITICAL CONSTRAINT:
 * Only extracts locations explicitly stated in the source text.
 * Never infers downstream impact, cross-border flood propagation, or speculative
 * regional hazards.
 */

import type { EventLocation, EventRegion } from "@/types/events";

interface GazetteerEntry {
  name: string;
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  patterns: RegExp[];
}

const GAZETTEER: GazetteerEntry[] = [
  // India & States / Major Cities
  {
    name: "Kanpur",
    country: "India",
    region: "Uttar Pradesh",
    city: "Kanpur",
    latitude: 26.4499,
    longitude: 80.3319,
    patterns: [/\bkanpur\b/i],
  },
  {
    name: "Lucknow",
    country: "India",
    region: "Uttar Pradesh",
    city: "Lucknow",
    latitude: 26.8467,
    longitude: 80.9462,
    patterns: [/\blucknow\b/i],
  },
  {
    name: "Uttar Pradesh",
    country: "India",
    region: "Uttar Pradesh",
    latitude: 26.8467,
    longitude: 80.9462,
    patterns: [/\buttar\s*pradesh\b/i, /\bup\b/i],
  },
  {
    name: "Patna",
    country: "India",
    region: "Bihar",
    city: "Patna",
    latitude: 25.5941,
    longitude: 85.1376,
    patterns: [/\bpatna\b/i],
  },
  {
    name: "Bihar",
    country: "India",
    region: "Bihar",
    latitude: 25.0961,
    longitude: 85.3131,
    patterns: [/\bbihar\b/i],
  },
  {
    name: "Mumbai",
    country: "India",
    region: "Maharashtra",
    city: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    patterns: [/\bmumbai\b/i, /\bbombay\b/i],
  },
  {
    name: "Maharashtra",
    country: "India",
    region: "Maharashtra",
    latitude: 19.7515,
    longitude: 75.7139,
    patterns: [/\bmaharashtra\b/i],
  },
  {
    name: "Gujarat",
    country: "India",
    region: "Gujarat",
    latitude: 22.2587,
    longitude: 71.1924,
    patterns: [/\bgujarat\b/i],
  },
  {
    name: "Odisha",
    country: "India",
    region: "Odisha",
    latitude: 20.9517,
    longitude: 85.0985,
    patterns: [/\bodisha\b/i, /\borissa\b/i],
  },
  {
    name: "West Bengal",
    country: "India",
    region: "West Bengal",
    latitude: 22.9868,
    longitude: 87.855,
    patterns: [/\bwest\s*bengal\b/i, /\bkolkata\b/i],
  },
  {
    name: "Assam",
    country: "India",
    region: "Assam",
    latitude: 26.2006,
    longitude: 92.9376,
    patterns: [/\bassam\b/i, /\bguwahati\b/i],
  },
  {
    name: "Kerala",
    country: "India",
    region: "Kerala",
    latitude: 10.8505,
    longitude: 76.2711,
    patterns: [/\bkerala\b/i, /\bwayanad\b/i, /\bkochi\b/i],
  },
  {
    name: "Uttarakhand",
    country: "India",
    region: "Uttarakhand",
    latitude: 30.0668,
    longitude: 79.0193,
    patterns: [/\buttarakhand\b/i, /\bdehradun\b/i],
  },
  {
    name: "Himachal Pradesh",
    country: "India",
    region: "Himachal Pradesh",
    latitude: 31.1048,
    longitude: 77.1734,
    patterns: [/\bhimachal\s*pradesh\b/i, /\bshimla\b/i],
  },
  {
    name: "Delhi",
    country: "India",
    region: "Delhi",
    city: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    patterns: [/\bdelhi\b/i, /\bnew\s*delhi\b/i],
  },
  {
    name: "India",
    country: "India",
    latitude: 20.5937,
    longitude: 78.9629,
    patterns: [/\bindia\b/i, /\bindian\b/i],
  },

  // Neighboring & Global Countries
  {
    name: "Kathmandu",
    country: "Nepal",
    region: "Bagmati",
    city: "Kathmandu",
    latitude: 27.7172,
    longitude: 85.324,
    patterns: [/\bkathmandu\b/i],
  },
  {
    name: "Nepal",
    country: "Nepal",
    latitude: 28.3949,
    longitude: 84.124,
    patterns: [/\bnepal\b/i, /\bnepalese\b/i, /\bnepali\b/i],
  },
  {
    name: "Bangladesh",
    country: "Bangladesh",
    latitude: 23.685,
    longitude: 90.3563,
    patterns: [/\bbangladesh\b/i, /\bdhaka\b/i],
  },
  {
    name: "Sri Lanka",
    country: "Sri Lanka",
    latitude: 7.8731,
    longitude: 80.7718,
    patterns: [/\bsri\s*lanka\b/i, /\bcolombo\b/i],
  },
  {
    name: "Pakistan",
    country: "Pakistan",
    latitude: 30.3753,
    longitude: 69.3451,
    patterns: [/\bpakistan\b/i, /\bislamabad\b/i, /\bkarachi\b/i, /\blahore\b/i],
  },
  {
    name: "United States",
    country: "United States",
    latitude: 37.0902,
    longitude: -95.7129,
    patterns: [/\bunited\s*states\b/i, /\busa\b/i, /\bu\.s\.\b/i, /\bflorida\b/i, /\bcalifornia\b/i, /\btexas\b/i],
  },
  {
    name: "Japan",
    country: "Japan",
    latitude: 36.2048,
    longitude: 138.2529,
    patterns: [/\bjapan\b/i, /\btokyo\b/i],
  },
  {
    name: "United Kingdom",
    country: "United Kingdom",
    latitude: 55.3781,
    longitude: -3.436,
    patterns: [/\bunited\s*kingdom\b/i, /\buk\b/i, /\bbritain\b/i, /\blondon\b/i],
  },
];

/**
 * Extract explicitly mentioned geographic entities from text.
 */
export function extractLocationsFromText(text: string): EventLocation[] {
  if (!text || text.trim().length === 0) {
    return [{ name: "Global", country: "Global" }];
  }

  const found: EventLocation[] = [];
  const seenNames = new Set<string>();

  for (const entry of GAZETTEER) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        if (!seenNames.has(entry.name)) {
          seenNames.add(entry.name);
          found.push({
            name: entry.name,
            country: entry.country,
            region: entry.region,
            city: entry.city,
            coordinates:
              entry.latitude !== undefined && entry.longitude !== undefined
                ? { latitude: entry.latitude, longitude: entry.longitude }
                : undefined,
          });
        }
        break;
      }
    }
  }

  if (found.length === 0) {
    return [{ name: "Global", country: "Global" }];
  }

  return found;
}

/**
 * Convert EventLocation array into EventRegion array.
 */
export function locationsToAffectedRegions(locations: EventLocation[]): EventRegion[] {
  const regions: EventRegion[] = [];
  const seen = new Set<string>();

  for (const loc of locations) {
    const key = `${loc.name}_${loc.country}`;
    if (!seen.has(key)) {
      seen.add(key);
      regions.push({
        name: loc.region || loc.name,
        country: loc.country,
        coordinates: loc.coordinates,
      });
    }
  }

  return regions;
}
