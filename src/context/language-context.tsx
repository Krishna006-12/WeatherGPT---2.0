"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type SupportedLanguage,
  TRANSLATIONS,
} from "@/lib/i18n/translations";

const STORAGE_KEY_LANG = "weathergpt_user_language";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG) as SupportedLanguage | null;
      if (saved && (saved === "en" || saved === "hi" || saved === "pa")) {
        setLanguageState(saved);
        if (typeof document !== "undefined") {
          document.documentElement.lang = saved;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      const langDict = TRANSLATIONS[language];
      if (langDict && langDict[key]) {
        return langDict[key]!;
      }
      // Fallback to English
      const enDict = TRANSLATIONS.en;
      if (enDict && enDict[key]) {
        return enDict[key]!;
      }
      return defaultText || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (key: string, defaultText?: string) => TRANSLATIONS.en[key] || defaultText || key,
    };
  }
  return context;
}
