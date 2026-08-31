import { describe, it, expect } from "vitest";
import { normalizeCanonicalUrl } from "@/lib/url-normalizer";

describe("normalizeCanonicalUrl", () => {
  it("removes standard tracking parameters", () => {
    const raw = "https://example.com/article?utm_source=twitter&utm_medium=social&utm_campaign=breaking&id=123";
    const normalized = normalizeCanonicalUrl(raw);
    expect(normalized).toBe("https://example.com/article?id=123");
  });

  it("strips hash fragments and trailing slashes", () => {
    const raw = "https://example.com/weather/india/#comments";
    const normalized = normalizeCanonicalUrl(raw);
    expect(normalized).toBe("https://example.com/weather/india");
  });

  it("handles mixed case hostnames and extra tracking parameters", () => {
    const raw = "HTTPS://News.Example.COM/stories/flood-alert/?fbclid=IwAR123&gclid=xyz&ref=homepage";
    const normalized = normalizeCanonicalUrl(raw);
    expect(normalized).toBe("https://news.example.com/stories/flood-alert");
  });

  it("handles empty or invalid strings safely", () => {
    expect(normalizeCanonicalUrl("")).toBe("");
    expect(normalizeCanonicalUrl("   ")).toBe("");
    expect(normalizeCanonicalUrl("not a valid url#frag")).toBe("not a valid url");
  });
});
