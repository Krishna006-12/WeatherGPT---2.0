import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RssFeedProvider, parseXmlFeedItems } from "@/services/news/rss-feed-provider";
import fs from "node:fs";
import path from "node:path";

describe("RssFeedProvider", () => {
  const originalFetch = globalThis.fetch;
  const sampleXml = fs.readFileSync(
    path.join(process.cwd(), "src/tests/fixtures/sample-rss-feed.xml"),
    "utf-8"
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses RSS 2.0 XML feed items accurately", () => {
    const items = parseXmlFeedItems(sampleXml);
    expect(items.length).toBe(3);
    expect(items[0]?.title).toContain("Flash Floods and Landslides in Kathmandu");
    expect(items[0]?.link).toContain("gdacs.org");
    expect(items[1]?.title).toContain("Cyclone Alert");
  });

  it("fetches and normalizes articles with source tiering", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(sampleXml),
    });

    const provider = new RssFeedProvider({
      name: "GDACS Disaster Alerts",
      feedUrl: "https://www.gdacs.org/xml/rss.xml",
    });

    const articles = await provider.getArticles();
    expect(articles.length).toBe(3);
    expect(articles[0]?.sourceTier).toBe(1); // GDACS is Tier 1
    expect(articles[0]?.url).not.toContain("utm_source"); // Canonical URL normalized
    expect(articles[0]?.provenance.provider).toBe("GDACS Disaster Alerts");
  });

  it("handles HTTP error gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const provider = new RssFeedProvider({
      name: "GDACS",
      feedUrl: "https://www.gdacs.org/xml/rss.xml",
    });

    await expect(provider.getArticles()).rejects.toThrow("returned status 500");
  });
});
