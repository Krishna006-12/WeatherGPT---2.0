"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Clock, Trash2 } from "lucide-react";
import { useLocationSearch } from "@/hooks/use-location-search";
import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { getLocalizedLocationName } from "@/lib/i18n/location-names";
import type { NormalizedLocation } from "@/services/location/location-service";

interface LocationSearchProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function LocationSearch({
  onSelectLocation,
  selectedLocation: _selectedLocation,
}: LocationSearchProps) {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { recentLocations, removeRecent, clearRecents } = useLocation();

  const isSearchMode = searchTerm.trim().length >= 2;
  const isRecentsMode = isOpen && searchTerm.trim().length === 0 && recentLocations.length > 0;

  const { data: results, isLoading, isError, error } = useLocationSearch(
    searchTerm,
    isOpen && isSearchMode
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (location: NormalizedLocation) => {
    onSelectLocation(location);
    setSearchTerm(location.displayName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-[200px] sm:min-w-[260px] max-w-lg">
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none"
        />
        <input
          type="text"
          placeholder={t("topbar.search_placeholder", "Search city (e.g. Kanpur, London, Tokyo)...")}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] focus:border-[var(--accent-border)] focus:bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors duration-150 min-w-0"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearchTerm("");
              setIsOpen(true);
            }}
            className="absolute right-2.5 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Recents Mode Dropdown */}
      {isRecentsMode && (
        <div className="absolute left-0 z-50 mt-1.5 max-h-72 w-full min-w-[280px] sm:min-w-[340px] max-w-[calc(100vw-2rem)] overflow-auto p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-default)] shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)] mb-1">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-cyan-400" />
              {t("topbar.recent_searches", "Recent Searches")}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearRecents();
              }}
              className="text-[10px] text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={10} />
              {t("topbar.clear_all", "Clear")}
            </button>
          </div>

          {recentLocations.map((loc) => {
            const localized = getLocalizedLocationName(
              {
                name: loc.name,
                region: loc.region,
                country: loc.country,
                displayName: loc.displayName,
              },
              language
            );
            return (
              <div
                key={`recent-${loc.id}-${loc.displayName}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--surface-3)] group"
              >
                <button
                  type="button"
                  className="flex-1 text-left focus:outline-none"
                  onClick={() => handleSelect(loc)}
                >
                  <div className="text-xs sm:text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {localized.fullDisplayName}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}° • {loc.timezone}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${loc.displayName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecent(loc.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-red-400 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Search Query Dropdown */}
      {isOpen && isSearchMode && (
        <div className="absolute left-0 z-50 mt-1.5 max-h-64 w-full min-w-[280px] sm:min-w-[340px] max-w-[calc(100vw-2rem)] overflow-auto p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-default)] shadow-2xl backdrop-blur-md">
          {isLoading && (
            <div className="p-3 text-xs text-[var(--text-tertiary)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              {t("copilot.analyzing", "Searching global coordinates...")}
            </div>
          )}

          {isError && (
            <div className="p-3 text-xs text-[var(--status-danger)]">
              {error?.message || "Failed to search locations"}
            </div>
          )}

          {!isLoading && !isError && results && results.length === 0 && (
            <div className="p-3 text-xs text-[var(--text-tertiary)]">
              {t("topbar.no_recents", "No locations found")} &ldquo;{searchTerm}&rdquo;
            </div>
          )}

          {!isLoading &&
            results &&
            results.map((loc) => {
              const localized = getLocalizedLocationName(
                {
                  name: loc.name,
                  region: loc.region,
                  country: loc.country,
                  displayName: loc.displayName,
                },
                language
              );
              return (
                <button
                  key={loc.id}
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--surface-3)] focus:bg-[var(--surface-3)] focus:outline-none group"
                  onClick={() => handleSelect(loc)}
                >
                  <div className="text-xs sm:text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {localized.fullDisplayName}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}° • {loc.timezone}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
