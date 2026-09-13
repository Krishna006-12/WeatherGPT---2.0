import Link from "next/link";
import { Settings } from "lucide-react";
import { LocationSearch } from "@/components/weather/location-search";
import { UserMenu } from "@/components/auth/user-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { NormalizedLocation } from "@/services/location/location-service";

interface TopbarProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function Topbar({ onSelectLocation, selectedLocation }: TopbarProps) {
  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-xl z-20 sticky top-0"
      style={{
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left: Location Search Bar with keyboard shortcut hint */}
      <div className="flex items-center gap-3 flex-1 max-w-md lg:max-w-lg">
        <LocationSearch onSelectLocation={onSelectLocation} selectedLocation={selectedLocation} />
      </div>

      {/* Center: Meteorological Station Telemetry Status (fills the empty gap on desktop) */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
          <span>Synoptic Grid Active</span>
        </div>
        <span className="text-[var(--border-default)]">•</span>
        <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
          Model: ECMWF / GFS Blend
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 ml-3">
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

        {/* Product Brand Stamp */}
        <div
          className="h-8 px-2.5 rounded-lg flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] select-none"
        >
          <span>WeatherGPT</span>
          <span className="ml-1 text-[10px] text-[var(--accent)] font-bold">2.0</span>
        </div>
      </div>
    </header>
  );
}
