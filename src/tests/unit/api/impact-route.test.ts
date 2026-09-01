import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/impact/route";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import type { WeatherEvent } from "@/types/events";

describe("GET /api/impact API Route", () => {
  const mockEvent: WeatherEvent = {
    id: "evt_test_100",
    slug: "bihar-flood-2026",
    title: "Flood Alert in Northern Bihar",
    category: "flood",
    hazard: "flood",
    severity: "high",
    status: "active",
    description: "Heavy inundation in Koshi basin.",
    location: {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
    },
    locations: [
      {
        name: "Patna",
        country: "India",
        region: "Bihar",
        city: "Patna",
      },
    ],
    affectedRegions: [{ name: "Bihar", country: "India" }],
    firstSeenAt: "2026-08-31T10:00:00Z",
    lastUpdatedAt: "2026-08-31T12:00:00Z",
    confidence: 0.85,
    sourceArticleIds: ["art_100"],
    sources: [
      {
        name: "Central Water Commission",
        publishedAt: "2026-08-31T10:00:00Z",
        category: "official",
        tier: 1,
      },
    ],
    impacts: [],
    provenance: [
      {
        provider: "CWC",
        retrievedAt: "2026-08-31T10:00:00Z",
        dataType: "observation",
      },
    ],
  };

  beforeEach(async () => {
    await globalEventRepository.clear();
    await globalEventRepository.save(mockEvent);
  });

  it("returns 200 and ImpactAssessment for valid query", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_test_100&city=Patna&region=Bihar&country=India&lat=25.5941&lon=85.1376"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eventId).toBe("evt_test_100");
    expect(body.relevanceStatus).toBe("confirmed");
    expect(body.impactLevel).toBe("high");
    expect(body.methodology).toBe("impact-engine-v1");
  });

  it("returns 404 with EVENT_NOT_FOUND when event does not exist", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_non_existent&city=Patna"
    );

    const res = await GET(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe("EVENT_NOT_FOUND");
    expect(body.error.message).toContain("not found");
  });

  it("returns 400 when coordinates are invalid", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_test_100&lat=999&lon=85.1376"
    );

    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("INVALID_LOCATION");
  });

  // --- Timezone tests ---

  it("accepts an explicit timezone parameter for India location", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_test_100&city=Patna&region=Bihar&country=India&lat=25.5941&lon=85.1376&timezone=Asia/Kolkata"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eventId).toBe("evt_test_100");
    expect(body.targetLocation.timezone).toBe("Asia/Kolkata");
  });

  it("works for non-India location without hardcoded timezone", async () => {
    // London event
    const londonEvent: WeatherEvent = {
      ...mockEvent,
      id: "evt_london_storm",
      title: "Storm Warning for Greater London",
      location: {
        name: "London",
        country: "United Kingdom",
        region: "England",
        city: "London",
      },
      locations: [
        {
          name: "London",
          country: "United Kingdom",
          region: "England",
          city: "London",
        },
      ],
      affectedRegions: [{ name: "England", country: "United Kingdom" }],
    };
    await globalEventRepository.save(londonEvent);

    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_london_storm&city=London&region=England&country=United Kingdom&lat=51.5074&lon=-0.1278&timezone=Europe/London"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eventId).toBe("evt_london_storm");
    expect(body.targetLocation.timezone).toBe("Europe/London");
    expect(body.relevanceStatus).toBe("confirmed");
  });

  it("handles missing timezone gracefully (falls through to auto)", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_test_100&city=Patna&region=Bihar&country=India&lat=25.5941&lon=85.1376"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    // No timezone was provided, so targetLocation.timezone should be undefined
    expect(body.targetLocation.timezone).toBeUndefined();
  });

  it("handles query with country but no coordinates", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_test_100&city=Patna&region=Bihar&country=India"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.relevanceStatus).toBe("confirmed");
    // No weather correlation should occur without coordinates
    expect(body.evidence.some((e: { type: string }) => e.type === "weather_condition_aligned")).toBe(false);
  });
});
