import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryEventRepository,
  InMemoryArticleRepository,
} from "@/services/storage/in-memory-repositories";
import sampleArticles from "@/tests/fixtures/sample-articles.json";
import type { WeatherEvent } from "@/types/events";
import type { NewsArticle } from "@/types/news";

describe("InMemory Repositories", () => {
  let eventRepo: InMemoryEventRepository;
  let articleRepo: InMemoryArticleRepository;

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    articleRepo = new InMemoryArticleRepository();
  });

  it("saves and retrieves articles with filtering", async () => {
    const articles = sampleArticles as NewsArticle[];
    await articleRepo.saveMany(articles);

    const all = await articleRepo.findAll();
    expect(all.length).toBe(3);

    const tier1 = await articleRepo.findAll({ sourceTier: 1 });
    expect(tier1.length).toBe(1);
    expect(tier1[0]?.source.name).toContain("IMD");

    const byUrl = await articleRepo.findByUrl(articles[0]!.url);
    expect(byUrl?.id).toBe(articles[0]!.id);
  });

  it("saves and retrieves weather events with multi-criteria filtering", async () => {
    const mockEvent: WeatherEvent = {
      id: "evt_123",
      slug: "nepal-flood",
      title: "Kathmandu Flash Floods",
      category: "flood",
      hazard: "flood",
      severity: "high",
      status: "active",
      description: "Severe flooding",
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
          url: "https://reuters.com",
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

    await eventRepo.save(mockEvent);

    const found = await eventRepo.findById("evt_123");
    expect(found).toBeDefined();
    expect(found?.title).toBe("Kathmandu Flash Floods");

    const filterCountry = await eventRepo.findAll({ country: "Nepal" });
    expect(filterCountry.length).toBe(1);

    const filterCategory = await eventRepo.findAll({ category: "flood" });
    expect(filterCategory.length).toBe(1);

    const filterWrongCategory = await eventRepo.findAll({ category: "cyclone" });
    expect(filterWrongCategory.length).toBe(0);
  });
});
