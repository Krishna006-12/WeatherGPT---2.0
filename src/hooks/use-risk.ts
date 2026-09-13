"use client";

import { useQuery } from "@tanstack/react-query";
import type { WeatherRiskReport } from "@/types/risk";

interface UseRiskParams {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  targetDate?: string;
  enabled?: boolean;
}

export function useRisk({
  latitude,
  longitude,
  timezone,
  targetDate,
  enabled = true,
}: UseRiskParams) {
  const isCoordinatesValid =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return useQuery<WeatherRiskReport, Error>({
    queryKey: ["risk", latitude, longitude, timezone, targetDate],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates are required for weather risk assessment");
      }

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
      });
      if (timezone) {
        params.set("timezone", timezone);
      }
      if (targetDate) {
        params.set("targetDate", targetDate);
      }

      const response = await fetch(`/api/risk?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message ||
            `Failed to fetch weather risk: ${response.statusText}`
        );
      }

      return response.json() as Promise<WeatherRiskReport>;
    },
    enabled: enabled && isCoordinatesValid,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
