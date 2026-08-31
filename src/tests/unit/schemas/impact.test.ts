import { describe, it, expect } from "vitest";
import { impactAssessmentSchema, impactQuerySchema } from "@/schemas/impact";

describe("Impact Schemas Validation", () => {
  it("validates a valid ImpactAssessment structure", () => {
    const validAssessment = {
      id: "imp_12345",
      eventId: "evt_67890",
      targetLocation: {
        name: "Patna",
        country: "India",
        region: "Bihar",
        city: "Patna",
      },
      hazard: "flood",
      impactLevel: "high",
      relevanceStatus: "confirmed",
      confidence: 0.9,
      reasons: ["Direct regional impact confirmed."],
      evidence: [
        {
          type: "explicit_region_match",
          description: "Target region Bihar is explicitly listed.",
          weight: "supporting",
        },
      ],
      assessedAt: "2026-09-01T00:00:00Z",
      methodology: "impact-engine-v1",
      provenance: [
        {
          provider: "GDACS Disaster Alerts",
          retrievedAt: "2026-09-01T00:00:00Z",
          dataType: "observation",
        },
      ],
    };

    const result = impactAssessmentSchema.safeParse(validAssessment);
    expect(result.success).toBe(true);
  });

  it("validates impact query input parameters", () => {
    const validQuery = {
      eventId: "evt_123",
      lat: "26.4499",
      lon: "80.3319",
      city: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
    };

    const result = impactQuerySchema.safeParse(validQuery);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBe(26.4499);
      expect(result.data.lon).toBe(80.3319);
    }
  });

  it("rejects query with invalid coordinates", () => {
    const invalidQuery = {
      eventId: "evt_123",
      lat: "95.0", // Exceeds 90
      lon: "80.3319",
    };

    const result = impactQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
  });
});
