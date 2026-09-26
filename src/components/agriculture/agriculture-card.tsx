"use client";

import { useState } from "react";
import { useAgriculture } from "@/hooks/use-agriculture";
import { useLanguage } from "@/context/language-context";
import { Sprout, CheckCircle2, AlertCircle, Droplets, Wind, Tractor, Leaf } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { CropType } from "@/types/agriculture";

const CROPS: { id: CropType; key: string; label: string }[] = [
  { id: "wheat", key: "agri.crop_wheat", label: "Wheat" },
  { id: "rice", key: "agri.crop_rice", label: "Rice" },
  { id: "maize", key: "agri.crop_maize", label: "Maize" },
  { id: "potato", key: "agri.crop_potato", label: "Potato" },
  { id: "mustard", key: "agri.crop_mustard", label: "Mustard" },
];

export function AgricultureCard({ location }: { location?: NormalizedLocation | null }) {
  const { t } = useLanguage();
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
    return <div className="wg-skeleton h-80 w-full" />;
  }

  if (error || !assessment) {
    return (
      <div className="wg-card flex flex-col justify-center items-center min-h-[160px] p-6 text-center">
        <Sprout size={22} className="text-[var(--text-tertiary)] mb-2 opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">Agricultural Data Unavailable</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Unable to evaluate agricultural risk for this location.
        </p>
      </div>
    );
  }

  const riskStyles = {
    critical: { color: "hsl(0, 80%, 65%)", bg: "hsla(0, 80%, 60%, 0.12)", border: "hsla(0, 80%, 60%, 0.25)" },
    high: { color: "hsl(25, 85%, 60%)", bg: "hsla(25, 85%, 60%, 0.12)", border: "hsla(25, 85%, 60%, 0.25)" },
    moderate: { color: "hsl(45, 90%, 55%)", bg: "hsla(45, 90%, 55%, 0.12)", border: "hsla(45, 90%, 55%, 0.25)" },
    low: { color: "var(--status-success)", bg: "hsla(160, 60%, 50%, 0.12)", border: "hsla(160, 60%, 50%, 0.25)" },
  };

  const risk = riskStyles[assessment.overallRiskLevel as keyof typeof riskStyles] || riskStyles.low;

  const activityStyles = {
    favorable: { color: "var(--status-success)", bg: "hsla(160, 60%, 50%, 0.1)", border: "hsla(160, 60%, 50%, 0.2)" },
    caution: { color: "var(--status-warning)", bg: "hsla(45, 90%, 55%, 0.1)", border: "hsla(45, 90%, 55%, 0.2)" },
    unfavorable: { color: "var(--status-danger)", bg: "hsla(0, 80%, 60%, 0.1)", border: "hsla(0, 80%, 60%, 0.2)" },
  };

  const activities = [
    { key: "irrigation", label: t("agri.irrigation", "Irrigation"), icon: <Droplets size={13} className="text-[var(--accent)]" />, data: assessment.activities.irrigation },
    { key: "spraying", label: t("agri.spraying", "Spraying"), icon: <Wind size={13} className="text-[var(--status-warning)]" />, data: assessment.activities.spraying },
    { key: "fieldOperations", label: t("agri.field_operations", "Field Ops"), icon: <Tractor size={13} className="text-[var(--status-success)]" />, data: assessment.activities.fieldOperations },
    ...(assessment.activities.harvesting ? [{ key: "harvesting", label: t("agri.harvesting", "Harvesting"), icon: <Leaf size={13} className="text-[var(--accent)]" />, data: assessment.activities.harvesting }] : []),
    ...(assessment.activities.sowing ? [{ key: "sowing", label: t("agri.sowing", "Sowing"), icon: <Sprout size={13} className="text-[var(--status-success)]" />, data: assessment.activities.sowing }] : []),
  ];

  return (
    <section
      aria-label="Agricultural Weather Intelligence"
      className="wg-surface-decision flex flex-col justify-between h-full p-5 sm:p-6 wg-animate-in wg-stagger-4"
    >
      <div>
        {/* Header: Title + Grounded indicator */}
        <div className="flex justify-between items-center mb-3.5">
          <div className="flex items-center gap-2">
            <Leaf size={15} className="text-[var(--status-success)]" />
            <h3 className="wg-section-label">{t("agri.title", "Agriculture")}</h3>
          </div>

          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 size={11} strokeWidth={2.5} /> {t("risk.verified", "Grounded")}
          </span>
        </div>

        {/* Crop Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 wg-hide-scroll snap-x">
          {CROPS.map((crop) => (
            <button
              key={crop.id}
              onClick={() => setSelectedCrop(crop.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap snap-start transition-colors duration-150"
              style={{
                background: selectedCrop === crop.id ? "hsla(160, 60%, 50%, 0.14)" : "var(--surface-2)",
                color: selectedCrop === crop.id ? "var(--status-success)" : "var(--text-tertiary)",
                border: selectedCrop === crop.id ? "1px solid hsla(160, 60%, 50%, 0.28)" : "1px solid var(--border-subtle)",
              }}
            >
              {t(crop.key, crop.label)}
            </button>
          ))}
        </div>

        {/* Risk & Crop Banner */}
        <div
          className="px-3.5 py-2.5 rounded-xl flex items-center justify-between mb-3"
          style={{ background: risk.bg, border: `1px solid ${risk.border}` }}
        >
          <div className="flex items-center gap-2" style={{ color: risk.color }}>
            <AlertCircle size={15} />
            <span className="text-xs font-bold tracking-tight capitalize">
              {assessment.overallRiskLevel} Risk
            </span>
          </div>
          <span
            className="text-[11px] uppercase font-bold tracking-wider"
            style={{ color: risk.color, opacity: 0.9 }}
          >
            {assessment.cropDisplayName}
          </span>
        </div>

        {/* Activity Guidance Rows */}
        <div className="space-y-2">
          {activities.map((act) => {
            const st = activityStyles[act.data.status as keyof typeof activityStyles] || activityStyles.favorable;
            return (
              <div
                key={act.key}
                className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--text-primary)]">
                    {act.icon}
                    <span>{act.label}</span>
                  </div>
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold capitalize"
                    style={{ color: st.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span>{act.data.status}</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {act.data.advisory}
                </p>
              </div>
            );
          })}
        </div>

        {/* Key Hazard Trigger */}
        {assessment.hazards.length > 0 && (
          <div className="p-3 rounded-xl bg-[var(--surface-base)]/50 border border-[var(--border-subtle)] mt-2.5 space-y-1">
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">
              {t("agri.hazard_trigger", "Hazard Trigger")}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {assessment.hazards[0]?.description}
            </p>
            <div className="font-mono text-xs text-[var(--text-tertiary)] pt-0.5">
              Metric: {assessment.hazards[0]?.triggerMetric}
            </div>
          </div>
        )}

        {assessment.cropEvidenceNote && (
          <div className="p-2.5 rounded-xl bg-[var(--surface-base)]/40 border border-[var(--border-subtle)] mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            {assessment.cropEvidenceNote}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--text-tertiary)] leading-relaxed pt-3 border-t border-[var(--border-subtle)] mt-3">
        {assessment.disclaimer}
      </p>
    </section>
  );
}

