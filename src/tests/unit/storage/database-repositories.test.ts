import { describe, it, expect, beforeEach } from "vitest";
import {
  DatabaseEventRepository,
  DatabaseArticleRepository,
  createStorageRepositories,
} from "@/services/storage/database-repositories";
import {
  InMemoryEventRepository,
  InMemoryArticleRepository,
} from "@/services/storage/in-memory-repositories";
import type { WeatherEvent } from "@/types/events";
import type { NewsArticle } from "@/types/news";

describe("Database Storage Repositories & In-Memory Fallbacks", () => {
  let inMemoryEvent: InMemoryEventRepository;
  let inMemoryArticle: InMemoryArticleRepository;
  let dbEventRepo: DatabaseEventRepository;
  let dbArticleRepo: DatabaseArticleRepository;

  beforeEach(() => {
    inMemoryEvent = new InMemoryEventRepository();
    inMemoryArticle = new InMemoryArticleRepository();
    dbEventRepo = new DatabaseEventRepository(undefined, inMemoryEvent);
    dbArticleRepo = new DatabaseArticleRepository(undefined, inMemoryArticle);
  });

  it("identifies persistent vs fallback mode based on database URL", () => {
    const unconfigured = new DatabaseEventRepository(undefined);
    expect(unconfigured.isPersistent()).toBe(false);

    const configured = new DatabaseEventRepository("postgresql://user:pass@localhost:5432/weathergpt");
    expect(configured.isPersistent()).toBe(true);
  });

  it("saves, retrieves, and filters WeatherEvents seamlessly through adapter", async () => {
    const mockEvent: WeatherEvent = {
      id: "evt_punjab_frost",
      slug: "punjab-winter-frost",
      title: "Severe Ground Frost in Punjab",
      category: "cold_wave",
      hazard: "cold_wave",
      severity: "severe",
      status: "active",
      description: "Night temperatures drop to -0.5C with ground frost risk to mustard crops.",
      location: { name: "Amritsar", country: "India", region: "Punjab" },
      locations: [{ name: "Amritsar", country: "India", region: "Punjab" }],
      affectedRegions: [{ name: "Amritsar", country: "India" }],
      firstSeenAt: "2026-09-13T00:00:00Z",
      lastUpdatedAt: "2026-09-13T06:00:00Z",
      confidence: 0.92,
      sourceArticleIds: ["art_pau_1"],
      sources: [
        {
          name: "Punjab Agricultural University (PAU)",
          url: "https://pau.edu/advisories",
          publishedAt: "2026-09-13T06:00:00Z",
          category: "official",
          tier: 1,
        },
      ],
      impacts: [],
      provenance: [
        {
          provider: "PAU",
          retrievedAt: "2026-09-13T06:00:00Z",
          dataType: "forecast",
        },
      ],
    };

    await dbEventRepo.save(mockEvent);

    const retrieved = await dbEventRepo.findById("evt_punjab_frost");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe("Severe Ground Frost in Punjab");

    const bySlug = await dbEventRepo.findBySlug("punjab-winter-frost");
    expect(bySlug?.id).toBe("evt_punjab_frost");

    const filtered = await dbEventRepo.findAll({ severity: "severe" });
    expect(filtered.length).toBe(1);

    const count = await dbEventRepo.count();
    expect(count).toBe(1);

    const deleted = await dbEventRepo.delete("evt_punjab_frost");
    expect(deleted).toBe(true);
    expect(await dbEventRepo.findById("evt_punjab_frost")).toBeNull();
  });

  it("saves and queries NewsArticle through adapter", async () => {
    const mockArticle: NewsArticle = {
      id: "art_imd_1",
      url: "https://mausam.imd.gov.in/bulletin/101",
      title: "IMD Issues Cyclone Warning for Odisha Coast",
      summary: "Depression over Bay of Bengal intensifies into Deep Depression.",
      source: {
        name: "India Meteorological Department (IMD)",
        url: "https://mausam.imd.gov.in",
        category: "official",
        tier: 1,
      },
      sourceTier: 1,
      publishedAt: "2026-09-13T08:00:00Z",
      fetchedAt: "2026-09-13T08:15:00Z",
      language: "en",
      provenance: {
        provider: "IMD",
        retrievedAt: "2026-09-13T08:15:00Z",
        dataType: "observation",
      },
    };

    await dbArticleRepo.save(mockArticle);

    const byUrl = await dbArticleRepo.findByUrl("https://mausam.imd.gov.in/bulletin/101");
    expect(byUrl?.id).toBe("art_imd_1");

    const tier1 = await dbArticleRepo.findAll({ sourceTier: 1 });
    expect(tier1.length).toBe(1);

    const tier2 = await dbArticleRepo.findAll({ sourceTier: 2 });
    expect(tier2.length).toBe(0);
  });

  it("createStorageRepositories returns appropriate instances", () => {
    const repos = createStorageRepositories();
    expect(repos.eventRepo).toBeDefined();
    expect(repos.articleRepo).toBeDefined();
  });
});
