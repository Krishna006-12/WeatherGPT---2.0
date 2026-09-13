"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  UserSession,
  AuthUser,
  UserRole,
  AuthStatus,
  AuthContextValue,
} from "@/types/auth";
import {
  createDefaultGuestSession,
  loadStoredSession,
  saveStoredSession,
  createGoogleSession,
  clearStoredSession,
} from "@/lib/storage/auth-storage";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(createDefaultGuestSession());
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Hydrate session from localStorage
  useEffect(() => {
    const saved = loadStoredSession();
    if (saved) {
      setSession(saved);
      setStatus(saved.user.isGuest ? "unauthenticated" : "authenticated");
    } else {
      const defaultSession = createDefaultGuestSession();
      setSession(defaultSession);
      saveStoredSession(defaultSession);
      setStatus("unauthenticated");
    }
  }, []);

  const signInWithGoogle = useCallback(async (mockProfile?: Partial<AuthUser>) => {
    setStatus("loading");
    // Simulate OAuth handshake or direct credential verification
    const newSession = createGoogleSession(mockProfile);
    setSession(newSession);
    saveStoredSession(newSession);
    setStatus("authenticated");
  }, []);

  const continueAsGuest = useCallback(() => {
    const guestSession = createDefaultGuestSession();
    setSession(guestSession);
    saveStoredSession(guestSession);
    setStatus("unauthenticated");
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setSession((prev) => {
      const updated: UserSession = {
        ...prev,
        user: {
          ...prev.user,
          role,
        },
      };
      saveStoredSession(updated);
      return updated;
    });
  }, []);

  const signOut = useCallback(() => {
    clearStoredSession();
    const guestSession = createDefaultGuestSession();
    setSession(guestSession);
    saveStoredSession(guestSession);
    setStatus("unauthenticated");
  }, []);

  const isGuest = session.user.isGuest;
  const isFarmer = session.user.role === "farmer";

  return (
    <AuthContext.Provider
      value={{
        session,
        status,
        isGuest,
        isFarmer,
        signInWithGoogle,
        continueAsGuest,
        setRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
