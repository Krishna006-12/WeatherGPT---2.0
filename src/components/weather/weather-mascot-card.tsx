"use client";

import { useState } from "react";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";
import { getWeatherMascot, type WeatherMascotType } from "@/lib/weather/mascot-helper";
import { Sparkles, Shirt, Footprints } from "lucide-react";
import { triggerHaptic } from "@/lib/motion/haptics";
import { AntigravityMascot } from "@/components/weather/antigravity-mascot";

interface WeatherMascotCardProps {
  weather?: WeatherSnapshot | null;
  location?: NormalizedLocation | null;
  className?: string;
  compact?: boolean;
}

export function WeatherMascotCard({
  weather,
  location,
  className = "",
  compact = false,
}: WeatherMascotCardProps) {
  const current = weather?.current;
  const condition = current?.condition || "Clear";
  const temperature = current?.temperature;
  const windSpeed = current?.windSpeed;

  // Resolved dynamic mascot based on live location weather
  const liveMascot = getWeatherMascot(condition, temperature, windSpeed);

  // Allow user to preview poses if they want to inspect the character sheet
  const [manualPose, setManualPose] = useState<WeatherMascotType | null>(null);

  const activeMascot = manualPose
    ? getWeatherMascot(manualPose === "sunny" ? "Sunny" : manualPose === "cloudy" ? "Cloudy" : manualPose === "rainy" ? "Rain" : "Snow")
    : liveMascot;

  const cityName = location?.displayName?.split(",")[0] || location?.name || "Local";

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-black/10 dark:border-white/10 backdrop-blur-xl transition-all duration-300 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_-6px_rgba(255,255,255,0.04)] ${className}`}
      style={{
        background: activeMascot.moodGradient,
      }}
    >
      {/* Radial ambient glow */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{ background: activeMascot.accentColor }}
      />

      <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full">
        {/* Header: Title + Weather Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ background: activeMascot.accentColor }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {cityName} Mascot
            </span>
          </div>

          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase transition-colors"
            style={{
              background: "hsla(0, 0%, 100%, 0.15)",
              color: activeMascot.accentColor,
              border: `1px solid ${activeMascot.accentColor}40`,
            }}
          >
            {activeMascot.badgeLabel}
          </span>
        </div>

        {/* Character Visual Showcase — Antigravity Physics Floating Mascot */}
        <div className="relative w-full flex items-center justify-center my-2 sm:my-3">
          <AntigravityMascot
            imageSrc={activeMascot.imageSrc}
            alt={`${activeMascot.title} mascot`}
            accentColor={activeMascot.accentColor}
            weatherType={activeMascot.type}
            pointerReactive={true}
            priority
          />
        </div>

        {/* Dynamic Contextual Advisory */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <Footprints size={14} style={{ color: activeMascot.accentColor }} />
            <span>{activeMascot.title}</span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            {activeMascot.activityTip}
          </p>

          {!compact && (
            <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-tertiary)] pt-1 border-t border-black/5 dark:border-white/5">
              <Shirt size={12} className="shrink-0 mt-0.5" style={{ color: activeMascot.accentColor }} />
              <span>{activeMascot.outfitTip}</span>
            </div>
          )}
        </div>

        {/* Interactive Pose Switcher (One UI Pill Selector) */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
            <Sparkles size={11} />
            Weather Poses
          </span>

          <div className="flex items-center gap-1">
            {(["sunny", "cloudy", "rainy", "snowy"] as WeatherMascotType[]).map((p) => {
              const isSelected = (manualPose || liveMascot.type) === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setManualPose(manualPose === p ? null : p);
                  }}
                  title={`Preview ${p} mascot`}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-white/20 text-neutral-900 dark:text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
