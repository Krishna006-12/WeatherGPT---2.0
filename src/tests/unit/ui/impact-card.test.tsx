import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImpactCard } from "@/components/impact/impact-card";

const { mockUseEvents, mockUseImpact } = vi.hoisted(() => ({
  mockUseEvents: vi.fn(),
  mockUseImpact: vi.fn(),
}));

vi.mock("@/hooks/use-events", () => ({
  useEvents: mockUseEvents,
}));

vi.mock("@/hooks/use-impact", () => ({
  useImpact: mockUseImpact,
}));

describe("ImpactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLocation = {
    id: 1,
    name: "Kanpur",
    displayName: "Kanpur, Uttar Pradesh, India",
    latitude: 26.465,
    longitude: 80.35,
    timezone: "Asia/Kolkata",
    country: "India",
  };

  it("renders stable empty/unassessed state when no event is available instead of disappearing", () => {
    mockUseEvents.mockReturnValue({
      data: { events: [], total: 0 },
      isLoading: false,
    });
    mockUseImpact.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<ImpactCard location={mockLocation} />);
    expect(screen.getByText("Regional Impact")).toBeInTheDocument();
    expect(screen.getByText("Unassessed")).toBeInTheDocument();
    expect(
      screen.getByText(
        /No verified event impact assessment is currently available for this location/i
      )
    ).toBeInTheDocument();
  });

  it("renders grounded impact assessment when active event exists", () => {
    mockUseEvents.mockReturnValue({
      data: {
        events: [
          {
            id: "evt_1",
            title: "Severe Storm",
            severity: "high",
          },
        ],
        total: 1,
      },
      isLoading: false,
    });

    mockUseImpact.mockReturnValue({
      data: {
        relevanceStatus: "confirmed",
        impactLevel: "high",
      },
      isLoading: false,
    });

    render(<ImpactCard location={mockLocation} />);
    expect(screen.getByText("Regional Impact")).toBeInTheDocument();
    expect(screen.getByText("Grounded")).toBeInTheDocument();
    expect(screen.getByText("Kanpur")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });
});
