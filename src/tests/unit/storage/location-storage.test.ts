import { describe, it, expect, beforeEach } from "vitest";
import {
  areLocationsEqual,
  loadRecentLocations,
  addRecentLocation,
  removeRecentLocation,
  clearRecentLocations,
  loadSelectedLocation,
  saveSelectedLocation,
  MAX_RECENT_LOCATIONS,
  STORAGE_KEY_RECENTS,
  STORAGE_KEY_SELECTED,
} from "@/lib/storage/location-storage";
import type { NormalizedLocation } from "@/services/location/location-service";

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const mockLocationA: NormalizedLocation = {
  id: 1,
  name: "Kanpur",
  displayName: "Kanpur, Uttar Pradesh, India",
  latitude: 26.465,
  longitude: 80.349,
  country: "India",
  region: "Uttar Pradesh",
  timezone: "Asia/Kolkata",
};

const mockLocationB: NormalizedLocation = {
  id: 2,
  name: "Delhi",
  displayName: "New Delhi, Delhi, India",
  latitude: 28.613,
  longitude: 77.209,
  country: "India",
  region: "Delhi",
  timezone: "Asia/Kolkata",
};

describe("Location Storage & Ring-Buffer", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it("checks equality correctly by ID and coordinates", () => {
    expect(areLocationsEqual(mockLocationA, mockLocationA)).toBe(true);
    expect(areLocationsEqual(mockLocationA, mockLocationB)).toBe(false);

    // Coordinate match
    const nearA: NormalizedLocation = {
      ...mockLocationA,
      id: 999,
      displayName: "Kanpur Suburb",
      latitude: 26.467,
      longitude: 80.351,
    };
    expect(areLocationsEqual(mockLocationA, nearA)).toBe(true);
  });

  it("handles empty and corrupted storage gracefully", () => {
    expect(loadRecentLocations(mockStorage)).toEqual([]);

    mockStorage.setItem(STORAGE_KEY_RECENTS, "invalid-json{{");
    expect(loadRecentLocations(mockStorage)).toEqual([]);
  });

  it("adds and prepends locations, deduplicating existing entries", () => {
    addRecentLocation(mockLocationA, mockStorage);
    let list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(1);

    addRecentLocation(mockLocationB, mockStorage);
    list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe(2); // Delhi prepended
    expect(list[1]?.id).toBe(1);

    // Re-adding Kanpur should promote it to front without duplicating
    addRecentLocation(mockLocationA, mockStorage);
    list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe(1); // Kanpur now at front
    expect(list[1]?.id).toBe(2);
  });

  it(`enforces MAX_RECENT_LOCATIONS (${MAX_RECENT_LOCATIONS}) ring-buffer capacity`, () => {
    for (let i = 1; i <= 20; i++) {
      const loc: NormalizedLocation = {
        id: i,
        name: `City ${i}`,
        displayName: `City ${i}, Region, Country`,
        latitude: i * 2,
        longitude: i * 2,
        country: "Country",
        timezone: "UTC",
      };
      addRecentLocation(loc, mockStorage);
    }

    const list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(MAX_RECENT_LOCATIONS);
    expect(list[0]?.id).toBe(20);
    expect(list[MAX_RECENT_LOCATIONS - 1]?.id).toBe(20 - MAX_RECENT_LOCATIONS + 1);
  });

  it("removes individual locations and clears the entire buffer", () => {
    addRecentLocation(mockLocationA, mockStorage);
    addRecentLocation(mockLocationB, mockStorage);

    removeRecentLocation(1, mockStorage);
    let list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(2);

    clearRecentLocations(mockStorage);
    list = loadRecentLocations(mockStorage);
    expect(list.length).toBe(0);
  });

  it("persists and retrieves selectedLocation", () => {
    expect(loadSelectedLocation(mockStorage)).toBeNull();

    saveSelectedLocation(mockLocationA, mockStorage);
    expect(loadSelectedLocation(mockStorage)?.name).toBe("Kanpur");

    saveSelectedLocation(null, mockStorage);
    expect(loadSelectedLocation(mockStorage)).toBeNull();
  });
});
