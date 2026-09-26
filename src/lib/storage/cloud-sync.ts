/**
 * Client-side Cloud Sync Manager for WeatherGPT 2.0.
 * Handles synchronizing:
 * - User locations (selected location & saved/recent locations)
 * - User preferences (role, language, theme, active persona)
 * - Cross-device hydration on login
 */

import type { NormalizedLocation } from "@/services/location/location-service";
import {
  loadRecentLocations,
  addRecentLocation,
  loadSelectedLocation,
  saveSelectedLocation,
} from "./location-storage";

export const CLOUD_SYNC_EVENT = "weathergpt:cloud_synced";

export interface CloudProfilePayload {
  savedLocations?: NormalizedLocation[];
  selectedLocation?: NormalizedLocation | null;
  preferences?: {
    role?: string;
    language?: string;
    theme?: string;
    activePersona?: string;
    units?: "metric" | "imperial";
  };
  recentChatSummary?: Array<{ role: "user" | "assistant"; content: string }>;
  deviceCount?: number;
  updatedAt?: string;
}

/**
 * Hydrates client localStorage from cloud profile upon login
 */
export function applyCloudProfileToClient(cloud: CloudProfilePayload): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Synchronize saved & selected locations
    if (cloud.savedLocations && Array.isArray(cloud.savedLocations) && cloud.savedLocations.length > 0) {
      // Merge locations into local storage
      const existing = loadRecentLocations();
      const existingIds = new Set(existing.map((l) => l.id || l.displayName));

      for (const loc of cloud.savedLocations) {
        if (!existingIds.has(loc.id || loc.displayName)) {
          addRecentLocation(loc);
        }
      }
    }

    if (cloud.selectedLocation) {
      saveSelectedLocation(cloud.selectedLocation);
    }

    // 2. Synchronize preferences
    if (cloud.preferences) {
      if (cloud.preferences.language) {
        window.localStorage.setItem("weathergpt_user_language", cloud.preferences.language);
      }
      if (cloud.preferences.theme) {
        window.localStorage.setItem("weathergpt_theme", cloud.preferences.theme);
      }
      if (cloud.preferences.activePersona) {
        window.localStorage.setItem("weathergpt_active_persona", cloud.preferences.activePersona);
        window.localStorage.setItem("weathergpt_chat_persona", cloud.preferences.activePersona);
      }
    }

    // 3. Notify all open contexts and tabs
    window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT, { detail: cloud }));
  } catch (err) {
    console.warn("Failed to apply cloud profile to client storage:", err);
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced background sync from client to server
 */
export function pushClientStateToCloud(userId: string, delayMs = 1500): void {
  if (typeof window === "undefined" || !userId || userId.startsWith("guest_")) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      const selectedLocation = loadSelectedLocation();
      const savedLocations = loadRecentLocations();
      const language = window.localStorage.getItem("weathergpt_user_language") || "hi";
      const theme = window.localStorage.getItem("weathergpt_theme") || "dark";
      const persona = window.localStorage.getItem("weathergpt_active_persona") || "farmer";

      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selectedLocation,
          savedLocations,
          preferences: {
            language,
            theme,
            activePersona: persona,
          },
          deviceLabel: navigator.userAgent.slice(0, 80),
        }),
      });
    } catch {
      // Non-blocking offline resilience
    }
  }, delayMs);
}

/**
 * Pulls latest cloud state from server for a given user ID
 */
export async function pullCloudState(userId: string): Promise<CloudProfilePayload | null> {
  if (typeof window === "undefined" || !userId || userId.startsWith("guest_")) return null;

  try {
    const res = await fetch(`/api/auth/sync?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.cloudProfile) {
      applyCloudProfileToClient(data.cloudProfile);
      return data.cloudProfile;
    }
    return null;
  } catch {
    return null;
  }
}
