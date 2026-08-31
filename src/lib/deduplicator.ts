/**
 * Deterministic article deduplication engine.
 * Uses canonical URLs, publication windows, and token similarity
 * to eliminate duplicate and syndicated articles without using LLMs.
 */

import type { NewsArticle } from "@/types/news";
import { normalizeCanonicalUrl } from "./url-normalizer";
import { normalizeTitleForComparison } from "./text-sanitizer";

/**
 * Generate a deterministic hash string for an ID or key.
 */
export function generateDeterministicHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16);
}

/**
 * Generate a deterministic ID for a NewsArticle based on canonical URL and pubDate.
 */
export function generateArticleId(canonicalUrl: string, publishedAt: string): string {
  const normUrl = normalizeCanonicalUrl(canonicalUrl);
  const datePrefix = publishedAt.slice(0, 10);
  const hash = generateDeterministicHash(`${normUrl}_${datePrefix}`);
  return `art_${hash}`;
}

function stemWord(word: string): string {
  return word
    .replace(/ies$/, "y")
    .replace(/(ing|ed|es|s)$/, "");
}

/**
 * Compute Jaccard similarity coefficient between two token sets.
 * Returns a value between 0.0 and 1.0.
 */
export function computeTokenJaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(
    normalizeTitleForComparison(textA)
      .split(" ")
      .filter((t) => t.length > 2)
      .map(stemWord)
  );
  const tokensB = new Set(
    normalizeTitleForComparison(textB)
      .split(" ")
      .filter((t) => t.length > 2)
      .map(stemWord)
  );

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Check if two articles are duplicates of each other.
 */
export function isDuplicateArticle(
  articleA: NewsArticle,
  articleB: NewsArticle,
  titleSimilarityThreshold: number = 0.8
): boolean {
  // 1. Exact canonical URL match
  const urlA = normalizeCanonicalUrl(articleA.url);
  const urlB = normalizeCanonicalUrl(articleB.url);
  if (urlA && urlB && urlA === urlB) {
    return true;
  }

  // 2. High title similarity within 24-hour publication window
  const timeA = new Date(articleA.publishedAt).getTime();
  const timeB = new Date(articleB.publishedAt).getTime();

  if (!isNaN(timeA) && !isNaN(timeB)) {
    const hoursDifference = Math.abs(timeA - timeB) / (1000 * 60 * 60);
    if (hoursDifference <= 24) {
      const similarity = computeTokenJaccardSimilarity(articleA.title, articleB.title);
      if (similarity >= titleSimilarityThreshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Deduplicate an array of articles, keeping the highest-tier or earliest version.
 */
export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const uniqueArticles: NewsArticle[] = [];
  const seenCanonicalUrls = new Set<string>();

  for (const article of articles) {
    const canonicalUrl = normalizeCanonicalUrl(article.url);

    // Fast-path exact URL deduplication
    if (canonicalUrl && seenCanonicalUrls.has(canonicalUrl)) {
      continue;
    }

    // Check against already accepted articles for near-duplicate titles
    let isDuplicate = false;
    for (const existing of uniqueArticles) {
      if (isDuplicateArticle(article, existing)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      if (canonicalUrl) {
        seenCanonicalUrls.add(canonicalUrl);
      }
    }
  }

  return uniqueArticles;
}
