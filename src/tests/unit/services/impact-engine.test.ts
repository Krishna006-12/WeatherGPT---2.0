import { describe, it, expect, beforeEach } from "vitest";
import { ImpactEngine } from "@/services/impact/impact-engine";
import type { WeatherEvent, EventLocation } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";

describe("ImpactEngine Core Evaluation", () => {
  let engine: ImpactEngine;

  beforeEach(() => {
    engine = new ImpactEngine();
  });

  const baseNepalFloodEvent: WeatherEvent = {
    id: "evt_nepal_flood_2026",
    slug: "nepal-flash-floods-2026",
    title: "Severe Flash Flooding in Kathmandu Valley, Nepal",
    category: "flash_flood",
    hazard: "flash_flood",
    severity: "high",
    status: "active",
    description: "Torrential monsoon rains triggered heavy flash flooding in Kathmandu, Nepal.",
    location: {
      name: "Kathmandu",
      country: "Nepal",
      region: "Bagmati",
      city: "Kathmandu",
      coordinates: { latitude: 27.7172, longitude: 85.324 },
    },
    locations: [
      {
        name: "Kathmandu",
        country: "Nepal",
        region: "Bagmati",
        city: "Kathmandu",
        coordinates: { latitude: 27.7172, longitude: 85.324 },
      },
    ],
    affectedRegions: [
      {
        name: "Bagmati",
        country: "Nepal",
      },
    ],
    firstSeenAt: "2026-08-31T10:00:00Z",
    lastUpdatedAt: "2026-08-31T12:00:00Z",
    confidence: 0.85,
    sourceArticleIds: ["art_1"],
    sources: [
      {
        name: "Nepal DHM",
        url: "https://dhm.gov.np",
        publishedAt: "2026-08-31T10:00:00Z",
        category: "official",
        tier: 1,
      },
    ],
    impacts: [],
    provenance: [
      {
        provider: "Nepal DHM",
        retrievedAt: "2026-08-31T10:00:00Z",
        dataType: "observation",
      },
    ],
  };

  const sampleWeatherSnapshot: WeatherSnapshot = {
    location: {
      name: "Patna",
      country: "India",
      region: "Bihar",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-08-31T12:00:00Z",
    current: {
      temperature: 29,
      feelsLike: 33,
      humidity: 90,
      precipitation: 15.0,
      windSpeed: 18,
      windDirection: 120,
      pressure: 1008,
      cloudCover: 100,
      condition: "heavy-rain",
      observedAt: "2026-08-31T12:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-08-31T12:00:00Z",
        dataType: "current",
      },
    ],
  };

  // Scenario 1: Event explicitly affects user's region
  it("Scenario 1: Confirms impact when event explicitly lists user's region", () => {
    const biharFloodEvent: WeatherEvent = {
      ...baseNepalFloodEvent,
      title: "Monsoon Flood Alert across Bihar",
      affectedRegions: [{ name: "Bihar", country: "India" }],
    };

    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
    };

    const assessment = engine.assessImpact(biharFloodEvent, targetPatna);
    expect(assessment.relevanceStatus).toBe("confirmed");
    expect(assessment.impactLevel).toBe("high");
    expect(assessment.confidence).toBeGreaterThanOrEqual(0.8);
    expect(assessment.evidence.some((e) => e.type === "explicit_region_match")).toBe(true);
  });

  // Scenario 2: Event explicitly affects user's city
  it("Scenario 2: Confirms impact when event explicitly names user's city", () => {
    const targetKathmandu: EventLocation = {
      name: "Kathmandu",
      country: "Nepal",
      region: "Bagmati",
      city: "Kathmandu",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetKathmandu);
    expect(assessment.relevanceStatus).toBe("confirmed");
    expect(assessment.impactLevel).toBe("high");
    expect(assessment.evidence.some((e) => e.type === "explicit_city_match")).toBe(true);
    expect(assessment.confidence).toBeGreaterThanOrEqual(0.9);
  });

  // Scenario 3: Event affects another distant region/country
  it("Scenario 3: Marks impact as unlikely when event is in a different country and region", () => {
    const targetTokyo: EventLocation = {
      name: "Tokyo",
      country: "Japan",
      city: "Tokyo",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetTokyo);
    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
    expect(assessment.evidence.some((e) => e.type === "no_evidence_available")).toBe(true);
  });

  // Scenario 4: Same-country but unrelated region
  it("Scenario 4: Handles same-country but unrelated distant region without false alerts", () => {
    const odishaCycloneEvent: WeatherEvent = {
      ...baseNepalFloodEvent,
      category: "cyclone",
      hazard: "cyclone",
      title: "Cyclone Alert for Odisha Coastal Districts",
      location: { name: "Odisha", country: "India", region: "Odisha" },
      locations: [{ name: "Odisha", country: "India", region: "Odisha" }],
      affectedRegions: [{ name: "Odisha", country: "India" }],
    };

    const targetRajasthan: EventLocation = {
      name: "Jaipur",
      country: "India",
      region: "Rajasthan",
      city: "Jaipur",
      coordinates: { latitude: 26.9124, longitude: 75.7873 },
    };

    const assessment = engine.assessImpact(odishaCycloneEvent, targetRajasthan);
    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
    expect(assessment.evidence.some((e) => e.type === "explicit_country_match")).toBe(true);
  });

  // Scenario 5: Nearby event without explicit causal relationship
  it("Scenario 5: Attaches proximity evidence without overclaiming causation", () => {
    const earthquakeEvent: WeatherEvent = {
      ...baseNepalFloodEvent,
      category: "earthquake",
      hazard: "earthquake",
      title: "Magnitude 5.2 Earthquake near Lucknow",
      location: {
        name: "Lucknow",
        country: "India",
        region: "Uttar Pradesh",
        coordinates: { latitude: 26.8467, longitude: 80.9462 },
      },
      locations: [{ name: "Lucknow", country: "India", region: "Uttar Pradesh" }],
      affectedRegions: [{ name: "Uttar Pradesh", country: "India" }],
    };

    const targetKanpur: EventLocation = {
      name: "Kanpur",
      country: "India",
      region: "Uttar Pradesh",
      city: "Kanpur",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
    };

    const assessment = engine.assessImpact(earthquakeEvent, targetKanpur);
    expect(assessment.evidence.some((e) => e.type === "geographic_proximity")).toBe(true);
    expect(assessment.evidence.some((e) => e.type === "explicit_region_match")).toBe(true);
  });

  // Scenario 6: Nepal flood + Bihar target with NO downstream evidence
  it("Scenario 6: CRITICAL SAFETY — Nepal flood with NO Indian evidence marks Bihar as monitoring/downstream_unestablished", () => {
    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetPatna);
    expect(assessment.relevanceStatus).not.toBe("confirmed");
    expect(assessment.relevanceStatus).not.toBe("likely");
    expect(assessment.relevanceStatus).toBe("monitoring");
    expect(assessment.impactLevel).toBe("low");
    expect(assessment.evidence.some((e) => e.type === "downstream_unestablished")).toBe(true);
    expect(assessment.reasons.some((r) => r.includes("not established"))).toBe(true);
  });

  // Scenario 7: Nepal flood + Bihar with explicit authoritative Bihar impact
  it("Scenario 7: Confirms impact when official bulletin explicitly includes Bihar", () => {
    const nepalFloodWithBiharAdvisory: WeatherEvent = {
      ...baseNepalFloodEvent,
      affectedRegions: [
        { name: "Bagmati", country: "Nepal" },
        { name: "Bihar", country: "India" },
      ],
      sources: [
        {
          name: "Central Water Commission (CWC)",
          publishedAt: "2026-08-31T11:00:00Z",
          category: "official",
          tier: 1,
        },
      ],
    };

    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
    };

    const assessment = engine.assessImpact(nepalFloodWithBiharAdvisory, targetPatna);
    expect(assessment.relevanceStatus).toBe("confirmed");
    expect(assessment.evidence.some((e) => e.type === "explicit_region_match")).toBe(true);
    expect(assessment.evidence.some((e) => e.type === "official_authority_citation")).toBe(true);
  });

  // Scenario 8: Nepal flood + Kanpur with no supporting evidence
  it("Scenario 8: CRITICAL SAFETY — Nepal flood + distant Kanpur marks as unlikely / no established impact", () => {
    const targetKanpur: EventLocation = {
      name: "Kanpur",
      country: "India",
      region: "Uttar Pradesh",
      city: "Kanpur",
      coordinates: { latitude: 26.4499, longitude: 80.3319 }, // ~510 km away
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetKanpur);
    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
    expect(assessment.evidence.some((e) => e.type === "downstream_unestablished")).toBe(true);
    expect(assessment.reasons.some((r) => r.includes("510 km") || r.includes("far"))).toBe(true);
  });

  // Scenario 9: Weather evidence supporting an event
  it("Scenario 9: Attaches supporting weather evidence when local precipitation is high", () => {
    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
    };

    const assessment = engine.assessImpact(
      baseNepalFloodEvent,
      targetPatna,
      sampleWeatherSnapshot
    );

    expect(assessment.evidence.some((e) => e.type === "weather_condition_aligned")).toBe(true);
    expect(assessment.reasons.some((r) => r.includes("15 mm/h"))).toBe(true);
  });

  // Scenario 10: Weather evidence absent / neutral
  it("Scenario 10: Handles absent or neutral weather gracefully without error", () => {
    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetPatna, undefined);
    expect(assessment.evidence.some((e) => e.type === "weather_condition_aligned")).toBe(false);
    expect(assessment.provenance.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 11: Unknown/insufficient evidence fallback
  it("Scenario 11: Provides conservative evaluation for unclassified target locations", () => {
    const targetUnknown: EventLocation = {
      name: "Remote Point",
      country: "Global",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetUnknown);
    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
  });

  // Scenario 12: Coordinates present vs absent consistency
  it("Scenario 12: Handles location without coordinates gracefully", () => {
    const targetNoCoords: EventLocation = {
      name: "Kathmandu",
      country: "Nepal",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetNoCoords);
    expect(assessment.relevanceStatus).toBe("confirmed");
    expect(assessment.evidence.some((e) => e.type === "explicit_city_match")).toBe(true);
  });

  // Scenario 13: Provenance preservation
  it("Scenario 13: Preserves complete provenance and methodology version", () => {
    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
    };

    const assessment = engine.assessImpact(
      baseNepalFloodEvent,
      targetPatna,
      sampleWeatherSnapshot
    );

    expect(assessment.methodology).toBe("impact-engine-v1");
    expect(assessment.provenance.some((p) => p.provider === "Nepal DHM")).toBe(true);
    expect(assessment.provenance.some((p) => p.provider === "Open-Meteo")).toBe(true);
  });

  // Scenario 14: Deterministic repeatability
  it("Scenario 14: Yields identical deterministic assessments across multiple runs", () => {
    const targetPatna: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
    };

    const run1 = engine.assessImpact(baseNepalFloodEvent, targetPatna);
    const run2 = engine.assessImpact(baseNepalFloodEvent, targetPatna);

    expect(run1.relevanceStatus).toBe(run2.relevanceStatus);
    expect(run1.impactLevel).toBe(run2.impactLevel);
    expect(run1.confidence).toBe(run2.confidence);
    expect(run1.reasons).toEqual(run2.reasons);
    expect(run1.evidence.length).toBe(run2.evidence.length);
  });
});

