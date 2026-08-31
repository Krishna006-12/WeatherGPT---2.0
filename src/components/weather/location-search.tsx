"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocationSearch } from "@/hooks/use-location-search";
import type { NormalizedLocation } from "@/services/location/location-service";

interface LocationSearchProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function LocationSearch({
  onSelectLocation,
  selectedLocation,
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
    <div className="relative w-full max-w-xl">
      <div className="flex gap-2">
        <Input
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
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setIsOpen(false);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {isOpen && searchTerm.trim().length >= 2 && (
        <Card className="absolute z-50 mt-1 max-h-60 w-full overflow-auto p-1 shadow-lg">
          {isLoading && (
            <div className="p-3 text-sm text-neutral-500">Searching locations...</div>
          )}

          {isError && (
            <div className="p-3 text-sm text-red-500">
              {error.message || "Failed to search locations"}
            </div>
          )}

          {!isLoading && !isError && results && results.length === 0 && (
            <div className="p-3 text-sm text-neutral-500">
              No locations found for &ldquo;{searchTerm}&rdquo;
            </div>
          )}

          {!isLoading &&
            results &&
            results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => handleSelect(loc)}
              >
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {loc.displayName}
                </div>
                <div className="text-xs text-neutral-500">
                  {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}° • {loc.timezone}
                </div>
              </button>
            ))}
        </Card>
      )}

      {selectedLocation && (
        <div className="mt-2 text-xs text-neutral-500">
          Selected: <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedLocation.displayName}</span> ({selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}) • Timezone: {selectedLocation.timezone}
        </div>
      )}
    </div>
  );
}
