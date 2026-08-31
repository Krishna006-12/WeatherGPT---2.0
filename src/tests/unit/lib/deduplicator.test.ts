import { describe, it, expect } from "vitest";
import {
  isDuplicateArticle,
  deduplicateArticles,
  computeTokenJaccardSimilarity,
  generateArticleId,
} from "@/lib/deduplicator";
import sampleArticles from "@/tests/fixtures/sample-articles.json";
import type { NewsArticle } from "@/types/news";

describe("Deduplicator Engine", () => {
  it("generates deterministic article IDs", () => {
    const id1 = generateArticleId("https://example.com/flood", "2026-08-31T10:00:00Z");
    const id2 = generateArticleId("https://example.com/flood?utm_source=rss", "2026-08-31T10:00:00Z");
    expect(id1).toBe(id2);
  });

  it("calculates token Jaccard similarity correctly", () => {
    const textA = "Severe Flash Floods in Kathmandu Valley, Nepal";
    const textB = "Severe Flash Flooding in Kathmandu, Nepal";
    const similarity = computeTokenJaccardSimilarity(textA, textB);
    expect(similarity).toBeGreaterThan(0.5);
  });

  it("detects exact and syndicated duplicate articles", () => {
    const article1 = sampleArticles[0] as NewsArticle;
    const articleDuplicate = {
      ...article1,
      id: "art_dup",
      url: "https://www.reuters.com/world/nepal-flash-floods-2026?utm_source=twitter",
    };

    expect(isDuplicateArticle(article1, articleDuplicate)).toBe(true);
  });

  it("deduplicates an article list preserving distinct stories", () => {
    const articles = [
      sampleArticles[0] as NewsArticle,
      { ...(sampleArticles[0] as NewsArticle), id: "dup", url: "https://www.reuters.com/world/nepal-flash-floods-2026?utm_medium=rss" },
      sampleArticles[2] as NewsArticle,
    ];

    const unique = deduplicateArticles(articles);
    expect(unique.length).toBe(2);
    expect(unique.some((a) => a.id === sampleArticles[0]?.id)).toBe(true);
    expect(unique.some((a) => a.id === sampleArticles[2]?.id)).toBe(true);
  });
});
