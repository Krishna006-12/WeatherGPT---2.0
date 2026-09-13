"use client";

import { useState } from "react";
import { useConsensus } from "@/hooks/use-consensus";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { ConsensusConfidence, NwpModelId } from "@/types/nwp";
import {
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Thermometer,
  CloudRain,
  Wind,
} from "lucide-react";

interface ModelConsensusCardProps {
  location?: NormalizedLocation | null;
}

function getConfidenceBadge(confidence: ConsensusConfidence, score: number): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (confidence) {
    case "high":
      return {
        label: `${score}% Agreement • High`,
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        dotColor: "bg-emerald-400",
      };
    case "moderate":
      return {
        label: `${score}% Agreement • Moderate`,
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        dotColor: "bg-amber-400",
      };
    case "low":
    default:
      return {
        label: `${score}% Agreement • Divergence`,
        badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
        dotColor: "bg-red-400",
      };
  }
}

export function ModelConsensusCard({ location }: ModelConsensusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: report, isLoading, error } = useConsensus({
    latitude: location?.latitude,
    longitude: location?.longitude,
    timezone: location?.timezone,
    enabled: !!location?.latitude && !!location?.longitude,
  });

  if (!location) return null;

  if (isLoading) {
    return <div className="wg-skeleton h-64 w-full rounded-2xl" />;
  }

  if (error || !report) {
    return (
      <div className="wg-surface-decision flex flex-col justify-center items-center min-h-[160px] p-6 text-center rounded-2xl border border-[var(--border-subtle)]">
        <Layers size={22} className="text-[var(--text-tertiary)] mb-2 opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">Multi-Model Consensus Unavailable</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Unable to retrieve simultaneous NWP model runs for this coordinate.
        </p>
      </div>
    );
  }

  const primaryDay = report.consensusDays[0];
  if (!primaryDay) return null;

  const confidenceBadge = getConfidenceBadge(
    report.overallConfidence,
    report.overallAgreementScore
  );

  return (
    <section
      aria-label="NWP Model Consensus"
      className="wg-surface-decision flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] wg-animate-in"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-cyan-400" />
            <h3 className="text-xs uppercase font-bold tracking-wider text-[var(--text-primary)]">
              NWP Model Consensus
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${confidenceBadge.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dotColor}`} />
            {confidenceBadge.label}
          </span>
        </div>

        {/* Evaluated Models Chips */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {report.modelDetails.map((m) => (
            <span
              key={m.modelId}
              className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-secondary)]"
            >
              {m.name} ({m.resolutionKm}km)
            </span>
          ))}
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-black/20 rounded-xl border border-[var(--border-subtle)] mb-3">
          {/* Temperature Consensus */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] mb-0.5">
              <Thermometer size={12} className="text-rose-400" />
              <span>High Temp</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {primaryDay.temperatureHigh.mean}°C
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              Spread: ±{primaryDay.temperatureHigh.spread}°C
            </span>
          </div>

          {/* Precipitation Consensus */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] mb-0.5">
              <CloudRain size={12} className="text-blue-400" />
              <span>Rainfall</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {primaryDay.precipitationSum.mean} mm
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              Spread: {primaryDay.precipitationSum.spread} mm
            </span>
          </div>

          {/* Wind Consensus */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] mb-0.5">
              <Wind size={12} className="text-teal-400" />
              <span>Max Wind</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {primaryDay.windSpeedMax.mean} km/h
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              Spread: {primaryDay.windSpeedMax.spread} km/h
            </span>
          </div>
        </div>

        {/* Summary Note */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
          {report.summaryNotes}
        </p>

        {/* Outlier Alert if present */}
        {primaryDay.divergentModels.length > 0 && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 mb-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              {primaryDay.divergentModels.map((div, i) => (
                <p key={i} className="text-[11px] leading-tight">
                  {div.explanation}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Model Comparison Table */}
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left py-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            aria-expanded={isExpanded}
          >
            <span>Individual Model Predictions</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] space-y-1.5 wg-animate-in">
              {report.modelsUsed.map((mId) => {
                const modelDetails = report.modelDetails.find((m) => m.modelId === mId);
                const temp = primaryDay.temperatureHigh.valuesByModel[mId];
                const precip = primaryDay.precipitationSum.valuesByModel[mId];
                const cond = primaryDay.modelConditions[mId];

                return (
                  <div
                    key={mId}
                    className="flex justify-between items-center text-[11px] p-2 bg-black/10 rounded-lg border border-white/5"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {modelDetails?.name || mId.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[var(--text-secondary)]">
                      <span>{temp !== undefined ? `${temp}°C` : "—"}</span>
                      <span>{precip !== undefined ? `${precip}mm` : "—"}</span>
                      <span className="text-[var(--text-tertiary)] capitalize">{cond || "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>ECMWF IFS • NOAA GFS • DWD ICON</span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-cyan-400" />
          Deterministic Ensemble
        </span>
      </div>
    </section>
  );
}
