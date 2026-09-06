import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GDACSFeedProvider } from "@/services/news/gdacs-provider";
import { USGSFeedProvider } from "@/services/news/usgs-provider";
import { OfficialWeatherAlertsProvider } from "@/services/news/official-weather-provider";
import { globalFreshnessEngine } from "@/services/news/freshness-engine";
import { globalSeverityEngine } from "@/services/news/severity-engine";
import { globalLifecycleEngine } from "@/services/news/lifecycle-engine";
import { globalConfidenceEngine } from "@/services/news/confidence-engine";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import { FeedRegistry } from "@/services/news/feed-registry";
import { InMemoryEventRepository, InMemoryArticleRepository } from "@/services/storage/in-memory-repositories";
import { LiveIntelligenceSyncService } from "@/services/news/live-intelligence-sync-service";
import type { NewsArticle } from "@/types/news";
import type { WeatherEvent } from "@/types/events";

describe("Phase 8 — Live Intelligence 2.0 Engine & Architecture Tests", () => {
  const referenceTime = new Date("2026-09-06T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(referenceTime);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Test A: GDACS RSS parser converts alert levels to correct severity
  it("Test A: GDACS RSS parser converts alert levels to correct severity", async () => {
    const mockRss = `<?xml version="1.0" encoding="utf-8"?>
      <rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:gdacs="http://www.gdacs.org">
        <channel>
          <title>GDACS Alerts</title>
          <item>
            <title>Red Flood in Nepal</title>
            <description>Severe monsoon flooding in Bagmati Province.</description>
            <link>https://www.gdacs.org/report.aspx?eventid=1001</link>
            <pubDate>Sun, 06 Sep 2026 10:00:00 GMT</pubDate>
            <guid>gdacs_1001</guid>
            <geo:lat>27.7172</geo:lat>
            <geo:long>85.3240</geo:long>
            <gdacs:eventtype>FL</gdacs:eventtype>
            <gdacs:alertlevel>Red</gdacs:alertlevel>
            <gdacs:country>Nepal</gdacs:country>
          </item>
          <item>
            <title>Green Cyclone in Pacific</title>
            <description>Tropical depression forming.</description>
            <link>https://www.gdacs.org/report.aspx?eventid=1002</link>
            <pubDate>Sun, 06 Sep 2026 08:00:00 GMT</pubDate>
            <guid>gdacs_1002</guid>
            <geo:lat>15.0</geo:lat>
            <geo:long>140.0</geo:long>
            <gdacs:eventtype>TC</gdacs:eventtype>
            <gdacs:alertlevel>Green</gdacs:alertlevel>
            <gdacs:country>Fiji</gdacs:country>
          </item>
        </channel>
      </rss>`;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(mockRss, { status: 200 }));

    const provider = new GDACSFeedProvider();
    const articles = await provider.fetchArticles();

    expect(articles.length).toBe(2);
    expect(articles[0]!.source.tier).toBe(1);
    expect(articles[0]!.content).toContain("GDACS Alert: Red");
    expect(articles[0]!.content).toContain("Country: Nepal");
    expect(articles[0]!.content).toContain("Coordinates: 27.7172, 85.324");

    expect(articles[1]!.content).toContain("GDACS Alert: Green");
    expect(articles[1]!.content).toContain("Country: Fiji");
  });

  // Test B: USGS GeoJSON parser extracts M>4.5 earthquakes with coordinates
  it("Test B: USGS GeoJSON parser extracts M>4.5 earthquakes with coordinates", async () => {
    const mockGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          id: "us7000test1",
          properties: {
            mag: 6.2,
            place: "45 km E of Kathmandu, Nepal",
            time: 1788775200000,
            url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test1",
            alert: "orange",
            title: "M 6.2 - 45 km E of Kathmandu, Nepal",
          },
          geometry: {
            type: "Point",
            coordinates: [85.7, 27.7, 10.0],
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(mockGeoJson), { status: 200 }));

    const provider = new USGSFeedProvider();
    const articles = await provider.fetchArticles();

    expect(articles.length).toBe(1);
    expect(articles[0]!.source.tier).toBe(1);
    expect(articles[0]!.content).toContain("Magnitude: 6.2");
    expect(articles[0]!.content).toContain("Coordinates: 27.7, 85.7");
    expect(articles[0]!.content).toContain("USGS PAGER Alert: orange");
  });

  // Test C: Official weather provider maps alerts with hazard taxonomy
  it("Test C: Official weather provider maps alerts with hazard taxonomy", async () => {
    const mockAlerts = {
      features: [
        {
          id: "alert_1",
          properties: {
            event: "Flood Warning",
            headline: "Flood Warning issued for River Basin",
            description: "High water levels observed.",
            severity: "Severe",
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(mockAlerts), { status: 200 }));

    const provider = new OfficialWeatherAlertsProvider();
    const articles = await provider.fetchArticles();

    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBe(1);
    expect(articles[0]!.source.tier).toBe(1);
    expect(articles[0]!.title).toContain("Flood Warning");
  });

  // Test D: Freshness engine classifies timestamps correctly
  it("Test D: Freshness engine classifies timestamps correctly (<6h FRESH, 6-24h RECENT, 24-72h AGING, 3-7d STALE, >7d EXPIRED)", () => {
    const now = referenceTime.getTime();

    // 2 hours ago (<6h -> fresh)
    const freshTime = new Date(now - 2 * 3600 * 1000).toISOString();
    const fresh = globalFreshnessEngine.assessFreshness(freshTime, referenceTime);
    expect(fresh.level).toBe("fresh");
    expect(fresh.isLive).toBe(true);

    // 12 hours ago (6-24h -> recent)
    const recentTime = new Date(now - 12 * 3600 * 1000).toISOString();
    const recent = globalFreshnessEngine.assessFreshness(recentTime, referenceTime);
    expect(recent.level).toBe("recent");
    expect(recent.isLive).toBe(true);

    // 36 hours ago (24-72h -> aging)
    const agingTime = new Date(now - 36 * 3600 * 1000).toISOString();
    const aging = globalFreshnessEngine.assessFreshness(agingTime, referenceTime);
    expect(aging.level).toBe("aging");
    expect(aging.isLive).toBe(false);

    // 4 days ago (3-7d -> stale)
    const staleTime = new Date(now - 4 * 24 * 3600 * 1000).toISOString();
    const stale = globalFreshnessEngine.assessFreshness(staleTime, referenceTime);
    expect(stale.level).toBe("stale");
    expect(stale.isLive).toBe(false);

    // 10 days ago (>7d -> expired)
    const expiredTime = new Date(now - 10 * 24 * 3600 * 1000).toISOString();
    const expired = globalFreshnessEngine.assessFreshness(expiredTime, referenceTime);
    expect(expired.level).toBe("expired");
    expect(expired.isLive).toBe(false);
  });

  // Test E: Freshness label generation
  it("Test E: Freshness label generation produces human readable strings", () => {
    const now = referenceTime.getTime();

    const t30m = new Date(now - 30 * 60 * 1000).toISOString();
    expect(globalFreshnessEngine.assessFreshness(t30m, referenceTime).label).toBe("Updated 30 min ago");

    const t3h = new Date(now - 3 * 3600 * 1000).toISOString();
    expect(globalFreshnessEngine.assessFreshness(t3h, referenceTime).label).toBe("Updated 3 hours ago");

    const t2d = new Date(now - 48 * 3600 * 1000).toISOString();
    expect(globalFreshnessEngine.assessFreshness(t2d, referenceTime).label).toBe("Updated 2 days ago");
  });

  // Test F: Severity engine uses authoritative hint when present
  it("Test F: Severity engine uses authoritative hint when present", () => {
    const articleWithHint = {
      title: "Rain showers observed",
      summary: "Minor drizzle",
      category: "heavy_rain",
      authoritativeHint: {
        provider: "GDACS",
        alertLevel: "Red",
        severity: "extreme",
      },
    };

    const severity = globalSeverityEngine.assessArticleSeverity(articleWithHint);
    expect(severity).toBe("extreme");
  });

  // Test G: Severity engine falls back to category baseline when no hint
  it("Test G: Severity engine falls back to category baseline when no hint", () => {
    const articleNoHint = {
      title: "Flood condition report",
      summary: "Water levels rising in low-lying pastures.",
      category: "flood",
    };

    const severity = globalSeverityEngine.assessArticleSeverity(articleNoHint);
    // baseline for flood is "moderate"
    expect(severity).toBe("moderate");
  });

  // Test H: Severity engine detects lexical intensity escalation
  it("Test H: Severity engine detects lexical intensity escalation", () => {
    const escalatedArticle = {
      title: "Catastrophic unprecedented flood disaster causing massive emergency evacuation",
      summary: "Historic devastation across the capital city.",
      category: "flood",
    };

    const severity = globalSeverityEngine.assessArticleSeverity(escalatedArticle);
    expect(severity).toBe("extreme");
  });

  // Test I: Lifecycle engine transitions ACTIVE -> MONITORING -> RESOLVED -> EXPIRED
  it("Test I: Lifecycle engine transitions ACTIVE -> MONITORING -> RESOLVED -> EXPIRED", () => {
    const now = referenceTime.getTime();

    // Fresh event with active reports -> active
    const active = globalLifecycleEngine.determineLifecycle(
      new Date(now - 2 * 3600 * 1000).toISOString(),
      new Date(now - 1 * 3600 * 1000).toISOString(),
      referenceTime
    );
    expect(active).toBe("active");

    // Aging event (36h ago) -> monitoring
    const monitoring = globalLifecycleEngine.determineLifecycle(
      new Date(now - 48 * 3600 * 1000).toISOString(),
      new Date(now - 36 * 3600 * 1000).toISOString(),
      referenceTime
    );
    expect(monitoring).toBe("monitoring");

    // Stale event (4 days ago) -> resolved
    const resolved = globalLifecycleEngine.determineLifecycle(
      new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
      new Date(now - 4 * 24 * 3600 * 1000).toISOString(),
      referenceTime
    );
    expect(resolved).toBe("resolved");

    // Expired event (10 days ago) -> expired
    const expired = globalLifecycleEngine.determineLifecycle(
      new Date(now - 14 * 24 * 3600 * 1000).toISOString(),
      new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
      referenceTime
    );
    expect(expired).toBe("expired");
  });

  // Test J: Confidence engine calculates multi-factor score
  it("Test J: Confidence engine calculates multi-factor score", () => {
    const articles: NewsArticle[] = [
      {
        id: "art_1",
        title: "Official Earthquake Bulletin",
        url: "https://usgs.gov/test",
        source: { name: "USGS", tier: 1, category: "official" },
        sourceTier: 1,
        publishedAt: new Date(referenceTime.getTime() - 3600 * 1000).toISOString(),
        fetchedAt: referenceTime.toISOString(),
        provenance: { provider: "USGS", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
      },
      {
        id: "art_2",
        title: "Earthquake Felt in Kathmandu",
        url: "https://reuters.com/test",
        source: { name: "Reuters", tier: 2, category: "wire" },
        sourceTier: 2,
        publishedAt: new Date(referenceTime.getTime() - 1800 * 1000).toISOString(),
        fetchedAt: referenceTime.toISOString(),
        provenance: { provider: "Reuters", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
      },
    ];

    const score = globalConfidenceEngine.calculateConfidence(articles, referenceTime);
    expect(score).toBeGreaterThanOrEqual(0.85);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  // Test K: Tier 1 source gives higher confidence than Tier 3 alone
  it("Test K: Tier 1 source gives higher confidence than Tier 3 alone", () => {
    const tier1Article: NewsArticle = {
      id: "t1",
      title: "GDACS Flood Alert",
      url: "https://gdacs.org",
      source: { name: "GDACS", tier: 1, category: "official" },
      sourceTier: 1,
      publishedAt: referenceTime.toISOString(),
      fetchedAt: referenceTime.toISOString(),
      provenance: { provider: "GDACS", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
    };

    const tier3Article: NewsArticle = {
      id: "t3",
      title: "Flood reported by blog",
      url: "https://localblog.com",
      source: { name: "Blog", tier: 3, category: "news" },
      sourceTier: 3,
      publishedAt: referenceTime.toISOString(),
      fetchedAt: referenceTime.toISOString(),
      provenance: { provider: "Blog", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
    };

    const conf1 = globalConfidenceEngine.calculateConfidence([tier1Article], referenceTime);
    const conf3 = globalConfidenceEngine.calculateConfidence([tier3Article], referenceTime);

    expect(conf1).toBeGreaterThan(conf3);
  });

  // Test L: Corroboration increases confidence
  it("Test L: Corroboration increases confidence", () => {
    const article1: NewsArticle = {
      id: "c1",
      title: "Storm warning",
      url: "https://wire.com/1",
      source: { name: "AP", tier: 2, category: "wire" },
      sourceTier: 2,
      publishedAt: referenceTime.toISOString(),
      fetchedAt: referenceTime.toISOString(),
      provenance: { provider: "AP", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
    };

    const article2: NewsArticle = {
      id: "c2",
      title: "Second source storm report",
      url: "https://wire2.com/2",
      source: { name: "Reuters", tier: 2, category: "wire" },
      sourceTier: 2,
      publishedAt: referenceTime.toISOString(),
      fetchedAt: referenceTime.toISOString(),
      provenance: { provider: "Reuters", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
    };

    const singleConf = globalConfidenceEngine.calculateConfidence([article1], referenceTime);
    const multiConf = globalConfidenceEngine.calculateConfidence([article1, article2], referenceTime);

    expect(multiConf).toBeGreaterThan(singleConf);
  });

  // Test M: Stale data decreases confidence
  it("Test M: Stale data decreases confidence", () => {
    const freshArticle: NewsArticle = {
      id: "f1",
      title: "Cyclone alert",
      url: "https://imd.gov.in",
      source: { name: "IMD", tier: 1, category: "official" },
      sourceTier: 1,
      publishedAt: new Date(referenceTime.getTime() - 2 * 3600 * 1000).toISOString(),
      fetchedAt: referenceTime.toISOString(),
      provenance: { provider: "IMD", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
    };

    const staleArticle: NewsArticle = {
      ...freshArticle,
      id: "s1",
      publishedAt: new Date(referenceTime.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
    };

    const freshConf = globalConfidenceEngine.calculateConfidence([freshArticle], referenceTime);
    const staleConf = globalConfidenceEngine.calculateConfidence([staleArticle], referenceTime);

    expect(freshConf).toBeGreaterThan(staleConf);
  });

  // Test N: ImpactEngine distinguishes event fact from target impact
  it("Test N: ImpactEngine distinguishes event fact from target impact", () => {
    const nepalEvent: WeatherEvent = {
      id: "evt_nepal_1",
      slug: "nepal-floods-2026",
      title: "Nepal Monsoon Flooding",
      category: "flood",
      hazard: "flood",
      severity: "extreme",
      status: "active",
      description: "Severe flooding in Bagmati River basin.",
      location: { name: "Kathmandu", country: "Nepal", coordinates: { latitude: 27.7172, longitude: 85.3240 } },
      locations: [{ name: "Kathmandu", country: "Nepal" }],
      affectedRegions: [{ name: "Bagmati", country: "Nepal" }],
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.9,
      sourceArticleIds: ["art_1"],
      sources: [{ name: "GDACS", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
    };

    const targetKanpur = { name: "Kanpur", country: "India", coordinates: { latitude: 26.4499, longitude: 80.3319 } };
    const impact = globalImpactEngine.assessImpact(nepalEvent, targetKanpur);

    expect(impact.eventFact).toContain("Nepal");
    expect(impact.eventFact).toContain("extreme");
    expect(impact.geographicRelevance).toBeDefined();
    expect(impact.actualHazardImpact).toContain("Downstream hydrological impact across borders/states is not established");
    expect(impact.relevanceStatus).toBe("unlikely");
    expect(impact.impactLevel).toBe("none");
  });

  // Test O: Nepal flood does NOT produce Kanpur flood impact
  it("Test O: Nepal flood does NOT produce Kanpur flood impact", () => {
    const nepalEvent: WeatherEvent = {
      id: "evt_nepal_2",
      slug: "nepal-floods-2026",
      title: "Severe Flood in Kathmandu Valley",
      category: "flood",
      hazard: "flood",
      severity: "severe",
      status: "active",
      description: "Inundation in Kathmandu Valley.",
      location: { name: "Kathmandu", country: "Nepal", coordinates: { latitude: 27.7172, longitude: 85.3240 } },
      locations: [{ name: "Kathmandu", country: "Nepal" }],
      affectedRegions: [{ name: "Kathmandu", country: "Nepal" }],
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.88,
      sourceArticleIds: ["art_2"],
      sources: [{ name: "GDACS", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
    };

    const targetKanpur = { name: "Kanpur", country: "India", coordinates: { latitude: 26.4499, longitude: 80.3319 } };
    const impact = globalImpactEngine.assessImpact(nepalEvent, targetKanpur);

    expect(impact.impactLevel).toBe("none");
    expect(impact.relevanceStatus).toBe("unlikely");
    expect(impact.actualHazardImpact).toContain("Downstream hydrological impact across borders/states is not established");
  });

  // Test P: Nepal flood does NOT produce Bihar flood impact without advisory
  it("Test P: Nepal flood does NOT produce Bihar flood impact without advisory", () => {
    const nepalEvent: WeatherEvent = {
      id: "evt_nepal_3",
      slug: "nepal-floods-2026",
      title: "Nepal Monsoon Inundation",
      category: "flood",
      hazard: "flood",
      severity: "severe",
      status: "active",
      description: "River levels high in southern Nepal terai.",
      location: { name: "Birgunj", country: "Nepal", coordinates: { latitude: 27.0134, longitude: 84.8773 } },
      locations: [{ name: "Birgunj", country: "Nepal" }],
      affectedRegions: [{ name: "Parsa", country: "Nepal" }], // Does NOT list Bihar explicitly
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.85,
      sourceArticleIds: ["art_3"],
      sources: [{ name: "GDACS", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
    };

    const targetPatna = { name: "Patna", country: "India", region: "Bihar", coordinates: { latitude: 25.5941, longitude: 85.1376 } };
    const impact = globalImpactEngine.assessImpact(nepalEvent, targetPatna);

    // Without explicit advisory listing Bihar, hydrological guard enforces monitoring or unlikely, NOT confirmed flood
    expect(impact.impactLevel).not.toBe("extreme");
    expect(impact.impactLevel).not.toBe("high");
    expect(impact.relevanceStatus).toBe("monitoring");
  });

  // Test Q: India direct event produces DIRECT relevance and high impact
  it("Test Q: India direct event produces DIRECT relevance and high impact", () => {
    const assamEvent: WeatherEvent = {
      id: "evt_assam_1",
      slug: "assam-flood-2026",
      title: "Severe Floods in Assam",
      category: "flood",
      hazard: "flood",
      severity: "severe",
      status: "active",
      description: "Brahmaputra river flowing above danger mark in Guwahati.",
      location: { name: "Guwahati", country: "India", coordinates: { latitude: 26.1445, longitude: 91.7362 } },
      locations: [{ name: "Guwahati", country: "India" }],
      affectedRegions: [{ name: "Kamrup", country: "India" }, { name: "Guwahati", country: "India" }],
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.9,
      sourceArticleIds: ["art_4"],
      sources: [{ name: "IMD", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
    };

    const targetGuwahati = { name: "Guwahati", country: "India", coordinates: { latitude: 26.1445, longitude: 91.7362 } };
    const impact = globalImpactEngine.assessImpact(assamEvent, targetGuwahati);

    expect(impact.relevanceStatus).toBe("confirmed");
    expect(impact.impactLevel).toBe("high");
    expect(impact.actualHazardImpact).toContain("hazard impact confirmed");

    const indiaAssessment = globalImpactEngine.assessIndiaImpact(assamEvent);
    expect(indiaAssessment.level).toBe("DIRECT");
  });

  // Test R: Distant event produces NONE relevance and zero impact
  it("Test R: Distant event produces NONE relevance and zero impact", () => {
    const greeceEvent: WeatherEvent = {
      id: "evt_greece_1",
      slug: "greece-wildfire-2026",
      title: "Wildfire in Attica",
      category: "wildfire",
      hazard: "wildfire",
      severity: "high",
      status: "active",
      description: "Forest fires near Athens.",
      location: { name: "Athens", country: "Greece", coordinates: { latitude: 37.9838, longitude: 23.7275 } },
      locations: [{ name: "Athens", country: "Greece" }],
      affectedRegions: [{ name: "Attica", country: "Greece" }],
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.85,
      sourceArticleIds: ["art_5"],
      sources: [{ name: "EU Emergency", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
    };

    const targetMumbai = { name: "Mumbai", country: "India", coordinates: { latitude: 19.0760, longitude: 72.8777 } };
    const impact = globalImpactEngine.assessImpact(greeceEvent, targetMumbai);

    expect(impact.relevanceStatus).toBe("unlikely");
    expect(impact.impactLevel).toBe("none");
    expect(impact.actualHazardImpact).toBe("No local meteorological hazard impact established.");

    const indiaAssessment = globalImpactEngine.assessIndiaImpact(greeceEvent);
    expect(indiaAssessment.level).toBe("NONE");
  });

  // Test S: Feed registry runs providers concurrently and handles single provider failure
  it("Test S: Feed registry runs providers concurrently and handles single provider failure", async () => {
    const successProvider = {
      name: "GoodProvider",
      tier: 1 as const,
      enabled: true,
      getArticles: vi.fn().mockResolvedValue([
        {
          id: "good_1",
          title: "Valid Article",
          url: "https://good.com/1",
          source: { name: "Good", category: "official" as const, tier: 1 as const },
          sourceTier: 1 as const,
          publishedAt: referenceTime.toISOString(),
          fetchedAt: referenceTime.toISOString(),
          provenance: { provider: "Good", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
        },
      ]),
    };

    const failingProvider = {
      name: "BadProvider",
      tier: 1 as const,
      enabled: true,
      getArticles: vi.fn().mockRejectedValue(new Error("Network timeout")),
    };

    const registry = new FeedRegistry([successProvider, failingProvider]);
    const summary = await registry.fetchAllFeeds();

    expect(summary.articles.length).toBe(1);
    expect(summary.articles[0]!.title).toBe("Valid Article");
    expect(summary.successfulProviders).toContain("GoodProvider");
    expect(summary.failedProviders.length).toBe(1);
  });

  // Test T: In-memory repository filters by active, recent, freshness, and radius
  it("Test T: In-memory repository filters by active, recent, freshness, and radius", async () => {
    const repo = new InMemoryEventRepository();

    const ev1: WeatherEvent = {
      id: "ev_filter_1",
      slug: "event-one",
      title: "Active Fresh Mumbai Cyclone",
      category: "cyclone",
      hazard: "cyclone",
      severity: "severe",
      status: "active",
      description: "Severe cyclone moving towards Mumbai coast.",
      location: { name: "Mumbai", country: "India", coordinates: { latitude: 19.0760, longitude: 72.8777 } },
      locations: [{ name: "Mumbai", country: "India", coordinates: { latitude: 19.0760, longitude: 72.8777 } }],
      affectedRegions: [{ name: "Maharashtra", country: "India" }],
      firstSeenAt: referenceTime.toISOString(),
      lastUpdatedAt: referenceTime.toISOString(),
      confidence: 0.9,
      sourceArticleIds: ["a1"],
      sources: [{ name: "IMD", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
      freshness: { level: "fresh", label: "fresh", isLive: true, ageMinutes: 30, lastCheckedAt: referenceTime.toISOString() },
    };

    const ev2: WeatherEvent = {
      id: "ev_filter_2",
      slug: "event-two",
      title: "Resolved Expired Tokyo Earthquake",
      category: "earthquake",
      hazard: "earthquake",
      severity: "low",
      status: "expired",
      description: "Earthquake reported 10 days ago.",
      location: { name: "Tokyo", country: "Japan", coordinates: { latitude: 35.6762, longitude: 139.6503 } },
      locations: [{ name: "Tokyo", country: "Japan", coordinates: { latitude: 35.6762, longitude: 139.6503 } }],
      affectedRegions: [{ name: "Kanto", country: "Japan" }],
      firstSeenAt: new Date(referenceTime.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
      lastUpdatedAt: new Date(referenceTime.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
      confidence: 0.8,
      sourceArticleIds: ["a2"],
      sources: [{ name: "JMA", tier: 1, category: "official", publishedAt: referenceTime.toISOString() }],
      impacts: [],
      provenance: [],
      freshness: { level: "expired", label: "expired", isLive: false, ageMinutes: 14400, lastCheckedAt: referenceTime.toISOString() },
    };

    await repo.save(ev1);
    await repo.save(ev2);

    // Active filter
    const activeEvents = await repo.findAll({ active: true });
    expect(activeEvents.length).toBe(1);
    expect(activeEvents[0]!.id).toBe("ev_filter_1");

    // Freshness filter
    const freshEvents = await repo.findAll({ freshness: "fresh" });
    expect(freshEvents.length).toBe(1);
    expect(freshEvents[0]!.id).toBe("ev_filter_1");

    // Coordinates distance filter (near Pune, ~120km from Mumbai)
    const nearMumbai = await repo.findAll({
      coordinates: { latitude: 18.5204, longitude: 73.8567, radiusKm: 200 },
    });
    expect(nearMumbai.length).toBe(1);
    expect(nearMumbai[0]!.id).toBe("ev_filter_1");

    // Coordinates distance filter far away (Delhi, >1000km)
    const nearDelhi = await repo.findAll({
      coordinates: { latitude: 28.6139, longitude: 77.2090, radiusKm: 200 },
    });
    expect(nearDelhi.length).toBe(0);
  });

  // Test U: End-to-end sync ingests, clusters, enriches with Phase 8 metadata, and saves
  it("Test U: End-to-end sync ingests, clusters, enriches with Phase 8 metadata, and saves", async () => {
    const articleRepo = new InMemoryArticleRepository();
    const eventRepo = new InMemoryEventRepository();

    const mockProvider = {
      name: "MockOfficialProvider",
      tier: 1 as const,
      enabled: true,
      getArticles: vi.fn().mockResolvedValue([
        {
          id: "sync_art_1",
          title: "Massive Cyclone approaching Odisha Coast",
          url: "https://imd.gov.in/cyclone",
          source: { name: "IMD", category: "official" as const, tier: 1 as const },
          sourceTier: 1 as const,
          publishedAt: referenceTime.toISOString(),
          fetchedAt: referenceTime.toISOString(),
          provenance: { provider: "IMD", retrievedAt: referenceTime.toISOString(), dataType: "observation" },
          summary: "Severe cyclonic storm nearing Puri coast with heavy rainfall and destructive winds.",
        },
      ]),
    };

    const syncService = new LiveIntelligenceSyncService({
      eventRepository: eventRepo,
      articleRepository: articleRepo,
      feedRegistry: new FeedRegistry([mockProvider]),
    });

    const result = await syncService.sync();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.articlesIngested).toBe(1);
    expect(result.data.eventsCreatedOrUpdated).toBe(1);

    const savedEvents = await eventRepo.findAll({ active: true });
    expect(savedEvents.length).toBe(1);

    const event = savedEvents[0];
    expect(event).toBeDefined();
    if (!event) return;
    expect(event.category).toBe("cyclone");
    expect(event.status).toBe("active");
    expect(event.freshness).toBeDefined();
    expect(event.freshness?.level).toBe("fresh");
    expect(event.timeline).toBeDefined();
    expect(event.timeline?.length).toBeGreaterThan(0);
    expect(event.sourceComparison?.highestTier).toBe(1);
  });
});
