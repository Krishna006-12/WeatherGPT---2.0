"use client";

import { useState } from "react";
import { useActivity } from "@/hooks/use-activity";
import { useLanguage } from "@/context/language-context";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { ActivityType, ActivitySafetyLevel } from "@/types/activity";
import {
  Compass,
  Car,
  HardHat,
  Bike,
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ActivitySuitabilityCardProps {
  location?: NormalizedLocation | null;
}

const ACTIVITIES: { id: ActivityType; key: string; label: string; icon: typeof Bike }[] = [
  { id: "running_cycling", key: "activity.running_cycling", label: "Running & Cycling", icon: Bike },
  { id: "commute", key: "activity.commute", label: "Commute & Roads", icon: Car },
  { id: "travel_road", key: "activity.travel_road", label: "Highway Travel", icon: Compass },
  { id: "outdoor_work", key: "activity.outdoor_labor", label: "Outdoor Labor", icon: HardHat },
  { id: "school_sports", key: "activity.school_sports", label: "School Sports", icon: Users },
  { id: "outdoor_events", key: "activity.outdoor_events", label: "Outdoor Events", icon: Calendar },
];

function getSafetyBadge(level: ActivitySafetyLevel, score: number) {
  switch (level) {
    case "optimal":
      return {
        label: `${score}/100 • Optimal`,
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        dotColor: "bg-emerald-400",
      };
    case "acceptable":
      return {
        label: `${score}/100 • Acceptable`,
        badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        dotColor: "bg-sky-400",
      };
    case "caution":
      return {
        label: `${score}/100 • Caution`,
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        dotColor: "bg-amber-400",
      };
    case "unsafe":
    default:
      return {
        label: `${score}/100 • Unsafe`,
        badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
        dotColor: "bg-red-400",
      };
  }
}

export function ActivitySuitabilityCard({ location }: ActivitySuitabilityCardProps) {
  const { t } = useLanguage();
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>("running_cycling");
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: report, isLoading, error } = useActivity({
    latitude: location?.latitude,
    longitude: location?.longitude,
    activity: selectedActivity,
    timezone: location?.timezone,
    enabled: !!location?.latitude && !!location?.longitude,
  });

  if (!location) return null;

  if (isLoading) {
    return <div className="wg-skeleton h-72 w-full" />;
  }

  if (error || !report) {
    return (
      <div className="wg-card flex flex-col justify-center items-center min-h-[160px] p-6 text-center">
        <Compass size={22} className="text-[var(--text-tertiary)] mb-2 opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">Activity Intelligence Unavailable</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Unable to compute activity suitability for this location.
        </p>
      </div>
    );
  }

  const currentEvaluation = report.activities[selectedActivity];
  if (!currentEvaluation) return null;

  const badge = getSafetyBadge(currentEvaluation.overallSafetyLevel, currentEvaluation.overallScore);

  return (
    <div className="wg-card flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-[var(--text-accent)]" />
          <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            {t("activity.title", "Activity Decision Intelligence")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITIES.map((act) => {
          const Icon = act.icon;
          const isActive = selectedActivity === act.id;
          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
              }`}
            >
              <Icon size={14} />
              {t(act.key, act.label)}
            </button>
          );
        })}
      </div>

      {/* Recommendation and Window Highlights */}
      <div className="bg-[var(--bg-glass)] rounded-xl p-4 flex flex-col gap-3 border border-[var(--border-subtle)]">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
            {currentEvaluation.recommendation}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {currentEvaluation.evidenceSummary}
          </p>
        </div>

        {/* Windows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {currentEvaluation.bestWindow && (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
              <Clock size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  {t("activity.recommended_window", "Recommended Time Window")}
                </span>
                <span className="text-xs font-semibold text-emerald-200">
                  {currentEvaluation.bestWindow.startHour} - {currentEvaluation.bestWindow.endHour}
                  <span className="font-normal opacity-80 text-[11px] ml-1.5">
                    (Score: {currentEvaluation.bestWindow.averageScore}/100)
                  </span>
                </span>
              </div>
            </div>
          )}

          {currentEvaluation.worstWindow && (
            <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Most Challenging Window
                </span>
                <span className="text-xs font-semibold text-amber-200">
                  {currentEvaluation.worstWindow.startHour} - {currentEvaluation.worstWindow.endHour}
                  <span className="font-normal opacity-80 text-[11px] ml-1.5">
                    (Score: {currentEvaluation.worstWindow.averageScore}/100)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Limiting Factors Tags */}
        {currentEvaluation.limitingFactors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">Constraints:</span>
            {currentEvaluation.limitingFactors.map((factor) => (
              <span
                key={factor.code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-300 border border-red-500/20"
              >
                {factor.description}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 24-Hour Suitability Strip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] px-1">
          <span>24-Hour Suitability Timeline</span>
          <span>Target Date: {report.targetDate}</span>
        </div>
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 p-2 bg-[var(--bg-glass)] rounded-xl border border-[var(--border-subtle)]">
          {currentEvaluation.hourlyWindows.map((hour) => {
            let color = "bg-emerald-500";
            if (hour.safetyLevel === "acceptable") color = "bg-sky-500";
            else if (hour.safetyLevel === "caution") color = "bg-amber-500";
            else if (hour.safetyLevel === "unsafe") color = "bg-red-500";

            return (
              <div
                key={hour.time}
                className="flex flex-col items-center gap-1 group relative cursor-pointer"
                title={`${String(hour.hour).padStart(2, "0")}:00 - ${hour.score}/100 (${hour.safetyLevel})\n${hour.metrics.temperature}°C, Rain: ${hour.metrics.precipitation}mm, Wind: ${hour.metrics.windSpeed}km/h`}
              >
                <div className="w-full h-8 rounded bg-[var(--bg-card)] flex items-end overflow-hidden">
                  <div
                    className={`w-full ${color} transition-all opacity-80 group-hover:opacity-100`}
                    style={{ height: `${Math.max(15, hour.score)}%` }}
                  />
                </div>
                <span className="text-[9px] text-[var(--text-tertiary)]">
                  {hour.hour % 3 === 0 ? `${hour.hour}h` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible Hourly Details */}
      <div className="pt-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <span>{isExpanded ? "Hide detailed hourly log" : "View detailed hourly breakdown"}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="mt-2 max-h-56 overflow-y-auto border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)] bg-[var(--bg-glass)]">
            {currentEvaluation.hourlyWindows.map((h) => (
              <div key={h.time} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[var(--text-primary)] w-10">
                    {String(h.hour).padStart(2, "0")}:00
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      h.safetyLevel === "optimal"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : h.safetyLevel === "acceptable"
                        ? "text-sky-400 bg-sky-500/10"
                        : h.safetyLevel === "caution"
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-red-400 bg-red-500/10"
                    }`}
                  >
                    {h.safetyLevel}
                  </span>
                  <span className="text-[var(--text-secondary)] hidden sm:inline">
                    {h.advisory}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <span>{h.metrics.temperature}°C</span>
                  {h.metrics.precipitation > 0 && (
                    <span className="text-sky-400 font-medium">
                      {h.metrics.precipitation}mm
                    </span>
                  )}
                  <span className="font-semibold text-[var(--text-primary)] w-8 text-right">
                    {h.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
