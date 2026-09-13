import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "@/lib/i18n/translations";

describe("Multilingual Translations Dictionary", () => {
  it("provides comprehensive translations across en, hi, and pa", () => {
    const keys = Object.keys(TRANSLATIONS.en);
    expect(keys.length).toBeGreaterThan(15);

    // Hindi coverage
    for (const k of keys) {
      expect(TRANSLATIONS.hi[k]).toBeDefined();
      expect(typeof TRANSLATIONS.hi[k]).toBe("string");
      expect(TRANSLATIONS.hi[k]?.length).toBeGreaterThan(0);
    }

    // Punjabi coverage
    for (const k of keys) {
      expect(TRANSLATIONS.pa[k]).toBeDefined();
      expect(typeof TRANSLATIONS.pa[k]).toBe("string");
      expect(TRANSLATIONS.pa[k]?.length).toBeGreaterThan(0);
    }
  });

  it("translates key agricultural and risk terms accurately", () => {
    expect(TRANSLATIONS.hi["agri.title"]).toContain("कृषि");
    expect(TRANSLATIONS.pa["agri.title"]).toContain("ਖੇਤੀਬਾੜੀ");
    expect(TRANSLATIONS.hi["risk.cyclone"]).toBe("चक्रवात");
    expect(TRANSLATIONS.pa["risk.cyclone"]).toContain("ਤੂਫਾਨ");
  });
});
