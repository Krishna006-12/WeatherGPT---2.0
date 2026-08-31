import { describe, it, expect } from "vitest";
import { detectEventCategory } from "@/lib/category-mapper";

describe("detectEventCategory", () => {
  it("detects flood and flash flood categories", () => {
    expect(detectEventCategory("Flash floods swamp Kathmandu valley")).toBe("flash_flood");
    expect(detectEventCategory("River Bagmati overflows causing widespread flooding")).toBe("flood");
    expect(detectEventCategory("Inundation and waterlogging in low-lying areas")).toBe("flood");
  });

  it("detects cyclonic and storm categories", () => {
    expect(detectEventCategory("Super Cyclone approaching Odisha coast")).toBe("cyclone");
    expect(detectEventCategory("Tropical storm warning issued for Bay of Bengal")).toBe("tropical_storm");
    expect(detectEventCategory("Severe thunderstorms and lightning strikes reported")).toBe("lightning");
  });

  it("detects geological and temperature hazards", () => {
    expect(detectEventCategory("Magnitude 6.2 earthquake hits central region")).toBe("earthquake");
    expect(detectEventCategory("Massive landslide blocks major highway in Uttarakhand")).toBe("landslide");
    expect(detectEventCategory("Scorching heatwave warning across North India")).toBe("heatwave");
    expect(detectEventCategory("Severe cold wave and dense fog alert")).toBe("cold_wave");
    expect(detectEventCategory("Wildfire spreads in mountain forest")).toBe("wildfire");
  });

  it("returns other for generic or unclassified text", () => {
    expect(detectEventCategory("Annual city council meeting held yesterday")).toBe("other");
    expect(detectEventCategory("")).toBe("other");
  });
});
