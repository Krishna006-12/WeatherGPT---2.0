import { describe, it, expect, beforeEach } from "vitest";
import {
  createDefaultGuestSession,
  createGoogleSession,
  loadStoredSession,
  saveStoredSession,
  clearStoredSession,
  STORAGE_KEY_AUTH,
} from "@/lib/storage/auth-storage";
import type { UserSession } from "@/types/auth";

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

describe("Auth Storage & Session Logic", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it("creates a default guest session with rural/farmer accessibility", () => {
    const session = createDefaultGuestSession();
    expect(session.user.isGuest).toBe(true);
    expect(session.user.role).toBe("farmer");
    expect(session.provider).toBe("guest");
    expect(session.user.email).toBeNull();
    expect(session.user.name).toContain("Guest");
  });

  it("creates an authenticated Google session with user details", () => {
    const session = createGoogleSession({
      name: "Ramesh Kumar",
      email: "ramesh.k@gmail.com",
      role: "farmer",
    });

    expect(session.user.isGuest).toBe(false);
    expect(session.provider).toBe("google");
    expect(session.user.name).toBe("Ramesh Kumar");
    expect(session.user.email).toBe("ramesh.k@gmail.com");
    expect(session.user.role).toBe("farmer");
  });

  it("persists and restores sessions from storage", () => {
    expect(loadStoredSession(mockStorage)).toBeNull();

    const googleSession = createGoogleSession();
    saveStoredSession(googleSession, mockStorage);

    const loaded = loadStoredSession(mockStorage);
    expect(loaded).not.toBeNull();
    expect(loaded?.user.name).toBe(googleSession.user.name);
    expect(loaded?.provider).toBe("google");
  });

  it("clears session from storage on sign-out", () => {
    const session = createGoogleSession();
    saveStoredSession(session, mockStorage);
    expect(mockStorage.getItem(STORAGE_KEY_AUTH)).not.toBeNull();

    clearStoredSession(mockStorage);
    expect(mockStorage.getItem(STORAGE_KEY_AUTH)).toBeNull();
    expect(loadStoredSession(mockStorage)).toBeNull();
  });

  it("recovers gracefully from corrupted storage payload", () => {
    mockStorage.setItem(STORAGE_KEY_AUTH, "broken{json");
    expect(loadStoredSession(mockStorage)).toBeNull();
  });
});
