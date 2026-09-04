import { useQuery } from "@tanstack/react-query";
import type { WeatherEvent } from "@/types/events";

interface UseEventsOptions {
  category?: string;
  limit?: number;
}

export function useEvents(options?: UseEventsOptions) {
  return useQuery<{ events: WeatherEvent[]; total: number }>({
    queryKey: ["events", options],
    queryFn: async () => {
      const url = new URL("/api/events", window.location.origin);
      if (options?.category) {
        url.searchParams.append("category", options.category);
      }
      if (options?.limit) {
        url.searchParams.append("limit", options.limit.toString());
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      return res.json();
    },
  });
}

