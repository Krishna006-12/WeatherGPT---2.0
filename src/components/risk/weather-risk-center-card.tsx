"use client";

import { useState } from "react";
import { useRisk } from "@/hooks/use-risk";
import { useLanguage } from "@/context/language-context";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { RiskAssessment, RiskCategory, RiskSeverity } from "@/types/risk";
import {
  AlertTriangle,
  CloudRain,
  Zap,
  Wind,
  Flame,
  Sun,
  Waves,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";

interface WeatherRiskCenterCardProps {
  location?: NormalizedLocation | null;
}

const CATEGORY_META: Record<
  RiskCategory,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  heavy_rain: { label: "Heavy Rain", icon: CloudRain },
  thunderstorm: { label: "Thunderstorm", icon: Zap },
  wind: { label: "Wind", icon: Wind },
  heat: { label: "Heat", icon: Flame },
  uv: { label: "UV", icon: Sun },
  flood: { label: "Flood", icon: Waves },
  drought: { label: "Drought", icon: Flame },
  cyclone: { label: "Cyclone", icon: Wind },
};

const ORDERED_CATEGORIES: RiskCategory[] = [
  "cyclone",
  "flood",
  "heavy_rain",
  "thunderstorm",
  "wind",
  "heat",
  "drought",
  "uv",
];

function getSeverityBadge(severity: RiskSeverity): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (severity) {
    case "extreme":
      return {
        label: "Extreme",
        badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
        dotColor: "bg-red-500",
      };
    case "high":
      return {
        label: "High",
        badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
        dotColor: "bg-red-500",
      };
    case "moderate":
      return {
        label: "Moderate",
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        dotColor: "bg-amber-400",
      };
    case "low":
      return {
        label: "Low",
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        dotColor: "bg-emerald-400",
      };
    case "unavailable":
      return {
        label: "Unavailable",
        badgeClass: "bg-white/5 text-neutral-400 border-white/10",
        dotColor: "bg-neutral-500",
      };
    case "no_evidence":
    default:
      return {
        label: "No evidence",
        badgeClass: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
        dotColor: "bg-neutral-400",
      };
  }
}

export function WeatherRiskCenterCard({ location }: WeatherRiskCenterCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<RiskCategory | null>(null);
  const { t } = useLanguage();

  const { data: report, isLoading, error } = useRisk({
    latitude: location?.latitude,
    longitude: location?.longitude,
    timezone: location?.timezone,
    enabled: !!location?.latitude && !!location?.longitude,
  });

  if (!location) return null;

  if (isLoading) {
    return <div className="wg-skeleton h-72 w-full rounded-xl" />;
  }

  if (error || !report) {
    return (
      <div className="wg-surface-decision flex flex-col justify-center items-center min-h-[180px] p-6 text-center">
        <AlertTriangle size={24} className="text-[var(--text-tertiary)] mb-2 opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">Risk Center Data Unavailable</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Unable to generate deterministic risk assessments for this location.
        </p>
      </div>
    );
  }

  // Create a fast lookup map for the assessments
  const assessmentMap = new Map<RiskCategory, RiskAssessment>();
  for (const a of report.assessments) {
    assessmentMap.set(a.type, a);
  }

  const toggleCategory = (category: RiskCategory) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  return (
    <section
      aria-label="Weather Risk Center"
      className="wg-surface-decision flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] wg-animate-in"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-400" />
            <h3 className="text-sm font-semibold tracking-normal text-[var(--text-primary)]">
              {t("risk.center_title", "Weather Risk Center")}
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-tertiary)]">
            {t("risk.verified", "Verified")}
          </span>
        </div>

        {/* Category Risk Rows */}
        <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {ORDERED_CATEGORIES.map((catKey) => {
            const assessment = assessmentMap.get(catKey);
            if (!assessment) return null;

            const meta = CATEGORY_META[catKey];
            const IconComponent = meta.icon;
            const badge = getSeverityBadge(assessment.severity);
            const isExpanded = expandedCategory === catKey;

            return (
              <div key={catKey} className="py-2.5 first:pt-1 last:pb-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(catKey)}
                  className="w-full flex items-center justify-between text-left group hover:opacity-90 transition-opacity"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                      {t(`risk.${catKey}`, meta.label)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                      {t(`risk.${assessment.severity}`, badge.label)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
                    ) : (
                      <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-[var(--border-subtle)] pl-7 pr-1 text-xs space-y-2 wg-animate-in">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                      <span>{t("risk.window", "Window:")} {assessment.timeWindow}</span>
                      <span>•</span>
                      <span>{t("risk.confidence", "Confidence:")} {assessment.confidence.toUpperCase()}</span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {assessment.recommendation}
                    </p>

                    {/* Evidence List */}
                    {assessment.evidence.length > 0 && (
                      <div className="bg-black/20 p-2 rounded-lg border border-[var(--border-subtle)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                          {t("risk.verified_evidence", "Verified Evidence")}
                        </span>
                        {assessment.evidence.map((ev, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-[11px] text-[var(--text-secondary)]"
                          >
                            <span className="capitalize">{ev.metric.replace(/_/g, " ")}:</span>
                            <span className="font-mono text-[var(--text-primary)]">
                              {ev.value} {ev.unit || ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {assessment.reason && (
                      <p className="text-[11px] text-[var(--text-tertiary)] italic">
                        {assessment.reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>{t("risk.updated_forecast", "Updated from verified forecast")}</span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-emerald-400" />
          {t("risk.deterministic", "Deterministic")}
        </span>
      </div>
    </section>
  );
}
