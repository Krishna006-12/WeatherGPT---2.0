import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FloatingCopilotWidget } from "@/components/chat/floating-copilot-widget";

// Mock next/navigation
let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock LocationContext
vi.mock("@/context/location-context", () => ({
  useLocation: () => ({
    selectedLocation: {
      id: 1,
      name: "Gurugram",
      displayName: "Gurugram, Haryana, India",
      latitude: 28.4595,
      longitude: 77.0266,
      timezone: "Asia/Kolkata",
      country: "India",
    },
    setSelectedLocation: vi.fn(),
  }),
}));

// Mock LanguageContext
vi.mock("@/context/language-context", () => ({
  useLanguage: () => ({
    t: (_k: string, d: string) => d,
    language: "en",
    setLanguage: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    isFarmer: false,
    persona: "general_public",
    user: null,
  }),
}));

// Mock Haptics
vi.mock("@/lib/motion/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

describe("FloatingCopilotWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPathname = "/dashboard";
    localStorage.clear();
  });

  it("renders collapsed floating pill button on normal routes", () => {
    render(<FloatingCopilotWidget />);

    const button = screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByText("Ask WeatherGPT")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("does not render on dedicated /chat route to prevent duplicate UI", () => {
    mockPathname = "/chat";
    const { container } = render(<FloatingCopilotWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render on dedicated /copilot route to prevent duplicate UI", () => {
    mockPathname = "/copilot";
    const { container } = render(<FloatingCopilotWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("expands to functional chat interface when pill button is clicked", () => {
    render(<FloatingCopilotWidget />);

    const button = screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i });
    fireEvent.click(button);

    // Should render the dialog flyout
    const dialog = screen.getByRole("dialog", { name: /WeatherGPT AI Copilot Dialogue/i });
    expect(dialog).toBeInTheDocument();

    // Check that AICopilotCard inside the flyout is rendered in expanded state
    expect(screen.getByPlaceholderText(/Ask Copilot/i)).toBeInTheDocument();
  });

  it("closes the flyout when close button is clicked", () => {
    render(<FloatingCopilotWidget />);

    // Open flyout
    const button = screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click close button inside header
    const closeBtn = screen.getByRole("button", { name: /Close Copilot/i });
    fireEvent.click(closeBtn);

    // Dialog should be closed, pill visible again
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i })).toBeInTheDocument();
  });

  it("closes the flyout on Escape key", () => {
    render(<FloatingCopilotWidget />);

    // Open flyout
    fireEvent.click(screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open WeatherGPT AI Copilot/i })).toBeInTheDocument();
  });

  it("toggles the flyout with Cmd+K or Ctrl+K shortcut", () => {
    render(<FloatingCopilotWidget />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Press Cmd+K
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press Cmd+K again to toggle closed
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
