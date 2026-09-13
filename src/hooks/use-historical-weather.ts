import { useQuery } from "@tanstack/react-query";
import type { HistoricalArchiveReport } from "@/services/weather/historical-weather-provider";

interface UseHistoricalWeatherOptions {
  latitude?: number;
  longitude?: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  enabled?: boolean;
}

export function useHistoricalWeather({
  latitude,
  longitude,
  startDate,
  endDate,
  timezone,
  enabled = true,
}: UseHistoricalWeatherOptions) {
  return useQuery<HistoricalArchiveReport>({
    queryKey: ["historical-weather", latitude, longitude, startDate, endDate, timezone],
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Coordinates required");
      }
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        startDate,
        endDate,
        ...(timezone ? { timezone } : {}),
      });

      const res = await fetch(`/api/weather/history?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to fetch historical archive");
      }
      return res.json();
    },
    enabled: enabled && latitude !== undefined && longitude !== undefined && Boolean(startDate) && Boolean(endDate),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
