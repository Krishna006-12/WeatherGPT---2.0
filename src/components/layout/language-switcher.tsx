"use client";

import { useLanguage } from "@/context/language-context";
import type { SupportedLanguage } from "@/lib/i18n/translations";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const options: { code: SupportedLanguage; label: string; short: string }[] = [
    { code: "en", label: "English", short: "EN" },
    { code: "hi", label: "हिंदी", short: "हिं" },
    { code: "pa", label: "ਪੰਜਾਬੀ", short: "ਪੰ" },
  ];

  return (
    <div
      className="flex items-center p-0.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]"
      role="group"
      aria-label="Language selection"
    >
      <div className="px-1.5 text-[var(--text-tertiary)] hidden sm:flex" aria-hidden="true">
        <Languages size={13} />
      </div>
      {options.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLanguage(opt.code)}
          aria-label={opt.label}
          aria-pressed={language === opt.code}
          data-language={opt.code}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            language === opt.code
              ? "bg-[var(--surface-1)] text-[var(--accent)] shadow-sm border border-[var(--border-subtle)] scale-[1.02]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
          }`}
          title={opt.label}
        >
          {opt.short}
        </button>
      ))}
    </div>
  );
}
