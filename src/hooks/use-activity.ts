"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActivitySuitabilityReport, ActivityType } from "@/types/activity";

interface UseActivityParams {
  latitude?: number;
  longitude?: number;
  activity?: ActivityType;
  date?: string;
  timezone?: string;
  enabled?: boolean;
}

export function useActivity({
  latitude,
  longitude,
  activity,
  date,
  timezone,
  enabled = true,
}: UseActivityParams) {
  const isCoordinatesValid =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return useQuery<ActivitySuitabilityReport, Error>({
    queryKey: ["activity-suitability", latitude, longitude, activity, date, timezone],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates are required for activity suitability");
      }

      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });
      if (activity) {
        params.set("activity", activity);
      }
      if (date) {
        params.set("date", date);
      }
      if (timezone) {
        params.set("timezone", timezone);
      }

      const response = await fetch(`/api/activity?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message ||
            `Failed to fetch activity suitability: ${response.statusText}`
        );
      }

      const json = await response.json();
      return (json.data ?? json) as ActivitySuitabilityReport;
    },
    enabled: enabled && isCoordinatesValid,
    staleTime: 5 * 60 * 1000,
  });
}
