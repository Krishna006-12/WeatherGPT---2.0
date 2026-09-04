import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiProvider } from "@/services/ai/gemini-provider";

describe("GeminiProvider Adapter", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("Scenario 11: Throws 503 AI_PROVIDER_UNAVAILABLE when API key is missing", async () => {
    const provider = new GeminiProvider({ apiKey: "" });

    await expect(provider.generateCompletion("Hello")).rejects.toThrowError(
      /Gemini API key is not configured/
    );
  });

  it("Scenario 12: Handles rate limits with typed AI_RATE_LIMITED 429 error", async () => {
    const provider = new GeminiProvider({ apiKey: "test-valid-key" });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    } as unknown as Response);

    await expect(provider.generateCompletion("Hello")).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
      statusCode: 429,
    });
  });

  it("Parses valid completion response from Gemini API format", async () => {
    const provider = new GeminiProvider({ apiKey: "test-valid-key" });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"answer":"Rain is likely tomorrow."}' }],
            },
          },
        ],
      }),
    } as unknown as Response);

    const result = await provider.generateCompletion("Will it rain?");
    expect(result).toBe('{"answer":"Rain is likely tomorrow."}');
  });

  it("Scenario 10: Throws AI_RESPONSE_INVALID on missing candidate parts", async () => {
    const provider = new GeminiProvider({ apiKey: "test-valid-key" });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    } as unknown as Response);

    await expect(provider.generateCompletion("Hello")).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
      statusCode: 422,
    });
  });

  it("Configures model dynamically from GEMINI_MODEL env variable", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const provider = new GeminiProvider({ apiKey: "test-valid-key" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"answer":"OK"}' }] } }],
      }),
    } as unknown as Response);
    global.fetch = fetchMock;

    await provider.generateCompletion("Test prompt");
    expect(fetchMock).toHaveBeenCalledOnce();
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("/models/gemini-2.5-flash:generateContent");
  });
});
