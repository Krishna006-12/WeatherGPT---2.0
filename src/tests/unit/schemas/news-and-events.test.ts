import { describe, it, expect } from "vitest";
import { newsArticleSchema, rawFeedItemSchema } from "@/schemas/news";
import { weatherEventSchema } from "@/schemas/events";
import sampleArticles from "@/tests/fixtures/sample-articles.json";

describe("News and Event Schemas Validation", () => {
  it("validates valid NewsArticle objects", () => {
    for (const art of sampleArticles) {
      const result = newsArticleSchema.safeParse(art);
      expect(result.success).toBe(true);
    }
  });

  it("rejects NewsArticle missing required fields", () => {
    const invalid = { ...sampleArticles[0], title: "" };
    const result = newsArticleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates raw feed items", () => {
    const raw = {
      title: "Flash Flood Alert",
      link: "https://example.com/alert",
      pubDate: "2026-08-31T10:00:00Z",
      description: "Severe flooding",
    };
    const result = rawFeedItemSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("validates normalized WeatherEvent", () => {
    const event = {
      id: "evt_123",
      slug: "kathmandu-flood-2026",
      title: "Flash Floods in Kathmandu",
      category: "flood",
      hazard: "flood",
      severity: "high",
      status: "active",
      description: "Heavy rainfall caused flooding",
      location: { name: "Kathmandu", country: "Nepal" },
      locations: [{ name: "Kathmandu", country: "Nepal" }],
      affectedRegions: [{ name: "Kathmandu", country: "Nepal" }],
      firstSeenAt: "2026-08-31T10:00:00Z",
      lastUpdatedAt: "2026-08-31T12:00:00Z",
      confidence: 0.85,
      sourceArticleIds: ["art_1"],
      sources: [
        {
          name: "Reuters",
          url: "https://reuters.com/flood",
          publishedAt: "2026-08-31T10:00:00Z",
          category: "wire",
          tier: 2,
        },
      ],
      impacts: [],
      provenance: [
        {
          provider: "Reuters",
          retrievedAt: "2026-08-31T10:00:00Z",
          dataType: "observation",
        },
      ],
    };

    const result = weatherEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});
