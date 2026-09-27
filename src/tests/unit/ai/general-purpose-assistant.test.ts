import { describe, it, expect } from "vitest";
import { IntentRouter } from "@/services/ai/intent-router";
import { ContextBuilder } from "@/services/ai/context-builder";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherSnapshot } from "@/types/weather";

function createMockWeatherSnapshot(): WeatherSnapshot {
  return {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.465, longitude: 80.349 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-27T12:00:00Z",
    current: {
      temperature: 32,
      feelsLike: 34,
      humidity: 60,
      precipitation: 0,
      windSpeed: 12,
      windDirection: 90,
      pressure: 1010,
      visibility: 8000,
      uvIndex: 6,
      cloudCover: 15,
      condition: "clear",
      observedAt: "2026-09-27T12:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-27T12:00:00Z",
        timezone: "Asia/Kolkata",
      },
    ],
  };
}

describe("General-Purpose AI Assistant (WeatherGPT 2.0)", () => {
  const router = new IntentRouter();

  it("1. Intent Classification: Routes non-weather topics to 'general' without falsely extracting locations", () => {
    // Coding queries
    expect(router.classify("Write a python function to reverse a string").intent).toBe("general");
    expect(router.classify("How does memory allocation work in C?").intent).toBe("general");
    expect(router.classify("Explain recursion in Python").intent).toBe("general");

    // Writing & communication
    expect(router.classify("Help me write a professional resignation letter").intent).toBe("general");
    expect(router.classify("Draft an email requesting a deadline extension").intent).toBe("general");

    // Science, history, general knowledge
    expect(router.classify("Explain quantum entanglement simply").intent).toBe("general");
    expect(router.classify("What caused the fall of the Roman Empire in 476 AD?").intent).toBe("general");
    expect(router.classify("How does photosynthesis work?").intent).toBe("general");

    // Math & productivity
    expect(router.classify("Solve 3x + 12 = 45").intent).toBe("general");
    expect(router.classify("Help me plan my study schedule for tomorrow").intent).toBe("general");

    // Conversational & casual
    expect(router.classify("Tell me a funny joke").intent).toBe("general");
    expect(router.classify("What is your favorite book?").intent).toBe("general");

    // Weather topics still properly route to weather/forecast
    expect(router.classify("What's the weather in Kanpur?").intent).toBe("weather");
    expect(router.classify("Will it rain tomorrow in Delhi?").intent).toBe("forecast");
  });

  it("2. ContextBuilder: Free-form mode for general queries omits <verified_weather_data> and lifestyle clothing prompt", () => {
    const builder = new ContextBuilder();
    const promptObj = builder.buildPrompt({
      userQuery: "Explain quantum entanglement simply",
      intent: "general",
      channel: "chat",
      builtAt: new Date().toISOString(),
    });

    expect(promptObj.initialGroundingStatus).toBe("general_knowledge");
    expect(promptObj.prompt).not.toContain("<verified_weather_data>");
    expect(promptObj.prompt).not.toContain("lifestyle advice (clothing, comfort, commute, plans)");
    expect(promptObj.prompt).toContain("Provide a comprehensive, high-quality, and helpful response as a versatile personal AI assistant");
    expect(promptObj.systemInstruction).toContain('You are WeatherGPT 2.0 — a personal AI assistant powered by Gemini');
    expect(promptObj.systemInstruction).toContain('Never refuse a question just because it isn\'t about weather');
  });

  it("3. AIOrchestrator: Executes non-weather query end-to-end without calling weather tool", async () => {
    let weatherToolCalled = false;
    const mockWeatherProvider = {
      name: "mock-meteo",
      getWeather: async () => {
        weatherToolCalled = true;
        return createMockWeatherSnapshot();
      },
    };

    const mockAiProvider = new MockAIProvider();
    mockAiProvider.setResponse(
      JSON.stringify({
        answer: "Here is a Python function to reverse a string:\n\n```python\ndef reverse_string(s: str) -> str:\n    return s[::-1]\n```\n\nThis uses slicing with a step of -1 to reverse the string efficiently.",
        groundingStatus: "general_knowledge",
        uncertainty: null,
        keyPoints: ["Uses Python slicing syntax s[::-1]", "Runs in O(n) time complexity"],
      })
    );

    const orchestrator = new AIOrchestrator({
      aiProvider: mockAiProvider,
      weatherService: new WeatherService(mockWeatherProvider),
    });

    const result = await orchestrator.processQuery({
      message: "Write a python function to reverse a string",
      location: {
        name: "Kanpur",
        lat: 26.465,
        lon: 80.349,
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Confirms weather tool was NOT called for coding query even though dashboard had location selected
    expect(weatherToolCalled).toBe(false);
    expect(result.data.intent).toBe("general");
    expect(result.data.groundingStatus).toBe("general_knowledge");
    expect(result.data.answer).toContain("reverse_string");
    expect(result.data.answer).not.toContain("°C");
    expect(result.data.answer).not.toContain("umbrella");
  });
});
