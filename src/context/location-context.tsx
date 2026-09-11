"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { NormalizedLocation } from "@/services/location/location-service";

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

interface LocationContextValue {
  selectedLocation: NormalizedLocation | null;
  setSelectedLocation: (location: NormalizedLocation | null) => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState<NormalizedLocation | null>(DEFAULT_LOCATION);

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
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
