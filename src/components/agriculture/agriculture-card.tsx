"use client";

import { useState } from "react";
import { useAgriculture } from "@/hooks/use-agriculture";
import { Skeleton } from "@/components/ui/skeleton";
import { Sprout, CheckCircle2, AlertCircle, Droplets, Wind, Tractor } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { CropType } from "@/types/agriculture";

const CROPS: { id: CropType; label: string }[] = [
  { id: "wheat", label: "Wheat" },
  { id: "rice", label: "Rice" },
  { id: "maize", label: "Maize" },
  { id: "potato", label: "Potato" },
  { id: "mustard", label: "Mustard" },
];

export function AgricultureCard({ location }: { location?: NormalizedLocation | null }) {
  const [selectedCrop, setSelectedCrop] = useState<CropType>("wheat");

  const { data: assessment, isLoading, error } = useAgriculture({
    latitude: location?.latitude,
    longitude: location?.longitude,
    crop: selectedCrop,
    timezone: location?.timezone,
    enabled: !!location?.latitude && !!location?.longitude,
  });

  if (!location) return null;

  if (isLoading) {
    return <Skeleton className="h-80 rounded-3xl bg-[#1E1E1E]" />;
  }

  if (error || !assessment) {
    return (
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <Sprout size={18} className="text-emerald-400" />
            <h3 className="font-bold text-white uppercase tracking-wide text-sm">
              Agricultural Intelligence
            </h3>
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          Unable to evaluate agricultural risk for this location.
        </p>
      </div>
    );
  }

  const riskBadgeColor =
    assessment.overallRiskLevel === "critical"
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : assessment.overallRiskLevel === "high"
      ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
      : assessment.overallRiskLevel === "moderate"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  const getActivityColor = (status: "favorable" | "caution" | "unfavorable") => {
    switch (status) {
      case "favorable":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "caution":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "unfavorable":
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  };

  return (
    <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-4">
      {/* 1. Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <Sprout size={18} className="text-emerald-400" />
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">
            Agricultural Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-900/50 rounded-full text-[10px] font-medium text-emerald-400">
          <CheckCircle2 size={12} /> Grounded
        </div>
      </div>

      {/* 2. Crop Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CROPS.map((crop) => (
          <button
            key={crop.id}
            onClick={() => setSelectedCrop(crop.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              selectedCrop === crop.id
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-white/5 text-neutral-400 border-white/5 hover:text-neutral-200"
            }`}
          >
            {crop.label}
          </button>
        ))}
      </div>

      {/* 3. Overall Weather Risk Banner */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${riskBadgeColor}`}>
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-xs font-semibold capitalize">
            {assessment.overallRiskLevel} Weather Risk
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
          {assessment.cropDisplayName}
        </span>
      </div>

      {/* 4. Three Activity Suitability Rows */}
      <div className="space-y-2 text-xs">
        {/* Irrigation */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium text-neutral-200">
              <Droplets size={14} className="text-cyan-400" />
              <span>Irrigation</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${getActivityColor(
                assessment.activities.irrigation.status
              )}`}
            >
              {assessment.activities.irrigation.status}
            </span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            {assessment.activities.irrigation.advisory}
          </p>
        </div>

        {/* Spraying */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium text-neutral-200">
              <Wind size={14} className="text-amber-400" />
              <span>Spraying</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${getActivityColor(
                assessment.activities.spraying.status
              )}`}
            >
              {assessment.activities.spraying.status}
            </span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            {assessment.activities.spraying.advisory}
          </p>
        </div>

        {/* Field Operations */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium text-neutral-200">
              <Tractor size={14} className="text-emerald-400" />
              <span>Field Operations</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${getActivityColor(
                assessment.activities.fieldOperations.status
              )}`}
            >
              {assessment.activities.fieldOperations.status}
            </span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            {assessment.activities.fieldOperations.advisory}
          </p>
        </div>
      </div>

      {/* 5. Detected Hazard & Evidence (if present) */}
      {assessment.hazards.length > 0 && (
        <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs">
          <div className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
            Key Hazard Trigger
          </div>
          <p className="text-neutral-300 text-[11px]">
            {assessment.hazards[0]?.description}
          </p>
          <div className="text-[10px] text-neutral-400 font-mono pt-1">
            Trigger: {assessment.hazards[0]?.triggerMetric}
          </div>
        </div>
      )}

      {/* 6. Grounded Disclaimer */}
      <p className="text-[10px] text-neutral-500 leading-tight pt-1">
        {assessment.disclaimer}
      </p>
    </div>
  );
}
