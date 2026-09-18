import { describe, it, expect } from "vitest";
import {
  damerauLevenshtein,
  getCityCorrection,
} from "@/services/location/city-corrections";

describe("city-corrections", () => {
  describe("damerauLevenshtein", () => {
    it("returns 0 for identical strings", () => {
      expect(damerauLevenshtein("dubai", "dubai")).toBe(0);
      expect(damerauLevenshtein("", "")).toBe(0);
    });

    it("handles single transposition (adjacent swap)", () => {
      expect(damerauLevenshtein("duabi", "dubai")).toBe(1);
      expect(damerauLevenshtein("dehli", "delhi")).toBe(1);
    });

    it("handles single insertion and deletion", () => {
      expect(damerauLevenshtein("mubai", "mumbai")).toBe(1); // deletion
      expect(damerauLevenshtein("lucknoww", "lucknow")).toBe(1); // insertion
    });
  });

  describe("getCityCorrection", () => {
    it("resolves 'duabi' to 'Dubai'", () => {
      expect(getCityCorrection("duabi")).toBe("Dubai");
      expect(getCityCorrection("DUABI")).toBe("Dubai");
      expect(getCityCorrection("  duabi  ")).toBe("Dubai");
    });

    it("resolves Indian metro misspellings and common aliases", () => {
      expect(getCityCorrection("mubai")).toBe("Mumbai");
      expect(getCityCorrection("bombay")).toBe("Mumbai");
      expect(getCityCorrection("dehli")).toBe("Delhi");
      expect(getCityCorrection("dilli")).toBe("Delhi");
      expect(getCityCorrection("banglore")).toBe("Bengaluru");
      expect(getCityCorrection("kolkatta")).toBe("Kolkata");
      expect(getCityCorrection("chandigadh")).toBe("Chandigarh");
      expect(getCityCorrection("ahmdabad")).toBe("Ahmedabad");
      expect(getCityCorrection("cawnpore")).toBe("Kanpur");
      expect(getCityCorrection("banaras")).toBe("Varanasi");
      expect(getCityCorrection("gurgaon")).toBe("Gurugram");
    });

    it("resolves global cities", () => {
      expect(getCityCorrection("singapur")).toBe("Singapore");
      expect(getCityCorrection("londan")).toBe("London");
      expect(getCityCorrection("tokio")).toBe("Tokyo");
    });

    it("returns null for short strings (<3 chars)", () => {
      expect(getCityCorrection("ab")).toBeNull();
      expect(getCityCorrection("")).toBeNull();
    });

    it("returns null or existing match for already correctly spelled uncommon names", () => {
      expect(getCityCorrection("unrelatedrandomword")).toBeNull();
    });
  });
});
