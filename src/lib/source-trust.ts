/**
 * Source trustworthiness tier model.
 * Deterministically classifies external data sources into Tiers 1, 2, or 3.
 *
 * Tier 1: Official meteorological, hydrological, and disaster-management authorities.
 * Tier 2: Established news organizations and wire services.
 * Tier 3: Other sources, local outlets, and unverified feeds.
 */

import type { NewsSourceCategory, SourceTier } from "@/types/news";

interface SourceClassification {
  category: NewsSourceCategory;
  tier: SourceTier;
}

const TIER_1_IDENTIFIERS: Array<{ pattern: RegExp; category: NewsSourceCategory }> = [
  { pattern: /\b(imd|india\s*meteorological\s*department)\b/i, category: "official" },
  { pattern: /\b(gdacs|global\s*disaster\s*alert)\b/i, category: "official" },
  { pattern: /\b(cwc|central\s*water\s*commission)\b/i, category: "official" },
  { pattern: /\b(ndma|national\s*disaster\s*management)\b/i, category: "government" },
  { pattern: /\b(noaa|national\s*oceanic\s*and\s*atmospheric)\b/i, category: "official" },
  { pattern: /\b(nws|national\s*weather\s*service)\b/i, category: "official" },
  { pattern: /\b(wmo|world\s*meteorological\s*organization)\b/i, category: "official" },
  { pattern: /\b(usgs|united\s*states\s*geological\s*survey)\b/i, category: "official" },
  { pattern: /\b(ecmwf)\b/i, category: "official" },
  { pattern: /\b(met\s*office|ukmo)\b/i, category: "official" },
  { pattern: /\b(reliefweb|un\s*ocha)\b/i, category: "official" },
  { pattern: /\b(dhm\s*nepal|department\s*of\s*hydrology\s*and\s*meteorology)\b/i, category: "official" },
  { pattern: /\b(bmd|bangladesh\s*meteorological\s*department)\b/i, category: "official" },
];

const TIER_2_IDENTIFIERS: Array<{ pattern: RegExp; category: NewsSourceCategory }> = [
  { pattern: /\b(reuters)\b/i, category: "wire" },
  { pattern: /\b(associated\s*press|\bap\s*news\b|\bap\b)/i, category: "wire" },
  { pattern: /\b(pti|press\s*trust\s*of\s*india)\b/i, category: "wire" },
  { pattern: /\b(ani|asian\s*news\s*international)\b/i, category: "wire" },
  { pattern: /\b(afp|agence\s*france[- ]presse)\b/i, category: "wire" },
  { pattern: /\b(bbc|bbc\s*news)\b/i, category: "news" },
  { pattern: /\b(the\s*hindu)\b/i, category: "news" },
  { pattern: /\b(indian\s*express)\b/i, category: "news" },
  { pattern: /\b(times\s*of\s*india|toi)\b/i, category: "news" },
  { pattern: /\b(hindustan\s*times)\b/i, category: "news" },
  { pattern: /\b(ndtv)\b/i, category: "news" },
  { pattern: /\b(cnn|bloomberg|the\s*guardian|al\s*jazeera)\b/i, category: "news" },
];

/**
 * Classify a source name and optional URL into a category and trust tier.
 */
export function classifySource(
  sourceName: string,
  url?: string
): SourceClassification {
  const combined = `${sourceName} ${url || ""}`.toLowerCase();

  for (const item of TIER_1_IDENTIFIERS) {
    if (item.pattern.test(combined)) {
      return { tier: 1, category: item.category };
    }
  }

  for (const item of TIER_2_IDENTIFIERS) {
    if (item.pattern.test(combined)) {
      return { tier: 2, category: item.category };
    }
  }

  return { tier: 3, category: "other" };
}
