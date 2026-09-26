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
import {
  CLOUD_SYNC_EVENT,
  pushClientStateToCloud,
  type CloudProfilePayload,
} from "@/lib/storage/cloud-sync";
import { loadStoredSession } from "@/lib/storage/auth-storage";

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

function triggerCloudSync() {
  try {
    const session = loadStoredSession();
    if (session && !session.user.isGuest && session.user.id) {
      pushClientStateToCloud(session.user.id);
    }
  } catch {
    // Non-blocking
  }
}

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

  // Listen for cross-device cloud sync events
  useEffect(() => {
    const handleCloudSync = (e: Event) => {
      const custom = e as CustomEvent<CloudProfilePayload>;
      if (custom.detail?.selectedLocation) {
        setSelectedLocationState(custom.detail.selectedLocation);
      }
      const updated = loadRecentLocations();
      if (updated.length > 0) {
        setRecentLocations(updated);
      }
    };

    window.addEventListener(CLOUD_SYNC_EVENT, handleCloudSync);
    return () => window.removeEventListener(CLOUD_SYNC_EVENT, handleCloudSync);
  }, []);

  const setSelectedLocation = useCallback((location: NormalizedLocation | null) => {
    setSelectedLocationState(location);
    saveSelectedLocation(location);

    if (location) {
      const updatedRecents = addRecentLocation(location);
      setRecentLocations(updatedRecents);
    }

    triggerCloudSync();
  }, []);

  const addRecent = useCallback((location: NormalizedLocation) => {
    const updated = addRecentLocation(location);
    setRecentLocations(updated);
    triggerCloudSync();
  }, []);

  const removeRecent = useCallback((identifier: number | string) => {
    const updated = removeRecentLocation(identifier);
    setRecentLocations(updated);
    triggerCloudSync();
  }, []);

  const clearRecents = useCallback(() => {
    clearRecentLocations();
    setRecentLocations([]);
    triggerCloudSync();
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
