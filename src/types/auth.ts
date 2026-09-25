/**
 * Authentication and session contracts for WeatherGPT 2.0.
 * Supports OAuth (Google), Real Email authentication, Phone OTP, and zero-barrier anonymous rural guest access.
 */

export type UserRole = "user" | "farmer" | "analyst" | "admin";

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  name: string;
  image: string | null;
  role: UserRole;
  isGuest: boolean;
}

export interface UserSession {
  user: AuthUser;
  expiresAt: string;
  provider: "google" | "email" | "phone" | "guest";
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  session: UserSession;
  status: AuthStatus;
  isGuest: boolean;
  isFarmer: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "google" | "phone";
  openAuthModal: (tab?: "google" | "phone") => void;
  closeAuthModal: () => void;
  signInWithGoogle: (profileOrEmail?: string | Partial<AuthUser>, name?: string, role?: UserRole) => Promise<void>;
  signInWithEmail: (email: string, name?: string, role?: UserRole) => Promise<void>;
  signInWithPhone: (phoneNumber: string, name?: string, role?: UserRole) => Promise<void>;
  continueAsGuest: () => void;
  setRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  signOut: () => void;
}
