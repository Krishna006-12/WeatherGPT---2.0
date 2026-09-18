import type { ImgHTMLAttributes } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getWeatherMascot } from "@/lib/weather/mascot-helper";
import { WeatherMascotCard } from "@/components/weather/weather-mascot-card";
import type { WeatherSnapshot } from "@/types/weather";

// Mock next/image
type MockImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  fill?: boolean;
  priority?: boolean;
};

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: MockImageProps) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} {...props} />;
  },
}));

// Mock Haptics
vi.mock("@/lib/motion/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

describe("Mascot Helper & Dynamic Mascot Resolution", () => {
  it("resolves sunny mascot for clear conditions", () => {
    const mascot = getWeatherMascot("Clear", 26, 10);
    expect(mascot.type).toBe("sunny");
    expect(mascot.imageSrc).toBe("/images/mascot/sunny.webp");
    expect(mascot.title).toBe("Sunny Walk");
    expect(mascot.activityTip).toContain("sunshine");
  });

  it("resolves rainy mascot for rain and drizzle conditions", () => {
    const mascot = getWeatherMascot("Moderate Rain", 18, 12);
    expect(mascot.type).toBe("rainy");
    expect(mascot.imageSrc).toBe("/images/mascot/rainy.webp");
    expect(mascot.title).toBe("Rainy Day");
    expect(mascot.activityTip).toContain("puddles");
  });

  it("resolves cloudy/windy mascot for overcast or high wind conditions", () => {
    const mascotCloudy = getWeatherMascot("Overcast", 19, 10);
    expect(mascotCloudy.type).toBe("cloudy");
    expect(mascotCloudy.imageSrc).toBe("/images/mascot/cloudy.webp");

    const mascotWindy = getWeatherMascot("Clear", 20, 28);
    expect(mascotWindy.type).toBe("cloudy");
    expect(mascotWindy.title).toBe("Cloudy & Windy");
  });

  it("resolves snowy mascot for freezing temperature or snow conditions", () => {
    const mascotSnow = getWeatherMascot("Light Snow", -1, 8);
    expect(mascotSnow.type).toBe("snowy");
    expect(mascotSnow.imageSrc).toBe("/images/mascot/snowy.webp");
    expect(mascotSnow.title).toBe("Snowy Path");

    const mascotFreezing = getWeatherMascot("Clear", 0, 5);
    expect(mascotFreezing.type).toBe("snowy");
  });
});

describe("WeatherMascotCard UI Component", () => {
  const mockLocation = {
    id: 1,
    name: "Gurugram",
    displayName: "Gurugram, Haryana, India",
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: "Asia/Kolkata",
    country: "India",
  };

  const mockRainyWeather: WeatherSnapshot = {
    current: {
      temperature: 19,
      apparentTemperature: 18,
      condition: "Thunderstorm with rain",
      humidity: 88,
      windSpeed: 14,
      windDirection: 90,
      pressure: 1010,
      uvIndex: 2,
      cloudCover: 90,
      isDay: true,
      time: "2026-09-19T10:00:00Z",
    },
    daily: [],
    hourly: [],
    observedAt: "2026-09-19T10:00:00Z",
  };

  it("renders live rainy mascot according to weather condition", () => {
    render(<WeatherMascotCard weather={mockRainyWeather} location={mockLocation} />);

    expect(screen.getByText("Gurugram Mascot")).toBeInTheDocument();
    expect(screen.getByText("Rainy Day")).toBeInTheDocument();
    expect(screen.getByText("Rain Shield")).toBeInTheDocument();
    expect(screen.getByAltText("Rainy Day mascot")).toHaveAttribute("src", "/images/mascot/rainy.webp");
  });

  it("allows interactive pose switching for preview", () => {
    render(<WeatherMascotCard weather={mockRainyWeather} location={mockLocation} />);

    // Click sunny pose preview button
    const sunnyBtn = screen.getByTitle("Preview sunny mascot");
    fireEvent.click(sunnyBtn);

    expect(screen.getByText("Sunny Walk")).toBeInTheDocument();
    expect(screen.getByAltText("Sunny Walk mascot")).toHaveAttribute("src", "/images/mascot/sunny.webp");
  });
});
