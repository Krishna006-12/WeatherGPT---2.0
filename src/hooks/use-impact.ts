import { useQuery } from "@tanstack/react-query";
import type { ImpactAssessment } from "@/types/impact";

interface UseImpactOptions {
  eventId?: string;
  lat?: number;
  lon?: number;
  city?: string;
  region?: string;
  country?: string;
}

export function useImpact(options: UseImpactOptions) {
  return useQuery<ImpactAssessment>({
    queryKey: ["impact", options],
    queryFn: async () => {
      const url = new URL("/api/impact", window.location.origin);
      if (options.eventId) url.searchParams.append("eventId", options.eventId);
      if (options.lat !== undefined) url.searchParams.append("lat", options.lat.toString());
      if (options.lon !== undefined) url.searchParams.append("lon", options.lon.toString());
      if (options.city) url.searchParams.append("city", options.city);
      if (options.region) url.searchParams.append("region", options.region);
      if (options.country) url.searchParams.append("country", options.country);
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch impact: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!options.eventId && (!!options.lat || !!options.city || !!options.region || !!options.country),
  });
}

