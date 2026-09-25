/**
 * Storage and session persistence utility for WeatherGPT 2.0 Auth.
 * Default session provides zero-barrier Guest access with farmer capabilities.
 * Supports Google OAuth, Real Email authentication, and Mobile Phone (OTP) sessions.
 */

import type { UserSession, AuthUser, UserRole } from "@/types/auth";

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

/**
 * Intelligent profile extractor from real email address
 * Formats name and generates a high-resolution initials avatar
 */
export function deriveProfileFromEmail(email: string): { name: string; avatarUrl: string; domain: string } {
  const cleanEmail = email.trim().toLowerCase();
  const [username = "user", domain = "gmail.com"] = cleanEmail.split("@");

  const formattedName = username
    .replace(/[._\-+0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const displayName = formattedName.length > 0 ? formattedName : "WeatherGPT User";
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0284c7,0ea5e9,38bdf8`;

  return {
    name: displayName,
    avatarUrl,
    domain,
  };
}

export function createGoogleSession(
  profileOrEmail?: string | Partial<AuthUser>,
  customName?: string,
  customRole: UserRole = "farmer"
): UserSession {
  if (typeof profileOrEmail === "string") {
    const derived = deriveProfileFromEmail(profileOrEmail);
    const user: AuthUser = {
      id: `usr_google_${Math.random().toString(36).substring(2, 9)}`,
      email: profileOrEmail.trim(),
      name: customName?.trim() || derived.name,
      image: derived.avatarUrl,
      role: customRole,
      isGuest: false,
    };

    return {
      user,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      provider: "google",
    };
  }

  const profile = profileOrEmail;
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

export function createEmailSession(
  email: string,
  customName?: string,
  role: UserRole = "user"
): UserSession {
  const derived = deriveProfileFromEmail(email);
  const user: AuthUser = {
    id: `usr_email_${Math.random().toString(36).substring(2, 9)}`,
    email: email.trim(),
    name: customName?.trim() || derived.name,
    image: derived.avatarUrl,
    role,
    isGuest: false,
  };

  return {
    user,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    provider: "email",
  };
}

export function createPhoneSession(
  phoneNumber: string,
  customName?: string,
  role: UserRole = "farmer"
): UserSession {
  const cleanPhone = phoneNumber.trim();
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
  const last4 = digitsOnly.slice(-4) || "0000";
  const displayName = customName?.trim() || (role === "farmer" ? `Kisan (${last4})` : `User (${last4})`);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanPhone)}&backgroundColor=10b981,059669`;

  const user: AuthUser = {
    id: `usr_phone_${digitsOnly.slice(-10)}`,
    email: null,
    phone: cleanPhone,
    name: displayName,
    image: avatarUrl,
    role,
    isGuest: false,
  };

  return {
    user,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    provider: "phone",
  };
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}
