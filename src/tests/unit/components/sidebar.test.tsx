import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("Sidebar Navigation Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(usePathname).mockReturnValue("/dashboard");
  });

  it("renders all navigation links with real routes and accessible labels", () => {
    render(<Sidebar />);

    const homeLink = screen.getByRole("link", { name: /WeatherGPT Home/i });
    expect(homeLink).toHaveAttribute("href", "/dashboard");

    const dashboardLink = screen.getByRole("link", { name: /Dashboard Overview/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const weatherLink = screen.getByRole("link", { name: /Weather & Observations/i });
    expect(weatherLink).toHaveAttribute("href", "/weather");

    const intelligenceLink = screen.getByRole("link", { name: /Live Disaster Intelligence/i });
    expect(intelligenceLink).toHaveAttribute("href", "/intelligence");

    const impactLink = screen.getByRole("link", { name: /Regional Risk & Impact/i });
    expect(impactLink).toHaveAttribute("href", "/impact");

    const chatLink = screen.getByRole("link", { name: /WeatherGPT AI Copilot/i });
    expect(chatLink).toHaveAttribute("href", "/chat");

    const historyLink = screen.getByRole("link", { name: /Forecast & Meteorological Timeline/i });
    expect(historyLink).toHaveAttribute("href", "/history");

    const settingsLink = screen.getByRole("link", { name: /System Intelligence Settings/i });
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("applies active styling dynamically to Dashboard when pathname is /dashboard", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Sidebar />);

    const dashboardLink = screen.getByRole("link", { name: /Dashboard Overview/i });
    expect(dashboardLink.className).toContain("text-cyan-400");
    expect(dashboardLink.className).toContain("bg-cyan-950/80");

    const weatherLink = screen.getByRole("link", { name: /Weather & Observations/i });
    expect(weatherLink.className).toContain("text-neutral-400");
  });

  it("applies active styling dynamically to Weather when pathname is /weather", () => {
    vi.mocked(usePathname).mockReturnValue("/weather");
    render(<Sidebar />);

    const weatherLink = screen.getByRole("link", { name: /Weather & Observations/i });
    expect(weatherLink.className).toContain("text-cyan-400");
    expect(weatherLink.className).toContain("bg-cyan-950/80");

    const dashboardLink = screen.getByRole("link", { name: /Dashboard Overview/i });
    expect(dashboardLink.className).toContain("text-neutral-400");
  });

  it("applies active styling dynamically to Intelligence when pathname is /intelligence", () => {
    vi.mocked(usePathname).mockReturnValue("/intelligence");
    render(<Sidebar />);

    const intelLink = screen.getByRole("link", { name: /Live Disaster Intelligence/i });
    expect(intelLink.className).toContain("text-cyan-400");
  });

  it("applies active styling dynamically to Impact when pathname is /impact", () => {
    vi.mocked(usePathname).mockReturnValue("/impact");
    render(<Sidebar />);

    const impactLink = screen.getByRole("link", { name: /Regional Risk & Impact/i });
    expect(impactLink.className).toContain("text-cyan-400");
  });

  it("applies active styling dynamically to Chat when pathname is /chat", () => {
    vi.mocked(usePathname).mockReturnValue("/chat");
    render(<Sidebar />);

    const chatLink = screen.getByRole("link", { name: /WeatherGPT AI Copilot/i });
    expect(chatLink.className).toContain("text-cyan-400");
  });

  it("applies active styling dynamically to History when pathname is /history", () => {
    vi.mocked(usePathname).mockReturnValue("/history");
    render(<Sidebar />);

    const historyLink = screen.getByRole("link", { name: /Forecast & Meteorological Timeline/i });
    expect(historyLink.className).toContain("text-cyan-400");
  });

  it("applies active styling dynamically to Settings when pathname is /settings", () => {
    vi.mocked(usePathname).mockReturnValue("/settings");
    render(<Sidebar />);

    const settingsLink = screen.getByRole("link", { name: /System Intelligence Settings/i });
    expect(settingsLink.className).toContain("text-cyan-400");
  });
});
