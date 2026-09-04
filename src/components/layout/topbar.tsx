import { Bell, Settings } from "lucide-react";
import { LocationSearch } from "@/components/weather/location-search";
import type { NormalizedLocation } from "@/services/location/location-service";

interface TopbarProps {
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function Topbar({ onSelectLocation, selectedLocation }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4 flex-1">
        <LocationSearch onSelectLocation={onSelectLocation} selectedLocation={selectedLocation} />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center text-lg font-bold tracking-tight text-white mr-4">
          WeatherGPT 2.0
        </div>
        <button className="text-neutral-400 hover:text-white transition-colors">
          <Bell size={20} />
        </button>
        <button className="text-neutral-400 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
        <div className="h-8 w-8 rounded-full bg-cyan-900/50 overflow-hidden ml-2 border border-cyan-800 flex items-center justify-center">
          <span className="text-xs font-bold text-cyan-400">WG</span>
        </div>
      </div>
    </div>
  );
}

