import { describe, it, expect, beforeEach, vi } from "vitest";
import { LiveIntelligenceService } from "@/services/news/live-intelligence-service";
import {
  InMemoryEventRepository,
  InMemoryArticleRepository,
} from "@/services/storage/in-memory-repositories";
import type { NewsProvider } from "@/services/news/news-provider";
import sampleArticles from "@/tests/fixtures/sample-articles.json";
import type { NewsArticle } from "@/types/news";

describe("LiveIntelligenceService Pipeline", () => {
  let eventRepo: InMemoryEventRepository;
  let articleRepo: InMemoryArticleRepository;
  let service: LiveIntelligenceService;

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    articleRepo = new InMemoryArticleRepository();
    service = new LiveIntelligenceService({
      eventRepository: eventRepo,
      articleRepository: articleRepo,
    });
  });

  it("ingests, deduplicates, and clusters articles into events", async () => {
    const articles = sampleArticles as NewsArticle[];
    const result = await service.ingestArticles(articles);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articlesIngested).toBe(3);
      expect(result.data.eventsCreatedOrUpdated).toBe(2);
    }

    const eventsResult = await service.getEvents();
    expect(eventsResult.success).toBe(true);
    if (eventsResult.success) {
      expect(eventsResult.data.length).toBe(2);
    }
  });

  it("fetches event details with linked source articles", async () => {
    const articles = sampleArticles as NewsArticle[];
    await service.ingestArticles(articles);

    const eventsResult = await service.getEvents();
    expect(eventsResult.success).toBe(true);
    if (eventsResult.success) {
      const nepalEvent = eventsResult.data.find((e) => e.location.country === "Nepal")!;
      const detailResult = await service.getEventById(nepalEvent.id);

      expect(detailResult.success).toBe(true);
      if (detailResult.success) {
        expect(detailResult.data.event.id).toBe(nepalEvent.id);
        expect(detailResult.data.articles.length).toBe(2);
      }
    }
  });

  it("syncs feeds from multiple providers seamlessly", async () => {
    const mockProvider: NewsProvider = {
      name: "Mock Provider",
      getArticles: vi.fn().mockResolvedValue(sampleArticles),
    };

    const multiService = new LiveIntelligenceService({
      eventRepository: eventRepo,
      articleRepository: articleRepo,
      providers: [mockProvider],
    });

    const syncResult = await multiService.syncFeeds();
    expect(syncResult.success).toBe(true);
    expect(mockProvider.getArticles).toHaveBeenCalled();
  });
});
