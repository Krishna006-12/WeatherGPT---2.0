"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { NormalizedLocation } from "@/services/location/location-service";
import {
  loadSelectedLocation,
  saveSelectedLocation,
  loadRecentLocations,
  addRecentLocation,
  removeRecentLocation,
  clearRecentLocations,
} from "@/lib/storage/location-storage";

export const DEFAULT_LOCATION: NormalizedLocation = {
  id: 1267995,
  name: "Kanpur",
  latitude: 26.46523,
  longitude: 80.34975,
  country: "India",
  region: "Uttar Pradesh",
  timezone: "Asia/Kolkata",
  displayName: "Kanpur, Uttar Pradesh, India",
};

export interface LocationContextValue {
  selectedLocation: NormalizedLocation | null;
  setSelectedLocation: (location: NormalizedLocation | null) => void;
  recentLocations: NormalizedLocation[];
  addRecent: (location: NormalizedLocation) => void;
  removeRecent: (identifier: number | string) => void;
  clearRecents: () => void;
  isHydrated: boolean;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocationState] = useState<NormalizedLocation | null>(
    DEFAULT_LOCATION
  );
  const [recentLocations, setRecentLocations] = useState<NormalizedLocation[]>([DEFAULT_LOCATION]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Client hydration from localStorage
  useEffect(() => {
    const saved = loadSelectedLocation();
    if (saved) {
      setSelectedLocationState(saved);
    }

    const recents = loadRecentLocations();
    if (recents && recents.length > 0) {
      setRecentLocations(recents);
    } else {
      // Seed recents with default if none exist
      const initial = addRecentLocation(DEFAULT_LOCATION);
      setRecentLocations(initial);
    }
    setIsHydrated(true);
  }, []);

  const setSelectedLocation = useCallback((location: NormalizedLocation | null) => {
    setSelectedLocationState(location);
    saveSelectedLocation(location);

    if (location) {
      const updatedRecents = addRecentLocation(location);
      setRecentLocations(updatedRecents);
    }
  }, []);

  const addRecent = useCallback((location: NormalizedLocation) => {
    const updated = addRecentLocation(location);
    setRecentLocations(updated);
  }, []);

  const removeRecent = useCallback((identifier: number | string) => {
    const updated = removeRecentLocation(identifier);
    setRecentLocations(updated);
  }, []);

  const clearRecents = useCallback(() => {
    clearRecentLocations();
    setRecentLocations([]);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        setSelectedLocation,
        recentLocations,
        addRecent,
        removeRecent,
        clearRecents,
        isHydrated,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
