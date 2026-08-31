import { describe, it, expect } from "vitest";
import { clusterArticlesIntoEvents, shouldClusterArticles } from "@/lib/clusterer";
import sampleArticles from "@/tests/fixtures/sample-articles.json";
import type { NewsArticle } from "@/types/news";

describe("Event Clusterer Engine", () => {
  it("determines whether two articles should be clustered together", () => {
    const art1 = sampleArticles[0] as NewsArticle; // Nepal flood
    const art2 = sampleArticles[1] as NewsArticle; // Nepal flood
    const art3 = sampleArticles[2] as NewsArticle; // Odisha cyclone

    const loc1 = [{ name: "Kathmandu", country: "Nepal" }];
    const loc2 = [{ name: "Kathmandu", country: "Nepal" }];
    const loc3 = [{ name: "Odisha", country: "India" }];

    expect(shouldClusterArticles(art1, art2, loc1, loc2)).toBe(true);
    expect(shouldClusterArticles(art1, art3, loc1, loc3)).toBe(false);
  });

  it("clusters related articles into WeatherEvents with confidence scoring", () => {
    const articles = sampleArticles as NewsArticle[];
    const events = clusterArticlesIntoEvents(articles);

    // 2 Nepal flood articles + 1 Odisha cyclone article -> 2 distinct events
    expect(events.length).toBe(2);

    const nepalEvent = events.find((e) => e.location.country === "Nepal");
    expect(nepalEvent).toBeDefined();
    expect(["flood", "flash_flood"]).toContain(nepalEvent?.category);
    expect(nepalEvent?.sources.length).toBe(2);
    expect(nepalEvent?.sourceArticleIds.length).toBe(2);
    expect(nepalEvent?.confidence).toBeGreaterThanOrEqual(0.65);

    const odishaEvent = events.find((e) => e.location.country === "India");
    expect(odishaEvent).toBeDefined();
    expect(odishaEvent?.category).toBe("cyclone");
    expect(odishaEvent?.confidence).toBeGreaterThanOrEqual(0.85); // Tier 1 IMD source
  });
});
