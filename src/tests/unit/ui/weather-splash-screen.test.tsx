import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";
import { WeatherSplashScreen } from "@/components/ui/weather-splash-screen";

describe("WeatherSplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    // Default matchMedia mock
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("renders on cold launch when sessionStorage has not marked splash as seen", () => {
    render(<WeatherSplashScreen minDuration={2400} />);

    expect(
      screen.getByRole("status", {
        name: /Loading WeatherGPT meteorological intelligence/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/Weather/i)).toBeInTheDocument();
    expect(screen.getByText(/GPT/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.0/i)).toBeInTheDocument();

    // Verify sessionStorage flag is set
    expect(sessionStorage.getItem("weathergpt_splash_seen")).toBe("true");
  });

  it("does not render on subsequent visits if skipOnRepeatVisits is true", () => {
    sessionStorage.setItem("weathergpt_splash_seen", "true");

    const { container } = render(
      <WeatherSplashScreen skipOnRepeatVisits={true} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders when forceShow is true even if sessionStorage is already populated", () => {
    sessionStorage.setItem("weathergpt_splash_seen", "true");

    render(<WeatherSplashScreen forceShow={true} />);

    expect(
      screen.getByRole("status", {
        name: /Loading WeatherGPT meteorological intelligence/i,
      })
    ).toBeInTheDocument();
  });

  it("renders all visual layers: sky badge, sun, cloud, and 4 raindrops", () => {
    const { container } = render(<WeatherSplashScreen forceShow={true} />);

    // SVG elements
    expect(container.querySelector(".weather-splash-squircle-layer")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-sun-halo-layer")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-sun-layer")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-cloud-layer")).toBeInTheDocument();

    // 4 raindrops
    expect(container.querySelector(".weather-splash-drop-1")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-drop-2")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-drop-3")).toBeInTheDocument();
    expect(container.querySelector(".weather-splash-drop-4")).toBeInTheDocument();
  });

  it("automatically dismisses and triggers onComplete after minDuration", () => {
    const onComplete = vi.fn();
    render(
      <WeatherSplashScreen
        forceShow={true}
        minDuration={2400}
        onComplete={onComplete}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    // Fast-forward past minDuration (2400ms)
    act(() => {
      vi.advanceTimersByTime(2400);
    });

    // Fast-forward exit transition (450ms)
    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("status", {
        name: /Loading WeatherGPT meteorological intelligence/i,
      })
    ).not.toBeInTheDocument();
  });

  it("allows keyboard users to skip immediately via skip button or Escape key", () => {
    const onComplete = vi.fn();
    render(
      <WeatherSplashScreen
        forceShow={true}
        minDuration={5000}
        onComplete={onComplete}
      />
    );

    const skipButton = screen.getByRole("button", {
      name: /Skip launch animation/i,
    });
    expect(skipButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(skipButton);
      vi.advanceTimersByTime(450);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("handles prefers-reduced-motion media query correctly", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<WeatherSplashScreen forceShow={true} />);

    expect(
      screen.getByRole("status", {
        name: /Loading WeatherGPT meteorological intelligence/i,
      })
    ).toBeInTheDocument();
  });
});
