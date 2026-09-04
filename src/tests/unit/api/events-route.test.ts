import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetEvents, mockSyncFeeds } = vi.hoisted(() => ({
  mockGetEvents: vi.fn(),
  mockSyncFeeds: vi.fn(),
}));

vi.mock("@/services/news/live-intelligence-service", () => ({
  globalLiveIntelligenceService: {
    getEvents: mockGetEvents,
    syncFeeds: mockSyncFeeds,
  },
}));

import { GET } from "@/app/api/events/route";

describe("GET /api/events Cold Start & Retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing events without triggering sync when repository is populated", async () => {
    mockGetEvents.mockResolvedValue({
      success: true,
      data: [{ id: "evt_1", title: "Test Storm" }],
    });

    const req = new Request("http://localhost:3000/api/events");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(mockSyncFeeds).not.toHaveBeenCalled();
  });

  it("triggers bounded live sync when repository is empty on cold start", async () => {
    mockGetEvents
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [{ id: "evt_synced", title: "Synced Event" }] });

    mockSyncFeeds.mockResolvedValue({
      success: true,
      data: { articlesIngested: 5, eventsCreatedOrUpdated: 1 },
    });

    const req = new Request("http://localhost:3000/api/events");
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(mockSyncFeeds).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.events).toHaveLength(1);
  });

  it("fails gracefully and returns empty state message when live sync fails", async () => {
    mockGetEvents.mockResolvedValue({ success: true, data: [] });
    mockSyncFeeds.mockRejectedValue(new Error("Network timeout"));

    const req = new Request("http://localhost:3000/api/events");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.events).toHaveLength(0);
    expect(body.message).toContain("No verified live weather events are currently available");
  });
});
