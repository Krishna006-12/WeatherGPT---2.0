/**
 * Storage and session persistence utility for WeatherGPT 2.0 Auth.
 * Default session provides zero-barrier Guest access with farmer capabilities.
 */

import type { UserSession, AuthUser } from "@/types/auth";

export const STORAGE_KEY_AUTH = "weathergpt_auth_session";

export function createDefaultGuestSession(): UserSession {
  const guestUser: AuthUser = {
    id: "guest_rural_session",
    email: null,
    name: "Guest Farmer",
    image: null,
    role: "farmer",
    isGuest: true,
  };

  return {
    user: guestUser,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    provider: "guest",
  };
}

export function loadStoredSession(storage: Storage | null = getStorage()): UserSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.user.id) {
      return parsed as UserSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredSession(
  session: UserSession,
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
  } catch {
    // Quota fallback
  }
}

export function clearStoredSession(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY_AUTH);
  } catch {
    // ignore
  }
}

export function createGoogleSession(profile?: Partial<AuthUser>): UserSession {
  const user: AuthUser = {
    id: profile?.id ?? `usr_google_${Math.random().toString(36).substring(2, 9)}`,
    email: profile?.email ?? "farmer.kisan@gmail.com",
    name: profile?.name ?? "Kisan Mitra",
    image: profile?.image ?? "https://api.dicebear.com/7.x/bottts/svg?seed=kisan",
    role: profile?.role ?? "farmer",
    isGuest: false,
  };

  return {
    user,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    provider: "google",
  };
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}
