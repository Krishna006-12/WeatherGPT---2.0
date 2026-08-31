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

  it("returns 404 when event is not found in repository", async () => {
    const req = new Request(
      "http://localhost:3000/api/impact?eventId=evt_non_existent&city=Patna"
    );

    const res = await GET(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe("LOCATION_NOT_FOUND");
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
});
