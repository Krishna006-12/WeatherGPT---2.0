"use client";

import { useQuery } from "@tanstack/react-query";
import type { AgricultureAssessment, CropType } from "@/types/agriculture";

interface UseAgricultureParams {
  latitude?: number;
  longitude?: number;
  crop: CropType;
  timezone?: string;
  enabled?: boolean;
}

export function useAgriculture({
  latitude,
  longitude,
  crop,
  timezone,
  enabled = true,
}: UseAgricultureParams) {
  const isCoordinatesValid =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return useQuery<AgricultureAssessment, Error>({
    queryKey: ["agriculture", latitude, longitude, crop],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates are required for agriculture intelligence");
      }

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        crop,
      });
      if (timezone) {
        params.set("timezone", timezone);
      }

      const response = await fetch(`/api/agriculture?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message ||
            `Failed to fetch agricultural intelligence: ${response.statusText}`
        );
      }

      return response.json() as Promise<AgricultureAssessment>;
    },
    enabled: enabled && isCoordinatesValid,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
