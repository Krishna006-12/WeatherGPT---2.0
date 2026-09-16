import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deduplicateContextEvents,
  scoreAndFilterContextEvents,
  calculateDistanceWeight,
  calculateSourceTrustWeight,
} from "@/services/news/context-event-scorer";
import { contextEventSchema } from "@/schemas/context-event";
import { GdacsNewsProvider } from "@/services/news/gdacs-news-provider";
import { ContextNewsService } from "@/services/news/context-news-service";
import type { NewsProvider } from "@/services/news/news-provider";
import type { ContextEvent } from "@/types/context-event";

function createMockEvent(overrides: Partial<ContextEvent> = {}): ContextEvent {
  const id = overrides.id || "ctx_123";
  return {
    id,
    headline: "Flash Floods in Patna after Heavy Downpour",
    summary: "Severe flooding reported across multiple districts",
    source: {
      name: "GDACS",
      category: "official",
      tier: 1,
      url: "https://www.gdacs.org",
    },
    timestamp: "2026-09-15T12:00:00Z",
    category: "flood",
    location: {
      name: "Patna",
      country: "India",
      region: "Bihar",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
    },
    url: overrides.url !== undefined ? overrides.url : `https://www.gdacs.org/report/${id}`,
    provenance: {
      provider: "gdacs",
      dataSource: "GDACS Official Feed",
      retrievedAt: "2026-09-15T12:05:00Z",
      observedAt: "2026-09-15T12:00:00Z",
      dataType: "observation",
      confidence: 1.0,
    },
    ...overrides,
  };
}

describe("Context Event Deduplication", () => {
  it("deduplicates near-duplicate headlines within publication window", () => {
    const event1 = createMockEvent({
      id: "evt_1",
      headline: "Flash Floods in Patna after Heavy Downpour",
      source: { name: "Local News", category: "news", tier: 3 },
      timestamp: "2026-09-15T10:00:00Z",
    });

    const event2 = createMockEvent({
      id: "evt_2",
      headline: "Flash Flooding in Patna following Heavy Downpour",
      source: { name: "Official Weather Service", category: "official", tier: 1 },
      timestamp: "2026-09-15T11:00:00Z",
    });

    const deduped = deduplicateContextEvents([event1, event2]);

    expect(deduped.length).toBe(1);
    // Preserves the event with higher source trust (Tier 1 over Tier 3)
    expect(deduped[0]?.id).toBe("evt_2");
    expect(deduped[0]?.source.tier).toBe(1);
  });

  it("retains distinct weather events across different topics", () => {
    const floodEvent = createMockEvent({
      id: "evt_flood",
      headline: "Major Floods Reported in Assam Valley",
      category: "flood",
    });

    const heatwaveEvent = createMockEvent({
      id: "evt_heat",
      headline: "Extreme Heatwave Alert for Northern Plains",
      category: "heatwave",
    });

    const deduped = deduplicateContextEvents([floodEvent, heatwaveEvent]);
    expect(deduped.length).toBe(2);
  });
});

describe("Location-Relevance Scoring and Distance Filtering", () => {
  const patnaCoords = { latitude: 25.5941, longitude: 85.1376 };

  it("filters out events exceeding the maxRadiusKm threshold", () => {
    const nearbyEvent = createMockEvent({
      id: "evt_near",
      headline: "Ganga River Watch in Patna",
      location: {
        name: "Patna",
        coordinates: { latitude: 25.61, longitude: 85.15 }, // ~3km away
      },
    });

    const farEvent = createMockEvent({
      id: "evt_far",
      headline: "Wildfire Advisory in Athens Greece",
      category: "wildfire",
      location: {
        name: "Athens",
        coordinates: { latitude: 37.9838, longitude: 23.7275 }, // ~5,800km away
      },
    });

    const scored = scoreAndFilterContextEvents(
      [nearbyEvent, farEvent],
      patnaCoords,
      { maxRadiusKm: 500 }
    );

    expect(scored.length).toBe(1);
    expect(scored[0]?.id).toBe("evt_near");
    expect(scored[0]?.locationRelevance?.proximity).toBe("immediate");
    expect(scored[0]?.locationRelevance?.distanceKm).toBeLessThan(10);
    expect(scored[0]?.score).toBeGreaterThan(0.7);
  });

  it("scores closer and more recent events higher", () => {
    const nowMs = new Date("2026-09-15T15:00:00Z").getTime();

    const closeRecentEvent = createMockEvent({
      id: "evt_close_recent",
      headline: "Urban Flooding in Patna City Center",
      timestamp: "2026-09-15T14:00:00Z", // 1 hour ago
      location: {
        name: "Patna",
        coordinates: { latitude: 25.60, longitude: 85.14 },
      },
    });

    const moderateOlderEvent = createMockEvent({
      id: "evt_moderate_old",
      headline: "Rain Alert in Gaya District",
      timestamp: "2026-09-13T10:00:00Z", // ~53 hours ago
      location: {
        name: "Gaya",
        coordinates: { latitude: 24.7955, longitude: 85.0002 }, // ~90km away
      },
    });

    const scored = scoreAndFilterContextEvents(
      [moderateOlderEvent, closeRecentEvent],
      patnaCoords,
      { maxRadiusKm: 500, now: nowMs }
    );

    expect(scored.length).toBe(2);
    // Highest score first
    expect(scored[0]?.id).toBe("evt_close_recent");
    expect(scored[0]!.score!).toBeGreaterThan(scored[1]!.score!);
  });

  it("calculates source-trust weights correctly", () => {
    expect(calculateSourceTrustWeight(1)).toBe(1.0);
    expect(calculateSourceTrustWeight(2)).toBe(0.85);
    expect(calculateSourceTrustWeight(3)).toBe(0.6);
  });

  it("calculates distance weights and proximity tiers correctly", () => {
    expect(calculateDistanceWeight(30).proximity).toBe("immediate");
    expect(calculateDistanceWeight(120).proximity).toBe("near");
    expect(calculateDistanceWeight(400).proximity).toBe("moderate");
    expect(calculateDistanceWeight(800).proximity).toBe("distant");
  });
});

