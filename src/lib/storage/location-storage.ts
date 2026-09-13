/**
 * Client-side persistence and ring-buffer management for locations.
 * - Stores selectedLocation (key: 'weathergpt_selected_location')
 * - Stores recentLocations up to MAX_RECENT_LOCATIONS = 12 (key: 'weathergpt_recent_locations')
 * - Full SSR hydration safety and JSON corruption recovery.
 */

import type { NormalizedLocation } from "@/services/location/location-service";

export const MAX_RECENT_LOCATIONS = 12;
export const STORAGE_KEY_SELECTED = "weathergpt_selected_location";
export const STORAGE_KEY_RECENTS = "weathergpt_recent_locations";

/**
 * Checks if two locations are identical based on ID, display name, or coordinates.
 */
export function areLocationsEqual(
  a: NormalizedLocation | null | undefined,
  b: NormalizedLocation | null | undefined
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.displayName && b.displayName && a.displayName.toLowerCase() === b.displayName.toLowerCase()) return true;

  // Approximate coordinate match within ~1km (0.01 deg)
  const latDiff = Math.abs(a.latitude - b.latitude);
  const lonDiff = Math.abs(a.longitude - b.longitude);
  return latDiff < 0.01 && lonDiff < 0.01;
}

/**
 * Loads recent locations from storage or returns empty array.
 */
export function loadRecentLocations(storage: Storage | null = getStorage()): NormalizedLocation[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY_RECENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT_LOCATIONS);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Adds a location to the recent locations ring-buffer.
 * Deduplicates and moves to the front. Trims to MAX_RECENT_LOCATIONS (12).
 */
export function addRecentLocation(
  location: NormalizedLocation,
  storage: Storage | null = getStorage()
): NormalizedLocation[] {
  if (!location) return loadRecentLocations(storage);
  const current = loadRecentLocations(storage);

  // Remove existing match if present
  const filtered = current.filter((item) => !areLocationsEqual(item, location));

  // Prepend new location
  const updated = [location, ...filtered].slice(0, MAX_RECENT_LOCATIONS);

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
    } catch {
      // Storage quota or private mode fallback
    }
  }

  return updated;
}

/**
 * Removes a location from recent list by ID or display name.
 */
export function removeRecentLocation(
  identifier: number | string,
  storage: Storage | null = getStorage()
): NormalizedLocation[] {
  const current = loadRecentLocations(storage);
  const updated = current.filter(
    (loc) => loc.id !== identifier && loc.displayName !== identifier
  );

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  return updated;
}

/**
 * Clears all recent locations.
 */
export function clearRecentLocations(storage: Storage | null = getStorage()): void {
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY_RECENTS);
    } catch {
      // ignore
    }
  }
}

/**
 * Loads selected location from storage.
 */
export function loadSelectedLocation(storage: Storage | null = getStorage()): NormalizedLocation | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY_SELECTED);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves selected location to storage.
 */
export function saveSelectedLocation(
  location: NormalizedLocation | null,
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    if (location) {
      storage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(location));
    } else {
      storage.removeItem(STORAGE_KEY_SELECTED);
    }
  } catch {
    // Storage quota or private mode fallback
  }
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}
