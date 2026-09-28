"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/language-context";
import type { SupportedLanguage } from "@/lib/i18n/translations";
import { Languages, Check } from "lucide-react";
import { triggerHaptic } from "@/lib/motion/haptics";

export interface LanguageSwitcherProps {
  variant?: "segmented" | "compact";
  className?: string;
}

export function LanguageSwitcher({
  variant = "segmented",
  className = "",
}: LanguageSwitcherProps = {}) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { code: SupportedLanguage; label: string; short: string; nativeName: string }[] = [
    { code: "en", label: "English", short: "EN", nativeName: "English" },
    { code: "hi", label: "हिंदी", short: "हिं", nativeName: "हिन्दी" },
    { code: "pa", label: "ਪੰਜਾਬੀ", short: "ਪੰ", nativeName: "ਪੰਜਾਬੀ" },
  ];

  const currentOption = options.find((opt) => opt.code === language) || options[0]!;

  // Handle outside click & escape key for compact dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: SupportedLanguage) => {
    triggerHaptic("light");
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === "compact") {
    return (
      <div ref={dropdownRef} className={`relative shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsOpen((prev) => !prev);
          }}
          aria-label={`Language: ${currentOption.label}`}
          title={`Language: ${currentOption.label}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-all duration-150 cursor-pointer"
        >
          <Languages size={15} className="text-[var(--accent)] shrink-0" />
          <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
            {currentOption.short}
          </span>
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Select Language"
            className="absolute right-0 mt-2 w-44 p-1.5 rounded-2xl bg-[var(--surface-2)]/95 backdrop-blur-xl border border-[var(--border-default)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)] mb-1 flex items-center justify-between">
              <span>Language / भाषा</span>
              <Languages size={12} className="text-[var(--accent)]" />
            </div>

            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(opt.code)}
                    aria-label={opt.label}
                    data-language={opt.code}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--surface-1)] text-[var(--accent)] font-semibold shadow-sm border border-[var(--border-subtle)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{opt.nativeName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-tertiary)] font-mono">
                        {opt.short}
                      </span>
                    </div>
                    {isSelected && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center p-0.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] ${className}`}
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
          onClick={() => {
            triggerHaptic("light");
            setLanguage(opt.code);
          }}
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
