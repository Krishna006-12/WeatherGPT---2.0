"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useLocationSearch } from "@/hooks/use-location-search";
import type { NormalizedLocation } from "@/services/location/location-service";

interface LocationSearchProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function LocationSearch({
  onSelectLocation,
  selectedLocation: _selectedLocation,
}: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: results, isLoading, isError, error } = useLocationSearch(
    searchTerm,
    isOpen && searchTerm.trim().length >= 2
  );

  const handleSelect = (location: NormalizedLocation) => {
    onSelectLocation(location);
    setSearchTerm(location.displayName);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search city (e.g. Kanpur, London, Tokyo)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (searchTerm.trim().length >= 2) setIsOpen(true);
          }}
          className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] focus:border-[var(--accent-border)] focus:bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors duration-150"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearchTerm("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && searchTerm.trim().length >= 2 && (
        <div
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-auto p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-default)] shadow-2xl backdrop-blur-md"
        >
          {isLoading && (
            <div className="p-3 text-xs text-[var(--text-tertiary)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              Searching global coordinates...
            </div>
          )}

          {isError && (
            <div className="p-3 text-xs text-[var(--status-danger)]">
              {error?.message || "Failed to search locations"}
            </div>
          )}

          {!isLoading && !isError && results && results.length === 0 && (
            <div className="p-3 text-xs text-[var(--text-tertiary)]">
              No locations found for &ldquo;{searchTerm}&rdquo;
            </div>
          )}

          {!isLoading &&
            results &&
            results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--surface-3)] focus:bg-[var(--surface-3)] focus:outline-none group"
                onClick={() => handleSelect(loc)}
              >
                <div className="text-xs sm:text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {loc.displayName}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}° • {loc.timezone}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

