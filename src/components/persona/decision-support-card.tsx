"use client";

import { useState, useMemo } from "react";
import { useWeather } from "@/hooks/use-weather";
import { useLanguage } from "@/context/language-context";
import type { NormalizedLocation } from "@/services/location/location-service";
import type { PersonaId } from "@/types/persona";
import type { DecisionItem, DecisionItemStatus } from "@/types/decision-support";
import { globalDecisionSupportService } from "@/services/decision/decision-support-service";
import {
  ShieldAlert,
  Sprout,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";

interface DecisionSupportCardProps {
  location?: NormalizedLocation | null;
  initialPersona?: PersonaId;
}

export function DecisionSupportCard({
  location,
  initialPersona = "general_public",
}: DecisionSupportCardProps) {
  const { t } = useLanguage();
  const [activePersona, setActivePersona] = useState<PersonaId>(initialPersona);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [completedItemIds, setCompletedItemIds] = useState<Record<string, DecisionItemStatus>>({});

  const { data: weather, isLoading } = useWeather({
    latitude: location?.latitude,
    longitude: location?.longitude,
    timezone: location?.timezone,
    enabled: location !== null && location !== undefined,
  });

  const decisionPlan = useMemo(() => {
    if (!weather) return null;
    return globalDecisionSupportService.generateDecisionSupport(weather, {
      personaId: activePersona,
    });
  }, [weather, activePersona]);

  const toggleItemStatus = (itemId: string, currentStatus: DecisionItemStatus) => {
    setCompletedItemIds((prev) => {
      const nextStatus: DecisionItemStatus =
        (prev[itemId] || currentStatus) === "completed" ? "pending" : "completed";
      return { ...prev, [itemId]: nextStatus };
    });
  };

  const toggleTrace = (itemId: string) => {
    setExpandedTraceId((prev) => (prev === itemId ? null : itemId));
  };

  if (isLoading || !weather || !decisionPlan) {
    return (
      <div className="wg-skeleton w-full min-h-[280px] rounded-3xl" aria-busy="true" aria-label="Loading decision support" />
    );
  }

  const getPriorityStyle = (priority: DecisionItem["priority"]) => {
    switch (priority) {
      case "urgent":
        return {
          badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
          border: "border-red-500/30 dark:border-red-500/20",
        };
      case "high":
        return {
          badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
          border: "border-amber-500/30 dark:border-amber-500/20",
        };
      case "moderate":
        return {
          badge: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30",
          border: "border-sky-500/30 dark:border-sky-500/20",
        };
      case "routine":
      default:
        return {
          badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
          border: "border-emerald-500/30 dark:border-emerald-500/20",
        };
    }
  };

  const getOverallStatusBanner = () => {
    switch (decisionPlan.overallStatus) {
      case "emergency":
        return {
          icon: <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={18} />,
          title: "Emergency Coordination Active",
          bg: "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200",
        };
      case "action_required":
        return {
          icon: <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />,
          title: "Priority Actions Recommended",
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
        };
      case "caution":
        return {
          icon: <Info className="text-sky-600 dark:text-sky-400 shrink-0" size={18} />,
          title: "Advisory Watch Active",
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200",
        };
      case "normal":
      default:
        return {
          icon: <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />,
          title: "Standard Operational Readiness",
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
        };
    }
  };

  const banner = getOverallStatusBanner();

  return (
    <section
      aria-labelledby="decision-support-heading"
      className="wg-surface-command relative overflow-hidden p-5 sm:p-6 rounded-[28px] border border-[var(--border-subtle)] space-y-5"
    >
      {/* Header with Title & Persona Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent-border)]">
            <Layers size={17} />
          </div>
          <div>
            <h3
              id="decision-support-heading"
              className="text-base font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2"
            >
              <span>{t("decision.title", "Role-Based Decision Support")}</span>
              <span className="text-[11px] font-medium text-[var(--text-tertiary)] hidden sm:inline">
                • Traceable Evidence Engine
              </span>
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Actionable operational guidance for {location?.name || weather.location.name}
            </p>
          </div>
        </div>

        {/* Persona Tabs with Keyboard Navigation */}
        <div
          role="tablist"
          aria-label="Target Decision Persona"
          className="inline-flex p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold"
        >
          <button
            role="tab"
            aria-selected={activePersona === "general_public"}
            aria-controls="decision-panel"
            id="tab-general-public"
            onClick={() => setActivePersona("general_public")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activePersona === "general_public"
                ? "bg-[var(--accent-surface)] text-[var(--accent)] shadow-xs border border-[var(--accent-border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Users size={13} />
            <span>General</span>
          </button>

          <button
            role="tab"
            aria-selected={activePersona === "farmer"}
            aria-controls="decision-panel"
            id="tab-farmer"
            onClick={() => setActivePersona("farmer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activePersona === "farmer"
                ? "bg-[var(--accent-surface)] text-[var(--accent)] shadow-xs border border-[var(--accent-border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sprout size={13} />
            <span>Farmer</span>
          </button>

          <button
            role="tab"
            aria-selected={activePersona === "disaster_manager"}
            aria-controls="decision-panel"
            id="tab-disaster-manager"
            onClick={() => setActivePersona("disaster_manager")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activePersona === "disaster_manager"
                ? "bg-[var(--accent-surface)] text-[var(--accent)] shadow-xs border border-[var(--accent-border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldAlert size={13} />
            <span>Disaster Command</span>
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-between p-3.5 rounded-2xl border ${banner.bg} text-xs font-medium`}
      >
        <div className="flex items-center gap-2.5">
          {banner.icon}
          <div>
            <span className="font-bold">{banner.title}:</span>{" "}
            <span>{decisionPlan.summary}</span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 shrink-0 hidden md:inline">
          Persona: {decisionPlan.personaName}
        </span>
      </div>

      {/* Checklist of Transparent Recommendations */}
      <div
        id="decision-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activePersona.replace("_", "-")}`}
        className="space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Evidence-Based Action Checklist
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {decisionPlan.items.filter((i) => (completedItemIds[i.id] || i.status) === "completed").length} / {decisionPlan.items.length} completed
          </span>
        </div>

        <ul role="list" aria-label="Action items" className="space-y-2.5">
          {decisionPlan.items.map((item) => {
            const isCompleted = (completedItemIds[item.id] || item.status) === "completed";
            const styles = getPriorityStyle(item.priority);
            const isTraceExpanded = expandedTraceId === item.id;

            return (
              <li
                key={item.id}
                role="listitem"
                className={`p-4 rounded-2xl bg-[var(--surface-2)] border ${styles.border} transition-all duration-150 flex flex-col gap-2.5`}
              >
                {/* Top Row: Checkbox, Title, and Priority Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isCompleted}
                      aria-label={`Mark as ${isCompleted ? "pending" : "completed"}: ${item.title}`}
                      onClick={() => toggleItemStatus(item.id, item.status)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggleItemStatus(item.id, item.status);
                        }
                      }}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer ${
                        isCompleted
                          ? "bg-[var(--accent)] border-[var(--accent)] text-black"
                          : "border-[var(--border-default)] hover:border-[var(--accent)] bg-black/20"
                      }`}
                    >
                      {isCompleted && <CheckCircle2 size={14} className="stroke-[3]" />}
                    </button>

                    <div>
                      <h4
                        className={`text-sm font-semibold transition-colors ${
                          isCompleted
                            ? "line-through text-[var(--text-tertiary)]"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {item.actionText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles.badge}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Timeframe & Traceability Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="shrink-0" />
                    <span>{item.recommendedTimeframe}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleTrace(item.id)}
                    aria-expanded={isTraceExpanded}
                    aria-label={`View source evidence for ${item.title}`}
                    className="wg-btn-ghost text-xs py-0.5 px-2 text-[var(--accent)] hover:bg-[var(--accent-surface)] rounded-lg transition-colors flex items-center gap-1 font-medium"
                  >
                    <span>Evidence</span>
                    {isTraceExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Expandable Traceability Drawer */}
                {isTraceExpanded && (
                  <div
                    className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5 text-xs text-[var(--text-secondary)] animate-in fade-in duration-200"
                    aria-label="Evidence traceability details"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-[var(--text-tertiary)] uppercase text-[9px] block">
                          Observed Meteorological Telemetry:
                        </span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {item.traceability.metricName}: {item.traceability.observedValue}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-[var(--text-tertiary)] uppercase text-[9px] block">
                          Deterministic Trigger Threshold:
                        </span>
                        <span className="font-mono text-amber-500 dark:text-amber-400">
                          {item.traceability.thresholdValue}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] pt-1 border-t border-white/5">
                      <span className="font-semibold text-[var(--text-tertiary)]">Source Evidence: </span>
                      <span className="text-[var(--text-primary)]">{item.traceability.sourceReference}</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
