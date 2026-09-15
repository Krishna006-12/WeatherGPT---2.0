import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  estimateTokenCount,
  MAX_SYSTEM_PROMPT_TOKENS,
} from "@/services/ai/prompts/prompt-composer";

describe("buildSystemPrompt Composer & Token Guard", () => {
  it("Scenario 1: General chat excludes all domain blocks and voice addendum", () => {
    const prompt = buildSystemPrompt({ intent: "general", channel: "chat" });

    // Includes core antigravity rules
    expect(prompt).toContain("You are WeatherGPT 2.0");
    expect(prompt).toContain("LAYER 0 — INTAKE & INTENT CLASSIFICATION");
    expect(prompt).toContain("LAYER 1 — GROUNDING GATE");
    expect(prompt).toContain("PROMPT INJECTION DEFENSE");

    // Includes chat formatting
    expect(prompt).toContain("CHANNEL GUIDELINES — INTERACTIVE CHAT");

    // Strictly excludes domain blocks
    expect(prompt).not.toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
    expect(prompt).not.toContain("DOMAIN EXTENSION — UNIFIED WEATHER RISK & DISASTER CENTER");
    expect(prompt).not.toContain("DOMAIN EXTENSION — ACTIVITY SUITABILITY");

    // Strictly excludes voice override
    expect(prompt).not.toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
    expect(prompt).not.toContain("STRICT NO-MARKDOWN & NO-VISUAL FORMATTING");
  });

  it("Scenario 2: Agriculture intent includes ONLY agriculture domain block and chat formatting", () => {
    const prompt = buildSystemPrompt({ intent: "agriculture", channel: "chat" });

    expect(prompt).toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
    expect(prompt).toContain("A.1 INTERNAL DATA VALIDATION");
    expect(prompt).toContain("A.2 AGRONOMIC CONSTRAINTS");
    expect(prompt).toContain("A.3 USER-FACING PRESENTATION (DEFERS TO CORE LAYER 2)");

    // Excludes other domain blocks
    expect(prompt).not.toContain("DOMAIN EXTENSION — UNIFIED WEATHER RISK & DISASTER CENTER");
    expect(prompt).not.toContain("DOMAIN EXTENSION — ACTIVITY SUITABILITY");

    // Excludes voice addendum
    expect(prompt).not.toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
    expect(prompt).toContain("CHANNEL GUIDELINES — INTERACTIVE CHAT");
  });

  it("Scenario 3: Risk intent includes the risk block and excludes agriculture/activity", () => {
    const prompt = buildSystemPrompt({ intent: "risk", channel: "chat" });

    expect(prompt).toContain("DOMAIN EXTENSION — UNIFIED WEATHER RISK & DISASTER CENTER");
    expect(prompt).toContain("R.1 INTERNAL HAZARD VALIDATION");
    expect(prompt).toContain("R.2 SEVERE ALERT PRIORITIZATION");

    expect(prompt).not.toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
    expect(prompt).not.toContain("DOMAIN EXTENSION — ACTIVITY SUITABILITY");
    expect(prompt).not.toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
  });

  it("Scenario 4: Severe active alert triggers inclusion of risk block even if intent is not risk", () => {
    const prompt = buildSystemPrompt({
      intent: "weather",
      channel: "chat",
      hasActiveSevereAlert: true,
    });

    expect(prompt).toContain("DOMAIN EXTENSION — UNIFIED WEATHER RISK & DISASTER CENTER");
    expect(prompt).not.toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
  });

  it("Scenario 5: Activity intent includes activity block and excludes agriculture/risk", () => {
    const prompt = buildSystemPrompt({ intent: "activity", channel: "chat" });

    expect(prompt).toContain("DOMAIN EXTENSION — ACTIVITY SUITABILITY & DECISION INTELLIGENCE");
    expect(prompt).toContain("AC.1 INTERNAL SUITABILITY VALIDATION");

    expect(prompt).not.toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
    expect(prompt).not.toContain("DOMAIN EXTENSION — UNIFIED WEATHER RISK & DISASTER CENTER");
    expect(prompt).not.toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
  });

  it("Scenario 6: Voice channel includes voice addendum and excludes chat formatting rules", () => {
    const prompt = buildSystemPrompt({ intent: "weather", channel: "voice" });

    expect(prompt).toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
    expect(prompt).toContain("V.1 STRICT NO-MARKDOWN & NO-VISUAL FORMATTING");
    expect(prompt).toContain("V.2 CADENCE & SENTENCE LENGTH FOR TTS");
    expect(prompt).toContain("V.3 PHONETIC PRONUNCIATION OF METEOROLOGICAL UNITS");

    // Strictly excludes chat-only formatting rules
    expect(prompt).not.toContain("CHANNEL GUIDELINES — INTERACTIVE CHAT");
  });

  it("Scenario 7: Supports alternative function signature buildSystemPrompt(intent, channel)", () => {
    const prompt = buildSystemPrompt("agriculture", "voice");

    expect(prompt).toContain("DOMAIN EXTENSION — AGRICULTURAL INTELLIGENCE");
    expect(prompt).toContain("CHANNEL OVERRIDE — VOICE ASSISTANT & SPEECH SYNTHESIS");
    expect(prompt).not.toContain("CHANNEL GUIDELINES — INTERACTIVE CHAT");
  });

  it("Scenario 8: Enforces token estimation and hard token ceiling limit", () => {
    const normalPrompt = buildSystemPrompt({ intent: "general", channel: "chat" });
    const normalTokens = estimateTokenCount(normalPrompt);

    expect(normalTokens).toBeGreaterThan(500);
    expect(normalTokens).toBeLessThan(MAX_SYSTEM_PROMPT_TOKENS);
  });
});
