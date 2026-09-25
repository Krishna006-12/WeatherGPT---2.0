"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { LocationSearch } from "@/components/weather/location-search";
import { UserMenu } from "@/components/auth/user-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationCenter } from "@/components/layout/notification-center";
import { useLanguage } from "@/context/language-context";
import type { NormalizedLocation } from "@/services/location/location-service";

interface TopbarProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function Topbar({ onSelectLocation, selectedLocation }: TopbarProps) {
  const { t } = useLanguage();

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-xl z-20 sticky top-0"
      style={{
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left: Location Search Bar with guaranteed minimum readable width */}
      <div className="flex items-center gap-3 flex-1 min-w-[220px] sm:min-w-[280px] max-w-sm lg:max-w-md shrink-0 sm:shrink">
        <LocationSearch onSelectLocation={onSelectLocation} selectedLocation={selectedLocation} />
      </div>

      {/* Center: Meteorological Station Telemetry Status (fills the empty gap on wider desktop) */}
      <div className="hidden xl:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
          <span>{t("topbar.synoptic_grid", "Synoptic Grid Active")}</span>
        </div>
        <span className="text-[var(--border-default)]">•</span>
        <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
          {t("topbar.model_blend", "ECMWF / GFS")}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-3 shrink-0">
        <NotificationCenter />
        <ThemeToggle />
        <LanguageSwitcher />
        <UserMenu />

        <Link
          href="/settings"
          aria-label="System Settings"
          title="System Settings"
          className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors duration-150"
        >
          <Settings size={18} />
        </Link>

        {/* Product Brand Stamp (shown on extra wide displays) */}
        <div
          className="hidden 2xl:flex h-8 px-2.5 rounded-lg items-center gap-1.5 justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] select-none"
        >
          <img
            src="/icon-192.png"
            alt="WeatherGPT"
            width={18}
            height={18}
            className="w-4.5 h-4.5 rounded-md object-contain"
          />
          <span>WeatherGPT</span>
          <span className="text-[10px] text-[var(--accent)] font-bold">2.0</span>
        </div>
      </div>
    </header>
  );
}
