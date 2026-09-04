import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import type { WeatherSnapshot } from "@/types/weather";

const mockWeather = {
  location: { timezone: "Asia/Kolkata" },
  daily: [
    { date: "2023-10-15T00:00:00Z", condition: "clear", temperatureHigh: 30, temperatureLow: 20, precipitationProbability: 0 },
    { date: "2023-10-16T00:00:00Z", condition: "rain", temperatureHigh: 28, temperatureLow: 18, precipitationProbability: 80 },
    { date: "2023-10-17T00:00:00Z", condition: "cloudy", temperatureHigh: 27, temperatureLow: 19, precipitationProbability: 10 },
    { date: "2023-10-18T00:00:00Z", condition: "clear", temperatureHigh: 31, temperatureLow: 21, precipitationProbability: 5 },
    { date: "2023-10-19T00:00:00Z", condition: "snow", temperatureHigh: 25, temperatureLow: 15, precipitationProbability: 90 },
    { date: "2023-10-20T00:00:00Z", condition: "clear", temperatureHigh: 32, temperatureLow: 22, precipitationProbability: 0 },
    { date: "2023-10-21T00:00:00Z", condition: "rain", temperatureHigh: 29, temperatureLow: 19, precipitationProbability: 60 },
  ],
} as unknown as WeatherSnapshot;

describe("SevenDayForecastCard", () => {
  it("renders seven valid forecast entries", () => {
    render(<SevenDayForecastCard weather={mockWeather} isLoading={false} />);
    expect(screen.getByText("7-Day Forecast")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    
    // Check that we have 7 rows (we can count the day/temperature elements)
    // There should be 7 high temperatures rendered
    expect(screen.getAllByText(/20.*|18.*|19.*|21.*|15.*|22.*/)).toHaveLength(7);
  });

  it("handles fewer than seven days safely", () => {
    const shortWeather = {
      ...mockWeather,
      daily: mockWeather.daily.slice(0, 3)
    } as unknown as WeatherSnapshot;
    
    const { container } = render(<SevenDayForecastCard weather={shortWeather} isLoading={false} />);
    // Should render without crashing and have 3 elements
    expect(container.querySelectorAll(".border-b, .last\\:border-0")).toHaveLength(3);
  });

  it("handles empty state", () => {
    const emptyWeather = { ...mockWeather, daily: [] } as unknown as WeatherSnapshot;
    render(<SevenDayForecastCard weather={emptyWeather} isLoading={false} />);
    expect(screen.getByText("7-Day forecast unavailable")).toBeInTheDocument();
  });

  it("does not throw on optional/missing display-only values", () => {
    const missingValuesWeather = {
      location: { timezone: "UTC" },
      daily: [
        { date: "2023-10-15T00:00:00Z", condition: "clear", temperatureHigh: 30, temperatureLow: 20 } // missing precipitationProbability
      ],
    } as unknown as WeatherSnapshot;
    
    expect(() => {
      render(<SevenDayForecastCard weather={missingValuesWeather} isLoading={false} />);
    }).not.toThrow();
  });
});

