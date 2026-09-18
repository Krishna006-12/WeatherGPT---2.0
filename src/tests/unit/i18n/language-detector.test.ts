import { describe, it, expect } from "vitest";
import { detectInputLanguage } from "@/lib/i18n/language-detector";

describe("detectInputLanguage — Per-Message Language Identification", () => {
  it("detects Hinglish phrasing with conversational Romanized Hindi vocabulary", () => {
    expect(detectInputLanguage("dubai ka mausam")).toBe("hi-en");
    expect(detectInputLanguage("aaj dhoop kaisa hai")).toBe("hi-en");
    expect(detectInputLanguage("kal baarish hogi kya?")).toBe("hi-en");
    expect(detectInputLanguage("Kanpur mein garmi bohot hai")).toBe("hi-en");
    expect(detectInputLanguage("batao kal kaisa mausam rahega")).toBe("hi-en");
    expect(detectInputLanguage("kya aaj shaam ko toofan aayega")).toBe("hi-en");
    expect(detectInputLanguage("fasal ke liye sinchai kab karein")).toBe("hi-en");
  });

  it("detects Hindi in Devanagari script", () => {
    expect(detectInputLanguage("दिल्ली में मौसम कैसा है?")).toBe("hi");
    expect(detectInputLanguage("आज बारिश होगी क्या?")).toBe("hi");
    expect(detectInputLanguage("तापमान कितना है?")).toBe("hi");
  });

  it("detects Punjabi in Gurmukhi script", () => {
    expect(detectInputLanguage("ਅੱਜ ਮੌਸਮ ਕਿਵੇਂ ਹੈ?")).toBe("pa");
    expect(detectInputLanguage("ਕੀ ਮੀਂਹ ਪਵੇਗਾ?")).toBe("pa");
  });

  it("preserves fallback language for standard English queries", () => {
    expect(detectInputLanguage("What is the weather in Dubai?")).toBe("en");
    expect(detectInputLanguage("Will it rain tomorrow in London?")).toBe("en");
    expect(detectInputLanguage("Current temperature in Paris", "en")).toBe("en");
    expect(detectInputLanguage("Current temperature in Paris", "hi")).toBe("hi");
  });

  it("handles null, empty, or whitespace-only inputs gracefully", () => {
    expect(detectInputLanguage("")).toBe("en");
    expect(detectInputLanguage("   ")).toBe("en");
    expect(detectInputLanguage(null as unknown as string, "pa")).toBe("pa");
    expect(detectInputLanguage(undefined as unknown as string, "hi-en")).toBe("hi-en");
  });
});