describe("ImpactEngine Geographic Neighbor Logic", () => {
  let engine: ImpactEngine;

  beforeEach(() => {
    engine = new ImpactEngine();
  });

  const baseNepalFloodEvent: WeatherEvent = {
    id: "evt_nepal_flood_neighbor_test",
    slug: "nepal-flash-floods-neighbor",
    title: "Severe Flash Flooding in Kathmandu Valley, Nepal",
    category: "flash_flood",
    hazard: "flash_flood",
    severity: "high",
    status: "active",
    description: "Torrential monsoon rains triggered heavy flash flooding in Kathmandu, Nepal.",
    location: {
      name: "Kathmandu",
      country: "Nepal",
      region: "Bagmati",
      city: "Kathmandu",
      coordinates: { latitude: 27.7172, longitude: 85.324 },
    },
    locations: [
      {
        name: "Kathmandu",
        country: "Nepal",
        region: "Bagmati",
        city: "Kathmandu",
        coordinates: { latitude: 27.7172, longitude: 85.324 },
      },
    ],
    affectedRegions: [{ name: "Bagmati", country: "Nepal" }],
    firstSeenAt: "2026-08-31T10:00:00Z",
    lastUpdatedAt: "2026-08-31T12:00:00Z",
    confidence: 0.85,
    sourceArticleIds: ["art_neighbor_1"],
    sources: [
      {
        name: "Nepal DHM",
        publishedAt: "2026-08-31T10:00:00Z",
        category: "official",
        tier: 1,
      },
    ],
    impacts: [],
    provenance: [
      {
        provider: "Nepal DHM",
        retrievedAt: "2026-08-31T10:00:00Z",
        dataType: "observation",
      },
    ],
  };

  it("neighboring country (India) does NOT get confirmed or likely status from Nepal flood", () => {
    const targetBihar: EventLocation = {
      name: "Patna",
      country: "India",
      region: "Bihar",
      city: "Patna",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetBihar);

    // Must NOT be confirmed or likely — neighbor adjacency is a hint, not proof
    expect(assessment.relevanceStatus).not.toBe("confirmed");
    expect(assessment.relevanceStatus).not.toBe("likely");
    expect(assessment.evidence.some((e) => e.type === "downstream_unestablished")).toBe(true);
  });

  it("Nepal flood does NOT automatically imply UP impact", () => {
    const targetKanpur: EventLocation = {
      name: "Kanpur",
      country: "India",
      region: "Uttar Pradesh",
      city: "Kanpur",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetKanpur);

    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
    expect(assessment.evidence.some((e) => e.type === "downstream_unestablished")).toBe(true);
  });

  it("distant unrelated country (Japan) remains conservative", () => {
    const targetTokyo: EventLocation = {
      name: "Tokyo",
      country: "Japan",
      city: "Tokyo",
    };

    const assessment = engine.assessImpact(baseNepalFloodEvent, targetTokyo);

    expect(assessment.relevanceStatus).toBe("unlikely");
    expect(assessment.impactLevel).toBe("none");
    expect(assessment.evidence.some((e) => e.type === "no_evidence_available")).toBe(true);
  });

  it("same-country event uses country match logic, not neighbor logic", () => {
    const indianFloodEvent: WeatherEvent = {
      ...baseNepalFloodEvent,
      id: "evt_india_flood_test",
      title: "Flood in Assam",
      location: {
        name: "Guwahati",
        country: "India",
        region: "Assam",
        city: "Guwahati",
      },
      locations: [
        { name: "Guwahati", country: "India", region: "Assam", city: "Guwahati" },
      ],
      affectedRegions: [{ name: "Assam", country: "India" }],
    };

    const targetMumbai: EventLocation = {
      name: "Mumbai",
      country: "India",
      region: "Maharashtra",
      city: "Mumbai",
    };

    const assessment = engine.assessImpact(indianFloodEvent, targetMumbai);

    // Same country but different region without explicit listing — should NOT be confirmed
    expect(assessment.relevanceStatus).not.toBe("confirmed");
    expect(assessment.relevanceStatus).not.toBe("likely");
  });
});

