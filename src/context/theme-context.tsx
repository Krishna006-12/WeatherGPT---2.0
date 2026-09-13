"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY_THEME = "weathergpt_user_theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Apply theme class to <html> and <body>
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
  }, []);

  // Hydrate theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
      if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
        setThemeState(saved);
        const resolved = saved === "system" ? getSystemTheme() : saved;
        setResolvedTheme(resolved);
        applyTheme(resolved);
      } else {
        // Default to reference-inspired light theme
        setThemeState("light");
        setResolvedTheme("light");
        applyTheme("light");
      }
    } catch {
      applyTheme("light");
    }
  }, [applyTheme]);

  // Listen to OS system preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      const resolved = newTheme === "system" ? getSystemTheme() : newTheme;
      setResolvedTheme(resolved);
      applyTheme(resolved);
      try {
        localStorage.setItem(STORAGE_KEY_THEME, newTheme);
      } catch {
        // ignore
      }
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
