/**
 * Authentication and session contracts for WeatherGPT 2.0.
 * Supports OAuth (Google) and zero-barrier anonymous rural guest access.
 */

export type UserRole = "user" | "farmer" | "analyst" | "admin";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  role: UserRole;
  isGuest: boolean;
}

export interface UserSession {
  user: AuthUser;
  expiresAt: string;
  provider: "google" | "guest";
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  session: UserSession;
  status: AuthStatus;
  isGuest: boolean;
  isFarmer: boolean;
  signInWithGoogle: (mockProfile?: Partial<AuthUser>) => Promise<void>;
  continueAsGuest: () => void;
  setRole: (role: UserRole) => void;
  signOut: () => void;
}
