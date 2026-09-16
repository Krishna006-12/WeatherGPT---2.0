import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/services/ai/prompts/prompt-composer";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { TRANSLATIONS } from "@/lib/i18n/translations";
import { AppError } from "@/lib/errors";

describe("Multilingual Language Switching & Translation Parity", () => {
  describe("PromptComposer Language & Persona Directives", () => {
    it("injects mandatory Hindi language directive when language is 'hi'", () => {
      const prompt = buildSystemPrompt({
        intent: "weather",
        language: "hi",
      });

      expect(prompt).toContain("MANDATORY LANGUAGE DIRECTIVE: HINDI (हिन्दी)");
      expect(prompt).toContain("Devanagari script");
      expect(prompt).toContain("Do NOT respond in English");
    });

    it("injects English language directive when language is 'en' or undefined", () => {
      const promptEn = buildSystemPrompt({
        intent: "weather",
        language: "en",
      });
      expect(promptEn).toContain("MANDATORY LANGUAGE DIRECTIVE: ENGLISH");

      const promptDefault = buildSystemPrompt({
        intent: "weather",
      });
      expect(promptDefault).toContain("MANDATORY LANGUAGE DIRECTIVE: ENGLISH");
    });

    it("injects Punjabi language directive when language is 'pa'", () => {
      const prompt = buildSystemPrompt({
        intent: "weather",
        language: "pa",
      });
      expect(prompt).toContain("MANDATORY LANGUAGE DIRECTIVE: PUNJABI (ਪੰਜਾਬੀ)");
      expect(prompt).toContain("Gurmukhi script");
    });

    it("injects farmer persona addendum when persona is 'farmer'", () => {
      const prompt = buildSystemPrompt({
        intent: "weather",
        persona: "farmer",
        language: "en",
      });

      expect(prompt).toContain("ACTIVE PERSONA: AGRICULTURAL PRODUCER (Farmer)");
      expect(prompt).toContain("agricultural intelligence");
      expect(prompt).toContain("waterlogging");
    });

    it("injects general public persona addendum by default", () => {
      const prompt = buildSystemPrompt({
        intent: "weather",
      });

      expect(prompt).toContain("ACTIVE PERSONA: GENERAL PUBLIC (Daily Citizen)");
      expect(prompt).toContain("Everyday citizens");
    });
  });

  describe("AIOrchestrator Language & Persona Output Switching", () => {
    it("produces Hindi fallback response when language is set to 'hi'", async () => {
      const mockProvider = new MockAIProvider();
      // Simulate provider unavailability so fallback is triggered cleanly
      mockProvider.setFailure(new AppError("AI_PROVIDER_UNAVAILABLE", "Downstream error", 502));

      const orchestrator = new AIOrchestrator({ aiProvider: mockProvider });

      const res = await orchestrator.processQuery({
        message: "Hello, what is the weather?",
        language: "hi",
        persona: "general_public",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.answer).toContain("नमस्ते");
        expect(res.data.answer).toContain("WeatherGPT कोपायलट");
      }
    });

    it("produces English fallback response when language is set to 'en'", async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.setFailure(new AppError("AI_PROVIDER_UNAVAILABLE", "Downstream error", 502));

      const orchestrator = new AIOrchestrator({ aiProvider: mockProvider });

      const res = await orchestrator.processQuery({
        message: "Hello",
        language: "en",
        persona: "general_public",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.answer).toContain("Hello! I am WeatherGPT Copilot");
      }
    });
  });

  describe("Translation Dictionary Key Parity", () => {
    it("ensures all keys in English exist in Hindi and Punjabi dictionaries", () => {
      const enKeys = Object.keys(TRANSLATIONS.en);
      expect(enKeys.length).toBeGreaterThan(50);

      for (const key of enKeys) {
        expect(TRANSLATIONS.hi[key]).toBeDefined();
        expect(typeof TRANSLATIONS.hi[key]).toBe("string");
        expect(TRANSLATIONS.hi[key]?.trim().length).toBeGreaterThan(0);

        expect(TRANSLATIONS.pa[key]).toBeDefined();
        expect(typeof TRANSLATIONS.pa[key]).toBe("string");
        expect(TRANSLATIONS.pa[key]?.trim().length).toBeGreaterThan(0);
      }
    });

    it("has specific alert and persona keys translated in Hindi", () => {
      expect(TRANSLATIONS.hi["alert.extreme"]).toBe("अत्यधिक चेतावनी");
      expect(TRANSLATIONS.hi["alert.severe"]).toBe("गंभीर परामर्श");
      expect(TRANSLATIONS.hi["persona.farmer"]).toContain("किसान");
    });
  });
});
