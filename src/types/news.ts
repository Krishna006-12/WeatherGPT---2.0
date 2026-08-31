/**
 * Normalized news and information article contracts.
 * Raw articles and feed entries from any source are validated and
 * normalized into these types before entering the event pipeline.
 */

import type { ISOTimestamp } from "./common";
import type { DataProvenance } from "./weather";

/** Source trustworthiness tier. */
export type SourceTier = 1 | 2 | 3;

/** Categorization of a news source by origin type. */
export type NewsSourceCategory =
  | "official"
  | "government"
  | "wire"
  | "news"
  | "other";

/** A verified news/data source identity. */
export interface NewsSource {
  name: string;
  url?: string;
  category: NewsSourceCategory;
  tier: SourceTier;
}

/** A normalized article or alert item from an external feed. */
export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: NewsSource;
  publishedAt: ISOTimestamp;
  fetchedAt: ISOTimestamp;
  summary?: string;
  content?: string;
  language?: string;
  sourceTier: SourceTier;
  provenance: DataProvenance;
  imageUrl?: string;
}
