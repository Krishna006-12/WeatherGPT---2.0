import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar Navigation Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("renders all navigation buttons with accessible labels and titles", () => {
    render(<Sidebar />);

    expect(screen.getByRole("button", { name: /WeatherGPT Home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Location & Current Conditions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Live Intelligence & Impact Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Forecast & Meteorological Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /WeatherGPT AI Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /System Intelligence Settings/i })).toBeInTheDocument();
  });

  it("scrolls smoothly to the target section when a navigation button is clicked", () => {
    const scrollIntoViewMock = vi.fn();
    const mockElement = document.createElement("div");
    mockElement.id = "section-forecast";
    mockElement.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(mockElement);

    render(<Sidebar />);

    const forecastBtn = screen.getByRole("button", { name: /Forecast & Meteorological Timeline/i });
    fireEvent.click(forecastBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    document.body.removeChild(mockElement);
  });

  it("opens and closes the system settings popover dialog", () => {
    render(<Sidebar />);

    // Dialog is not open initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click settings button
    const settingsBtn = screen.getByRole("button", { name: /System Intelligence Settings/i });
    fireEvent.click(settingsBtn);

    // Dialog is visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/System Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Intelligence Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Gemini 2.5 Flash/i)).toBeInTheDocument();

    // Close via close button
    const closeBtn = screen.getByRole("button", { name: /Close Settings/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes settings popover when Escape key is pressed", () => {
    render(<Sidebar />);

    const settingsBtn = screen.getByRole("button", { name: /System Intelligence Settings/i });
    fireEvent.click(settingsBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
