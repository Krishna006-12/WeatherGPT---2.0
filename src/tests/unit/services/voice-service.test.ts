import { describe, it, expect } from "vitest";
import { VoiceService, globalVoiceService } from "@/services/voice/voice-service";
import type { WeatherSnapshot } from "@/types/weather";

describe("Phase 12: VoiceService", () => {
  const service = new VoiceService();

  const mockWeather: WeatherSnapshot = {
    location: {
      name: "New Delhi",
      region: "Delhi",
      country: "India",
      coordinates: { latitude: 28.6139, longitude: 77.209 },
      timezone: "Asia/Kolkata",
    },
    current: {
      temperature: 32.4,
      feelsLike: 35.1,
      humidity: 62,
      windSpeed: 18.5,
      windDirection: 90,
      pressure: 1011,
      cloudCover: 30,
      precipitation: 0,
      precipitationProbability: 15,
      condition: "partly-cloudy",
      description: "partly cloudy with gentle breeze",
      uvIndex: 7,
      observedAt: "2026-09-13T10:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-13T10:00:00Z",
        dataType: "current",
      },
    ],
    observedAt: "2026-09-13T10:00:00Z",
  };

  describe("1. Text Cleaning & Speech Normalization", () => {
    it("expands temperature units to full words", () => {
      const input = "Current temperature is 24°C and feels like 26 °C.";
      const cleaned = service.cleanForSpeech(input);
      expect(cleaned).toContain("24 degrees Celsius");
      expect(cleaned).toContain("26 degrees Celsius");
      expect(cleaned).not.toContain("°C");
    });

    it("expands Fahrenheit temperature units", () => {
      const input = "High of 75°F today.";
      const cleaned = service.cleanForSpeech(input);
      expect(cleaned).toContain("75 degrees Fahrenheit");
      expect(cleaned).not.toContain("°F");
    });

    it("expands wind speed, precipitation, and pressure units", () => {
      const input = "Wind speed is 25 km/h with 12.5 mm rain expected at 1013 hPa pressure.";
      const cleaned = service.cleanForSpeech(input);
      expect(cleaned).toContain("25 kilometers per hour");
      expect(cleaned).toContain("12.5 millimeters");
      expect(cleaned).toContain("1013 hectopascals");
      expect(cleaned).not.toContain("km/h");
      expect(cleaned).not.toContain("mm");
      expect(cleaned).not.toContain("hPa");
    });

    it("expands percentage signs to percent", () => {
      const input = "Rain probability is 80% with 65% humidity.";
      const cleaned = service.cleanForSpeech(input);
      expect(cleaned).toContain("80 percent");
      expect(cleaned).toContain("65 percent");
      expect(cleaned).not.toContain("%");
    });

    it("strips markdown formatting, emojis, and code blocks", () => {
      const input = "# Weather Alert ⛈️\n**Severe warning** for [Delhi](https://example.com)!\n`code block`\n- Point 1\n- Point 2";
      const cleaned = service.cleanForSpeech(input);
      expect(cleaned).not.toContain("#");
      expect(cleaned).not.toContain("**");
      expect(cleaned).not.toContain("`");
      expect(cleaned).not.toContain("https://");
      expect(cleaned).not.toContain("⛈️");
      expect(cleaned).toContain("Severe warning for Delhi");
    });
  });

  describe("2. Language Detection", () => {
    it("detects English as default", () => {
      expect(service.detectLanguage("What is the forecast for London?")).toBe("en-US");
    });

    it("detects Devanagari script as Hindi", () => {
      expect(service.detectLanguage("आज का मौसम कैसा है?")).toBe("hi-IN");
    });

    it("detects Hinglish phrasing as Hindi/Hinglish", () => {
      expect(service.detectLanguage("Kanpur mein kal mausam kaisa rahega?")).toBe("hi-IN");
      expect(service.detectLanguage("Kya aaj baarish hogi?")).toBe("hi-IN");
    });
  });

  describe("3. Speaking Cadence & Script Metrics", () => {
    it("calculates word count and estimated speaking duration", () => {
      const text = "This is a short weather briefing for travelers.";
      const metrics = service.computeScriptMetrics(text, "en-US");
      expect(metrics.wordCount).toBe(8);
      expect(metrics.estimatedDurationSeconds).toBeGreaterThan(0);
      expect(metrics.language).toBe("en-US");
    });
  });

  describe("4. Complete Voice Briefing Generation", () => {
    it("generates deterministic VoiceAssistantReport for English", () => {
      const report = service.generateVoiceBriefing({
        weather: mockWeather,
        language: "en-US",
      });

      expect(report.id).toMatch(/^voice_/);
      expect(report.location.name).toBe("New Delhi");
      expect(report.headline).toContain("New Delhi Audio Briefing");
      expect(report.spokenScript.text).toContain("In New Delhi, it is currently 32 degrees Celsius");
      expect(report.spokenScript.wordCount).toBeGreaterThan(10);
      expect(report.highlights.length).toBeGreaterThan(0);
      expect(report.suggestedVoicePrompts.length).toBeGreaterThan(0);
    });

    it("generates natural voice briefing for Hindi / Hinglish", () => {
      const report = service.generateVoiceBriefing({
        weather: mockWeather,
        language: "hi-IN",
      });

      expect(report.spokenScript.language).toBe("hi-IN");
      expect(report.spokenScript.text).toContain("New Delhi mein abhi taapman 32 degrees Celsius hai");
    });

    it("generates briefing from arbitrary Copilot answer text", () => {
      const report = service.generateBriefingFromText({
        text: "The weather in Lucknow is clear with 28°C and light winds.",
        locationName: "Lucknow",
      });

      expect(report.location.name).toBe("Lucknow");
      expect(report.spokenScript.text).toContain("28 degrees Celsius");
      expect(report.spokenScript.language).toBe("en-US");
    });
  });

  describe("5. Global Singleton", () => {
    it("exports globalVoiceService instance", () => {
      expect(globalVoiceService).toBeInstanceOf(VoiceService);
    });
  });
});
