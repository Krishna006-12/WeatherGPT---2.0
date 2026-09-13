"use client";

import { useQuery } from "@tanstack/react-query";
import type { ModelConsensusReport } from "@/types/nwp";

interface UseConsensusParams {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  targetDate?: string;
  models?: string;
  enabled?: boolean;
}

export function useConsensus({
  latitude,
  longitude,
  timezone,
  targetDate,
  models,
  enabled = true,
}: UseConsensusParams) {
  const isCoordinatesValid =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return useQuery<ModelConsensusReport, Error>({
    queryKey: ["consensus", latitude, longitude, timezone, targetDate, models],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates are required for model consensus");
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
      if (models) {
        params.set("models", models);
      }

      const response = await fetch(`/api/consensus?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message ||
            `Failed to fetch model consensus: ${response.statusText}`
        );
      }

      const json = await response.json();
      return (json.data ?? json) as ModelConsensusReport;
    },
    enabled: enabled && isCoordinatesValid,
    staleTime: 5 * 60 * 1000,
  });
}
