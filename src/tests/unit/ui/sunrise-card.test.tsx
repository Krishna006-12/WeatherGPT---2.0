import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SunriseCard } from "@/components/weather/sunrise-card";
import type { WeatherSnapshot } from "@/types/weather";

describe("SunriseCard Timezone Localization", () => {
  it("formats sunrise and sunset in Asia/Kolkata timezone", () => {
    // 00:30 UTC is 6:00 AM IST; 12:30 UTC is 6:00 PM IST
    const mockWeather = {
      location: { timezone: "Asia/Kolkata" },
      daily: [
        {
          sunrise: "2023-10-15T00:30:00Z",
          sunset: "2023-10-15T12:30:00Z",
        },
      ],
    } as unknown as WeatherSnapshot;

    render(<SunriseCard weather={mockWeather} isLoading={false} />);
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.getByText("6:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("6:00 PM")).toBeInTheDocument();
    expect(screen.getByText("12h 0m")).toBeInTheDocument();
  });

  it("formats sunrise and sunset in Europe/London timezone", () => {
    // 05:30 UTC is 6:30 AM BST (UTC+1 on Oct 15); 17:30 UTC is 6:30 PM BST
    const mockWeather = {
      location: { timezone: "Europe/London" },
      daily: [
        {
          sunrise: "2023-10-15T05:30:00Z",
          sunset: "2023-10-15T17:30:00Z",
        },
      ],
    } as unknown as WeatherSnapshot;

    render(<SunriseCard weather={mockWeather} isLoading={false} />);
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.getByText("6:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("6:30 PM")).toBeInTheDocument();
    expect(screen.getByText("12h 0m")).toBeInTheDocument();
  });
});
