import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSyncFeeds } = vi.hoisted(() => ({
  mockSyncFeeds: vi.fn(),
}));

vi.mock("@/services/news/live-intelligence-service", () => ({
  globalLiveIntelligenceService: {
    syncFeeds: mockSyncFeeds,
  },
}));

import { GET, POST } from "@/app/api/events/sync/route";

describe("/api/events/sync Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // --- GET: Non-mutating info ---

  it("GET returns endpoint info without triggering syncFeeds", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.endpoint).toBe("/api/events/sync");
    expect(body.method).toBe("POST");
    expect(body.description).toBeDefined();

    // Critical: syncFeeds must NOT have been called
    expect(mockSyncFeeds).not.toHaveBeenCalled();
  });

  // --- POST: Sync execution ---

  it("POST triggers syncFeeds when no secret is configured", async () => {
    mockSyncFeeds.mockResolvedValue({
      success: true,
      data: {
        articlesIngested: 5,
        articlesDeduplicated: 3,
        eventsCreatedOrUpdated: 2,
        timestamp: "2026-09-01T00:00:00Z",
      },
    });

    const req = new Request("http://localhost:3000/api/events/sync", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSyncFeeds).toHaveBeenCalledOnce();

    const body = await res.json();
    expect(body.message).toContain("synchronized");
    expect(body.articlesIngested).toBe(5);
  });

  // --- POST: Sync secret protection ---

  it("POST returns 401 when secret is configured but header is missing", async () => {
    vi.stubEnv("LIVE_INTEL_SYNC_SECRET", "test-secret-12345");

    const req = new Request("http://localhost:3000/api/events/sync", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("SYNC_UNAUTHORIZED");
    expect(mockSyncFeeds).not.toHaveBeenCalled();
  });

  it("POST returns 403 when secret header does not match", async () => {
    vi.stubEnv("LIVE_INTEL_SYNC_SECRET", "test-secret-12345");

    const req = new Request("http://localhost:3000/api/events/sync", {
      method: "POST",
      headers: { "x-sync-secret": "wrong-secret" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.code).toBe("SYNC_FORBIDDEN");
    expect(mockSyncFeeds).not.toHaveBeenCalled();
  });

  it("POST succeeds with correct secret header", async () => {
    vi.stubEnv("LIVE_INTEL_SYNC_SECRET", "test-secret-12345");

    mockSyncFeeds.mockResolvedValue({
      success: true,
      data: {
        articlesIngested: 3,
        articlesDeduplicated: 2,
        eventsCreatedOrUpdated: 1,
        timestamp: "2026-09-01T00:00:00Z",
      },
    });

    const req = new Request("http://localhost:3000/api/events/sync", {
      method: "POST",
      headers: { "x-sync-secret": "test-secret-12345" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSyncFeeds).toHaveBeenCalledOnce();
  });

  it("POST returns 502 with FEED_SYNC_FAILED when sync fails", async () => {
    mockSyncFeeds.mockResolvedValue({
      success: false,
      error: new Error("Network timeout"),
    });

    const req = new Request("http://localhost:3000/api/events/sync", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error.code).toBe("FEED_SYNC_FAILED");
  });
});
