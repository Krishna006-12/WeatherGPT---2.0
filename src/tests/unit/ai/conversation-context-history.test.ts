import { describe, it, expect, vi } from "vitest";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import type { ConversationTurn, GroundedContext } from "@/types/ai";
import { ContextBuilder } from "@/services/ai/context-builder";

describe("10-Turn Context Retention & Older-Turns Summarization", () => {
  it("ContextBuilder formats <older_turns_summary> and <recent_turns> correctly", () => {
    const builder = new ContextBuilder();
    const ctx: GroundedContext = {
      userQuery: "Should I be concerned about heavy rain tomorrow?",
      intent: "weather",
      recentTurns: [
        { role: "user", content: "What is the temperature in Delhi?" },
        { role: "assistant", content: "Current temperature is 30 degrees Celsius." },
      ],
      olderTurnsSummary: "Condensed summary of prior discussion:\n- Turn 2 (User): Is there a flash flood warning for Patna?",
      untrustedSourceDelimiters: "XML_BOUNDED",
      builtAt: new Date().toISOString(),
    };

    const { prompt } = builder.buildPrompt(ctx);

    expect(prompt).toContain("<conversation_history>");
    expect(prompt).toContain("<older_turns_summary>");
    expect(prompt).toContain("Turn 2 (User): Is there a flash flood warning for Patna?");
    expect(prompt).toContain("<recent_turns count=\"2\">");
    expect(prompt).toContain("[Turn 1 - User]: What is the temperature in Delhi?");
    expect(prompt).toContain("[Turn 2 - Assistant]: Current temperature is 30 degrees Celsius.");
  });

  it("AIOrchestrator: Given a mocked 12-turn session, the prompt sent to the model contains content referencing turn 2 via the summary, not just turns 3–12 verbatim", async () => {
    let capturedPrompt = "";

    const mockAiProvider = new MockAIProvider({
      responseGenerator: (prompt) => {
        capturedPrompt = prompt;
        return JSON.stringify({
          answer: "Based on our conversation, there is no flash flood threat in Patna, and tomorrow looks clear.",
          groundingStatus: "grounded",
          uncertainty: null,
          keyPoints: ["No flood in Patna", "Clear tomorrow"],
        });
      },
    });

    const generateCompletionSpy = vi.spyOn(mockAiProvider, "generateCompletion")
      .mockImplementation(async (prompt, _systemInstruction) => {
        capturedPrompt = prompt;
        return JSON.stringify({
          answer: "Based on our conversation, there is no flash flood threat in Patna, and tomorrow looks clear.",
          groundingStatus: "grounded",
          uncertainty: null,
          keyPoints: ["No flood in Patna", "Clear tomorrow"],
        });
      });

    const orchestrator = new AIOrchestrator({ aiProvider: mockAiProvider });

    // Construct 12 mocked conversation turns:
    // Turn 1: Initial greeting
    // Turn 2: Critical query with distinctive entity "flash flood warning for Patna riverbanks"
    // Turns 3–12: 10 intermediate turns
    const mocked12Turns: ConversationTurn[] = [
      { role: "user", content: "Turn 1: Hello WeatherGPT, can you help me today?", intent: "general" },
      { role: "user", content: "Turn 2: Are there any flash flood advisories for Patna riverbanks?", intent: "weather_event" },
      { role: "assistant", content: "Turn 3: Patna riverbanks currently show no verified flood advisories.", intent: "weather_event" },
      { role: "user", content: "Turn 4: What is the humidity in Lucknow?", intent: "weather" },
      { role: "assistant", content: "Turn 5: Humidity in Lucknow is 65%.", intent: "weather" },
      { role: "user", content: "Turn 6: What is the wind speed in Lucknow?", intent: "weather" },
      { role: "assistant", content: "Turn 7: Wind speed in Lucknow is 12 km/h.", intent: "weather" },
      { role: "user", content: "Turn 8: Is it good for outdoor construction?", intent: "activity" },
      { role: "assistant", content: "Turn 9: Conditions are optimal for construction until 2 PM.", intent: "activity" },
      { role: "user", content: "Turn 10: Will there be afternoon thunderstorms in Lucknow?", intent: "weather" },
      { role: "assistant", content: "Turn 11: Low thunderstorm risk under 15%.", intent: "weather" },
      { role: "user", content: "Turn 12: What about temperature tomorrow in Lucknow?", intent: "forecast" },
    ];

    // Query 13 sent in the active session
    const res = await orchestrator.processQuery({
      message: "What did we conclude about flood risks earlier?",
      sessionId: "session_12_turn_test",
      context: {
        turns: mocked12Turns,
      },
    });

    expect(res.success).toBe(true);
    expect(generateCompletionSpy).toHaveBeenCalled();

    // 1. Assert that the prompt contains <older_turns_summary>
    expect(capturedPrompt).toContain("<older_turns_summary>");

    // 2. Assert that the prompt sent to the model contains content referencing turn 2 via the summary
    expect(capturedPrompt).toContain("Turn 2");
    expect(capturedPrompt).toContain("Patna riverbanks");

    // 3. Assert that <recent_turns> only contains the sliding window of the last 10 turns (turns 3–12)
    expect(capturedPrompt).toContain("<recent_turns count=\"10\">");
    expect(capturedPrompt).toContain("Turn 3: Patna riverbanks currently show no verified flood advisories.");
    expect(capturedPrompt).toContain("Turn 12: What about temperature tomorrow in Lucknow?");

    // 4. Assert that Turn 2 does NOT appear verbatim in <recent_turns>
    const recentTurnsMatch = capturedPrompt.match(/<recent_turns[\s\S]*?<\/recent_turns>/);
    expect(recentTurnsMatch).not.toBeNull();
    const recentTurnsContent = recentTurnsMatch ? recentTurnsMatch[0] : "";
    expect(recentTurnsContent).not.toContain("Turn 2: Are there any flash flood advisories");

    // 5. Assert that the updated conversationContext returned in metadata contains all recorded turns
    if (res.success) {
      const updatedContext = res.data.metadata?.conversationContext;
      expect(updatedContext?.turns?.length).toBe(14); // 12 initial + 1 new user turn + 1 new assistant turn
      expect(updatedContext?.olderTurnsSummary).toBeDefined();
    }
  });

  it("AIOrchestrator: Automatically records user and assistant turns across sequential calls with sessionId", async () => {
    const mockAiProvider = new MockAIProvider();
    mockAiProvider.setResponse(
      JSON.stringify({
        answer: "The weather in Jaipur is 32°C and sunny.",
        groundingStatus: "grounded",
        uncertainty: null,
        keyPoints: ["32°C", "Sunny"],
      })
    );

    const orchestrator = new AIOrchestrator({ aiProvider: mockAiProvider });
    const sessionId = "stateful_chat_session_456";

    // First call
    const res1 = await orchestrator.processQuery({
      message: "What is the weather in Jaipur?",
      sessionId,
    });
    expect(res1.success).toBe(true);
    if (!res1.success) throw new Error("Expected res1 to succeed");
    expect(res1.data.metadata?.conversationContext?.turns?.length).toBe(2); // 1 user + 1 assistant

    // Second call with same sessionId (no explicit context payload required)
    const res2 = await orchestrator.processQuery({
      message: "Will it rain tomorrow in Jaipur?",
      sessionId,
    });
    expect(res2.success).toBe(true);
    if (!res2.success) throw new Error("Expected res2 to succeed");
    expect(res2.data.metadata?.conversationContext?.turns?.length).toBe(4); // 2 previous + 1 user + 1 assistant
  });
});
