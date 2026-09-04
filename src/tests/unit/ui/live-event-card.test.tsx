import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveEventCard, getEventIndiaRelevance } from "@/components/events/live-event-card";
import type { WeatherEvent } from "@/types/events";

const { mockUseEvents } = vi.hoisted(() => ({
  mockUseEvents: vi.fn(),
}));

vi.mock("@/hooks/use-events", () => ({
  useEvents: mockUseEvents,
}));

describe("LiveEventCard & Dynamic India Relevance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates Direct/High relevance for events located in India", () => {
    const indiaEvent = {
      location: { country: "India", name: "Mumbai" },
      locations: [{ country: "India", name: "Mumbai" }],
      affectedRegions: [],
      severity: "high",
      impacts: [],
    } as unknown as WeatherEvent;

    const relevance = getEventIndiaRelevance(indiaEvent);
    expect(relevance.label).toBe("High");
    expect(relevance.badgeClass).toContain("red");
  });

  it("calculates Monitoring relevance for events in neighboring countries", () => {
    const nepalEvent = {
      location: { country: "Nepal", name: "Kathmandu" },
      locations: [{ country: "Nepal", name: "Kathmandu" }],
      affectedRegions: [],
      severity: "high",
      impacts: [],
    } as unknown as WeatherEvent;

    const relevance = getEventIndiaRelevance(nepalEvent);
    expect(relevance.label).toBe("Monitoring");
    expect(relevance.badgeClass).toContain("amber");
  });

  it("calculates Low (Distant) relevance for events far from India", () => {
    const distantEvent = {
      location: { country: "Greece", name: "Athens" },
      locations: [{ country: "Greece", name: "Athens" }],
      affectedRegions: [],
      severity: "moderate",
      impacts: [],
    } as unknown as WeatherEvent;

    const relevance = getEventIndiaRelevance(distantEvent);
    expect(relevance.label).toBe("Low (Distant)");
  });

  it("renders live event with dynamic India relevance badge in UI", () => {
    mockUseEvents.mockReturnValue({
      data: {
        events: [
          {
            id: "evt_1",
            title: "Severe Flood Bulletin",
            severity: "high",
            location: { country: "India", name: "Assam" },
            locations: [{ country: "India", name: "Assam" }],
            affectedRegions: [],
            sources: [{ name: "IMD", publishedAt: "2026-09-01T00:00:00Z" }],
            impacts: [],
          },
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<LiveEventCard />);
    expect(screen.getByText("Severe Flood Bulletin")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument(); // India Relevance
  });

  it("renders empty state message when no events exist", () => {
    mockUseEvents.mockReturnValue({
      data: { events: [], total: 0 },
      isLoading: false,
    });

    render(<LiveEventCard />);
    expect(screen.getByText("No active live events.")).toBeInTheDocument();
  });
});
