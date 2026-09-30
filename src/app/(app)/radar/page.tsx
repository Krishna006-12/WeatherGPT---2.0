"use client";

import dynamic from "next/dynamic";
import { useLocation } from "@/context/location-context";
import { Radar, Sparkles, AlertCircle, Droplets, CloudRain } from "lucide-react";

// Dynamically import InteractiveRadarMap to prevent SSR window issues
const InteractiveRadarMap = dynamic(
  () =>
    import("@/components/radar/interactive-radar-map").then(
      (mod) => mod.InteractiveRadarMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col items-center justify-center text-[var(--text-secondary)]">
        <Radar size={36} className="animate-spin text-cyan-400 mb-3" />
        <p className="font-semibold text-sm">Initializing Cartographic Radar Canvas...</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Streaming high-resolution doppler precipitation frames
        </p>
      </div>
    ),
  }
);

export default function RadarPage() {
  const { selectedLocation } = useLocation();

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Interactive Rain &amp; Storm Doppler Radar
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              REAL-TIME
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Continuous Doppler radar loop tracking storm cells, precipitation intensity, and atmospheric fronts for{" "}
            {selectedLocation?.displayName || "current location"}.
          </p>
        </div>
      </div>

      {/* Main Interactive Map */}
      <InteractiveRadarMap location={selectedLocation} />

      {/* Radar Science & Legend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <CloudRain size={16} />
            <span>Doppler Reflectivity</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Composite reflectivity scans measure electromagnetic backscatter from precipitation droplets, distinguishing light drizzle from heavy storm convection.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <Droplets size={16} />
            <span>2-Hour Nowcasting</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The timeline slider loops past observations and projected nowcasting vectors, helping identify if a storm band is approaching your sector.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertCircle size={16} />
            <span>Severe Cell Watch</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Areas shaded in bright orange to dark red indicate torrential precipitation, possible hail shafts, and elevated localized flash flood risk.
          </p>
        </div>
      </div>
    </div>
  );
}
