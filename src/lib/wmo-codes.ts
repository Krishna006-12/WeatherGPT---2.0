import type { WeatherCondition } from "@/types/weather";

export function mapWmoCode(code: number): { condition: WeatherCondition; label: string } {
  switch (code) {
    case 0:
      return { condition: "clear", label: "Clear sky" };
    case 1:
      return { condition: "clear", label: "Mainly clear" };
    case 2:
      return { condition: "partly-cloudy", label: "Partly cloudy" };
    case 3:
      return { condition: "overcast", label: "Overcast" };
    case 45:
    case 48:
      return { condition: "fog", label: "Fog" };
    case 51:
    case 53:
    case 55:
      return { condition: "drizzle", label: "Drizzle" };
    case 56:
    case 57:
      return { condition: "drizzle", label: "Freezing drizzle" };
    case 61:
    case 63:
      return { condition: "rain", label: "Rain" };
    case 65:
      return { condition: "heavy-rain", label: "Heavy rain" };
    case 66:
    case 67:
      return { condition: "rain", label: "Freezing rain" };
    case 71:
    case 73:
    case 75:
      return { condition: "snow", label: "Snow fall" };
    case 77:
      return { condition: "snow", label: "Snow grains" };
    case 80:
    case 81:
      return { condition: "rain", label: "Rain showers" };
    case 82:
      return { condition: "heavy-rain", label: "Violent rain showers" };
    case 85:
    case 86:
      return { condition: "snow", label: "Snow showers" };
    case 95:
      return { condition: "thunderstorm", label: "Thunderstorm" };
    case 96:
    case 99:
      return { condition: "thunderstorm", label: "Thunderstorm with hail" };
    default:
      return { condition: "unknown", label: "Unknown" };
  }
}
