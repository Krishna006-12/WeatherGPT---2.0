import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import type { WeatherSnapshot } from "@/types/weather";

describe("HourlyForecastCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-10-15T10:30:00Z")); // 10:30 AM UTC
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the correct hour for Asia/Kolkata", () => {
    const mockWeather = {
      location: { timezone: "Asia/Kolkata" },
      hourly: [
        { time: "2023-10-15T09:00:00Z", temperature: 20, condition: "clear" }, // 14:30 IST -> hour 14
        { time: "2023-10-15T10:30:00Z", temperature: 21, condition: "clear" }, // 16:00 IST -> hour 16 -> NOW
        { time: "2023-10-15T12:00:00Z", temperature: 22, condition: "clear" }, // 17:30 IST -> hour 17
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    const nowLabels = screen.queryAllByText("Now");
    expect(nowLabels).toHaveLength(1);
    const nowSlot = nowLabels[0]!.closest("div")!;
    expect(nowSlot).toHaveTextContent("21");
  });

  it("marks the correct hour for Europe/London", () => {
    const mockWeather = {
      location: { timezone: "Europe/London" },
      hourly: [
        { time: "2023-10-15T09:00:00Z", temperature: 10, condition: "clear" },
        { time: "2023-10-15T10:00:00Z", temperature: 15, condition: "clear" },
        { time: "2023-10-15T11:00:00Z", temperature: 20, condition: "clear" },
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    const nowLabels = screen.queryAllByText("Now");
    expect(nowLabels).toHaveLength(1);
    const nowSlot = nowLabels[0]!.closest("div")!;
    expect(nowSlot).toHaveTextContent("15");
  });

  it("proves browser timezone is not used as the forecast timezone authority", () => {
    const mockWeather = {
      location: { timezone: "Asia/Tokyo" },
      hourly: [
        { time: "2023-10-15T09:00:00Z", temperature: 99, condition: "clear" },
        { time: "2023-10-15T10:30:00Z", temperature: 100, condition: "clear" },
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    const nowLabels = screen.queryAllByText("Now");
    expect(nowLabels).toHaveLength(1);
    const nowSlot = nowLabels[0]!.closest("div")!;
    expect(nowSlot).toHaveTextContent("100");
  });

  it("does not match the same clock hour on the wrong date", () => {
    const mockWeather = {
      location: { timezone: "UTC" },
      hourly: [
        { time: "2023-10-16T10:00:00Z", temperature: 50, condition: "clear" },
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    expect(screen.queryByText("Now")).not.toBeInTheDocument();
  });

  it("handles midnight/date rollover correctly", () => {
    vi.setSystemTime(new Date("2023-10-15T23:30:00Z"));
    
    const mockWeather = {
      location: { timezone: "Asia/Tokyo" },
      hourly: [
        { time: "2023-10-15T23:00:00Z", temperature: 10, condition: "clear" },
        { time: "2023-10-15T14:00:00Z", temperature: 20, condition: "clear" },
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    const nowLabels = screen.queryAllByText("Now");
    expect(nowLabels).toHaveLength(1);
    const nowSlot = nowLabels[0]!.closest("div")!;
    expect(nowSlot).toHaveTextContent("10");
  });

  it("renders no Now state when the exact target-location current hour is absent", () => {
    const mockWeather = {
      location: { timezone: "UTC" },
      hourly: [
        { time: "2023-10-15T12:00:00Z", temperature: 50, condition: "clear" },
        { time: "2023-10-15T13:00:00Z", temperature: 55, condition: "clear" },
      ],
      daily: [],
    } as unknown as WeatherSnapshot;

    render(<HourlyForecastCard weather={mockWeather} isLoading={false} />);
    expect(screen.queryByText("Now")).not.toBeInTheDocument();
  });
});

