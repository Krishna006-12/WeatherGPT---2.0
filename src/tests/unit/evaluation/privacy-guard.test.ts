import { describe, it, expect } from "vitest";
import { PrivacyGuard } from "@/lib/privacy-guard";

describe("PrivacyGuard — Telemetry PII Scrubber & Coordinate Coarsening", () => {
  describe("1. Coordinate Coarsening", () => {
    it("coarsens high-precision GPS coordinates to 1 decimal place (~11km resolution)", () => {
      const fineCoords = {
        latitude: 28.613928,
        longitude: 77.209021,
      };

      const coarsened = PrivacyGuard.coarsenCoordinates(fineCoords.latitude, fineCoords.longitude);

      expect(coarsened.latitude).toBe(28.6);
      expect(coarsened.longitude).toBe(77.2);
    });

    it("handles negative coordinates correctly", () => {
      const coarsened = PrivacyGuard.coarsenCoordinates(-33.8688, 151.2093);
      expect(coarsened.latitude).toBe(-33.9);
      expect(coarsened.longitude).toBe(151.2);
    });
  });

  describe("2. Text Query Scrubbing", () => {
    it("redacts email addresses from query text", () => {
      const text = "Is it raining at user.test@example.com's farm in Ludhiana?";
      const scrubbed = PrivacyGuard.scrubText(text);

      expect(scrubbed).not.toContain("user.test@example.com");
      expect(scrubbed).toContain("[REDACTED_EMAIL]");
    });

    it("redacts Indian and international telephone numbers from query text", () => {
      const text = "Contact field worker at +91 98765 43210 about spray windows";
      const scrubbed = PrivacyGuard.scrubText(text);

      expect(scrubbed).not.toContain("98765 43210");
      expect(scrubbed).toContain("[REDACTED_PHONE]");
    });

    it("preserves meteorological query terminology while redacting PII", () => {
      const text = "Farmer Ramesh (phone 9123456780) asks: Will wind exceed 15 km/h for wheat spray?";
      const scrubbed = PrivacyGuard.scrubText(text);

      expect(scrubbed).toContain("Will wind exceed 15 km/h for wheat spray?");
      expect(scrubbed).not.toContain("9123456780");
    });
  });

  describe("3. Zero-PII Structural Invariant Assertions", () => {
    it("passes cleanly on valid telemetry records containing non-PII properties", () => {
      const validRecord = {
        traceId: "trc_12345",
        endpoint: "/api/weather",
        latencyMs: 240,
        statusCode: 200,
        taskCompletion: "direct_answer",
        persona: "farmer",
        language: "hi",
        locationName: "Bathinda District",
      };

      expect(() => PrivacyGuard.assertZeroPii(validRecord)).not.toThrow();
    });

    it("throws an explicit error when forbidden email property is present", () => {
      const dirtyRecord = {
        traceId: "trc_12345",
        latencyMs: 240,
        email: "farmer@domain.com",
      };

      expect(() => PrivacyGuard.assertZeroPii(dirtyRecord)).toThrow(
        /forbidden PII property: 'email'/
      );
    });

    it("throws when phone or address properties are present in telemetry", () => {
      const dirtyRecord1 = { traceId: "t1", phoneNumber: "+919876543210" };
      const dirtyRecord2 = { traceId: "t2", streetAddress: "123 Farm Rd" };
      const dirtyRecord3 = { traceId: "t3", ipAddress: "192.168.1.1" };

      expect(() => PrivacyGuard.assertZeroPii(dirtyRecord1)).toThrow(/forbidden PII/);
      expect(() => PrivacyGuard.assertZeroPii(dirtyRecord2)).toThrow(/forbidden PII/);
      expect(() => PrivacyGuard.assertZeroPii(dirtyRecord3)).toThrow(/forbidden PII/);
    });
  });
});
