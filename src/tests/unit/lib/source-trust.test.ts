import { describe, it, expect } from "vitest";
import { classifySource } from "@/lib/source-trust";

describe("classifySource", () => {
  it("classifies official authorities as Tier 1", () => {
    expect(classifySource("India Meteorological Department (IMD)").tier).toBe(1);
    expect(classifySource("IMD Bulletin").category).toBe("official");
    expect(classifySource("GDACS Disaster Alert").tier).toBe(1);
    expect(classifySource("NOAA National Weather Service").tier).toBe(1);
    expect(classifySource("ReliefWeb UN OCHA").tier).toBe(1);
    expect(classifySource("Central Water Commission (CWC)").tier).toBe(1);
  });

  it("classifies established wire and news organizations as Tier 2", () => {
    expect(classifySource("Reuters").tier).toBe(2);
    expect(classifySource("Reuters").category).toBe("wire");
    expect(classifySource("Press Trust of India (PTI)").tier).toBe(2);
    expect(classifySource("BBC News").tier).toBe(2);
    expect(classifySource("The Hindu").tier).toBe(2);
    expect(classifySource("Times of India").tier).toBe(2);
  });

  it("classifies unlisted sources as Tier 3", () => {
    expect(classifySource("Local Weather Blog").tier).toBe(3);
    expect(classifySource("Random Community Feed").category).toBe("other");
  });
});