describe("Context Event Schema Validation", () => {
  it("validates a complete, conformant ContextEvent", () => {
    const valid = createMockEvent();
    const result = contextEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects malformed context event with missing headline", () => {
    const invalid = createMockEvent({ headline: "" });
    const result = contextEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects malformed context event with invalid category", () => {
    const invalid = {
      ...createMockEvent(),
      category: "alien_invasion" as unknown as "flood",
    };
    const result = contextEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects malformed context event with invalid ISO date", () => {
    const invalid = createMockEvent({ timestamp: "yesterday afternoon" });
    const result = contextEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("GdacsNewsProvider Adapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const sampleGdacsXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:gdacs="http://www.gdacs.org">
  <channel>
    <title>GDACS RSS Feed</title>
    <item>
      <title>Flood in Nepal - Orange Alert</title>
      <link>https://www.gdacs.org/report.aspx?eventid=1001</link>
      <pubDate>Mon, 15 Sep 2026 08:00:00 GMT</pubDate>
      <description>Heavy monsoon floods across Koshi basin</description>
      <gdacs:eventtype>FL</gdacs:eventtype>
      <gdacs:country>Nepal</gdacs:country>
      <gdacs:severity>1.5m flood level</gdacs:severity>
      <geo:lat>27.7172</geo:lat>
      <geo:long>85.3240</geo:long>
    </item>
  </channel>
</rss>`;

  it("fetches and transforms GDACS RSS items into validated ContextEvents", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(sampleGdacsXml),
    });

    const provider = new GdacsNewsProvider();
    const events = await provider.getContextEvents();

    expect(events.length).toBe(1);
    expect(events[0]?.headline).toBe("Flood in Nepal - Orange Alert");
    expect(events[0]?.category).toBe("flood");
    expect(events[0]?.location.country).toBe("Nepal");
    expect(events[0]?.location.coordinates?.latitude).toBe(27.7172);
    expect(events[0]?.location.coordinates?.longitude).toBe(85.324);
    expect(events[0]?.source.name).toBe("GDACS");
  });

  it("handles rate limiting (429) gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const provider = new GdacsNewsProvider();
    await expect(provider.getContextEvents()).rejects.toThrow("rate limit");
  });

  it("handles malformed provider XML by failing loudly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("Malformed plain text without RSS elements"),
    });

    const provider = new GdacsNewsProvider();
    await expect(provider.getContextEvents()).rejects.toThrow("invalid XML");
  });
});

describe("ContextNewsService", () => {
  it("orchestrates provider fetching, deduplication, and scoring", async () => {
    const mockProvider: NewsProvider = {
      name: "mock-news-provider",
      getContextEvents: vi.fn().mockResolvedValue([
        createMockEvent({ id: "evt_1", headline: "Flash Flood in Patna" }),
      ]),
    };

    const service = new ContextNewsService(mockProvider);
    const result = await service.getContextEvents({
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
      radiusKm: 300,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.headline).toBe("Flash Flood in Patna");
      expect(result.data[0]?.locationRelevance).toBeDefined();
    }
  });

  it("rejects invalid query coordinates with 400 AppError", async () => {
    const mockProvider: NewsProvider = {
      name: "mock-news-provider",
      getContextEvents: vi.fn(),
    };

    const service = new ContextNewsService(mockProvider);
    const result = await service.getContextEvents({
      coordinates: { latitude: 150, longitude: 85.1376 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Coordinates out of range");
    }
  });

  it("caches query results for identical coordinate requests", async () => {
    const mockProvider: NewsProvider = {
      name: "mock-news-provider",
      getContextEvents: vi.fn().mockResolvedValue([createMockEvent()]),
    };

    const service = new ContextNewsService(mockProvider);
    const coords = { latitude: 25.5941, longitude: 85.1376 };

    await service.getContextEvents({ coordinates: coords });
    await service.getContextEvents({ coordinates: coords });

    expect(mockProvider.getContextEvents).toHaveBeenCalledTimes(1);
  });
});
