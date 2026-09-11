"use client";

import { useLocation } from "@/context/location-context";
import { ImpactCard } from "@/components/impact/impact-card";
import { AgricultureCard } from "@/components/agriculture/agriculture-card";
import { Shield, Sprout } from "lucide-react";

export default function ImpactPage() {
  const { selectedLocation } = useLocation();

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-white">Regional Risk &amp; Impact</h2>
          <p className="text-neutral-400">Search for a location above to assess regional hazards and agricultural vulnerability.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Regional Risk &amp; Impact Analysis
        </h1>
        <p className="text-sm text-neutral-400">
          Evaluated hazard exposure, grounded community impact, and agronomic risk intelligence for {selectedLocation.displayName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Disaster & Infrastructure Impact */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <Shield size={18} className="text-cyan-400" />
            <span>Hazard &amp; Event Vulnerability</span>
          </div>
          <ImpactCard location={selectedLocation} />
        </div>

        {/* Agricultural & Crop Intelligence */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <Sprout size={18} className="text-emerald-400" />
            <span>Agronomic &amp; Agricultural Vulnerability</span>
          </div>
          <AgricultureCard location={selectedLocation} />
        </div>
      </div>
    </div>
  );
}
