"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedLocation } from "@/services/location/location-service";

export function useLocationSearch(query: string, enabled: boolean = true) {
  const trimmed = query.trim();

  return useQuery<NormalizedLocation[], Error>({
    queryKey: ["location-search", trimmed],
    queryFn: async () => {
      if (!trimmed || trimmed.length < 2) {
        return [];
      }

      const response = await fetch(
        `/api/location/search?q=${encodeURIComponent(trimmed)}`
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          errorBody.error?.message || `Location search failed: ${response.statusText}`
        );
      }

      const data = (await response.json()) as { results?: NormalizedLocation[] };
      return data.results || [];
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
