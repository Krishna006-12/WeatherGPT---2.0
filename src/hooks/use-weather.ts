"use client";

import { useQuery } from "@tanstack/react-query";
import type { WeatherSnapshot } from "@/types/weather";

interface UseWeatherParams {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  enabled?: boolean;
}

export function useWeather({
  latitude,
  longitude,
  timezone,
  enabled = true,
}: UseWeatherParams) {
  const isCoordinatesValid =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return useQuery<WeatherSnapshot, Error>({
    queryKey: ["weather", latitude, longitude, timezone],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates are required");
      }

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
      });
      if (timezone) {
        params.set("timezone", timezone);
      }

      const response = await fetch(`/api/weather?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message || `Failed to fetch weather: ${response.statusText}`
        );
      }

      return response.json() as Promise<WeatherSnapshot>;
    },
    enabled: enabled && isCoordinatesValid,
    staleTime: 2 * 60 * 1000, // 2 minutes in client
  });
}
