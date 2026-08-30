/**
 * Normalized news article contracts.
 * Raw articles from any news provider are validated and
 * normalized into these types before entering the system.
 */

import type { ISOTimestamp } from './common';

/** Categorization of a news source by trustworthiness tier. */
export type NewsSourceCategory =
  | 'official'
  | 'government'
  | 'wire'
  | 'news'
  | 'other';

/** A news source identity. */
export interface NewsSource {
  name: string;
  url: string;
  category: NewsSourceCategory;
}

/** A normalized news article from any provider. */
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  source: NewsSource;
  publishedAt: ISOTimestamp;
  retrievedAt: ISOTimestamp;
  imageUrl?: string;
}
