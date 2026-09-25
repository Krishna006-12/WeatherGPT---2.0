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
  createEmailSession,
  createPhoneSession,
  clearStoredSession,
} from "@/lib/storage/auth-storage";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(createDefaultGuestSession());
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"google" | "phone">("google");

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

  const openAuthModal = useCallback((tab: "google" | "phone" = "google") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(
    async (profileOrEmail?: string | Partial<AuthUser>, name?: string, role?: UserRole) => {
      setStatus("loading");
      const newSession = createGoogleSession(profileOrEmail, name, role);
      setSession(newSession);
      saveStoredSession(newSession);
      setStatus("authenticated");
      setIsAuthModalOpen(false);
    },
    []
  );

  const signInWithEmail = useCallback(
    async (email: string, name?: string, role?: UserRole) => {
      setStatus("loading");
      const newSession = createEmailSession(email, name, role);
      setSession(newSession);
      saveStoredSession(newSession);
      setStatus("authenticated");
      setIsAuthModalOpen(false);
    },
    []
  );

  const signInWithPhone = useCallback(
    async (phoneNumber: string, name?: string, role?: UserRole) => {
      setStatus("loading");
      const newSession = createPhoneSession(phoneNumber, name, role);
      setSession(newSession);
      saveStoredSession(newSession);
      setStatus("authenticated");
      setIsAuthModalOpen(false);
    },
    []
  );

  const updateProfile = useCallback((updates: Partial<AuthUser>) => {
    setSession((prev) => {
      const updated: UserSession = {
        ...prev,
        user: {
          ...prev.user,
          ...updates,
        },
      };
      saveStoredSession(updated);
      return updated;
    });
  }, []);

  const continueAsGuest = useCallback(() => {
    const guestSession = createDefaultGuestSession();
    setSession(guestSession);
    saveStoredSession(guestSession);
    setStatus("unauthenticated");
    setIsAuthModalOpen(false);
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
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithEmail,
        signInWithPhone,
        continueAsGuest,
        setRole,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultFallbackSession = createDefaultGuestSession();

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      session: defaultFallbackSession,
      status: "unauthenticated",
      isGuest: true,
      isFarmer: false,
      isAuthModalOpen: false,
      authModalTab: "google",
      openAuthModal: () => {},
      closeAuthModal: () => {},
      signInWithGoogle: async () => {},
      signInWithEmail: async () => {},
      signInWithPhone: async () => {},
      continueAsGuest: () => {},
      setRole: () => {},
      updateProfile: () => {},
      signOut: () => {},
    };
  }
  return context;
}
