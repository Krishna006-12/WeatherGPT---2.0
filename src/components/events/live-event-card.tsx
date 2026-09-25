import { useEvents } from "@/hooks/use-events";
import type { WeatherEvent } from "@/types/events";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import { Activity, ShieldCheck, MapPin } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export function getEventIndiaRelevance(event: WeatherEvent): { label: string; badgeClass: string } {
  const assessment = globalImpactEngine.assessIndiaImpact(event);
  switch (assessment.level) {
    case "DIRECT": {
      const isHigh = event.severity === "extreme" || event.severity === "high" || event.severity === "critical";
      return {
        label: isHigh ? "High" : "Direct",
        badgeClass: "bg-red-500/15 text-red-300 border border-red-500/30",
      };
    }
    case "REGIONAL":
    case "POSSIBLE":
      return {
        label: "Monitoring",
        badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      };
    case "LOW":
    case "NONE":
      return {
        label: "Low (Distant)",
        badgeClass: "bg-white/5 text-neutral-400 border border-white/10",
      };
    case "INSUFFICIENT_EVIDENCE":
    default:
      return {
        label: "Unknown",
        badgeClass: "bg-white/5 text-neutral-500 border border-white/10",
      };
  }
}

export function LiveEventCard() {
  const { data, isLoading, isError } = useEvents({ limit: 1 });
  const { t } = useLanguage();

  if (isLoading) return <div className="wg-skeleton h-56 w-full" />;
  if (isError || !data || data.events.length === 0) {
    return (
      <div className="wg-surface-intelligence flex flex-col justify-center items-center min-h-[180px] p-6 text-center">
        <Activity size={22} className="text-[var(--text-tertiary)] mb-2 opacity-50" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">{t("events.no_active", "No active live events")}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {t("events.monitoring_subcontinent", "Global meteorological monitoring active. Subcontinent clear.")}
        </p>
      </div>
    );
  }

  const event = data.events[0];
  if (!event) return null;

  const locationText = event.locations && event.locations[0] ? `${event.locations[0].name}` : t("events.multiple_regions", "Multiple regions");
  const indiaRelevance = getEventIndiaRelevance(event);
  const isHighSeverity = event.severity === "extreme" || event.severity === "high" || event.severity === "critical";

  return (
    <section
      aria-label="Live Weather Disaster Intelligence"
      className={`wg-surface-intelligence flex flex-col justify-between h-full p-5 sm:p-6 wg-animate-in wg-stagger-2 transition-all duration-200 ${
        isHighSeverity
          ? "border-red-500/30 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.12),transparent_70%)]"
          : ""
      }`}
    >
      <div>
        {/* Header: Intelligence Beacon & Severity Posture */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isHighSeverity && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isHighSeverity ? "bg-red-500" : "bg-amber-400"
                }`}
              />
            </span>
            <h3
              className="text-xs uppercase font-bold tracking-wider"
              style={{ color: isHighSeverity ? "var(--status-danger)" : "var(--text-primary)" }}
            >
              {t("intel.bulletin", "Live Intelligence Bulletin")}
            </h3>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isHighSeverity
                ? "bg-red-500/20 text-red-500 dark:text-red-300 border border-red-500/35 shadow-sm"
                : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            }`}
          >
            {event.severity}
          </span>
        </div>

        {/* 1. WHAT IS HAPPENING: Readable Headline & Scope */}
        <div className="mb-3.5">
          <span className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1">
            {t("intel.hazard_condition", "Hazard Condition")}
          </span>
          <h4 className="text-base sm:text-lg font-semibold leading-snug text-[var(--text-primary)]">
            {event.title}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-1.5">
            <MapPin size={13} className="text-[var(--text-tertiary)] shrink-0" />
            <span className="font-medium">{locationText}</span>
          </div>
        </div>

        {/* 2. EVIDENCE: Verified Agency / Sensor Sources */}
        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-secondary)] font-medium">
              {event.sources ? event.sources.length : 0}{" "}
              {(event.sources ? event.sources.length : 0) === 1
                ? t("intel.verified_source", "Verified Agency Source")
                : t("intel.verified_sources", "Verified Agency Sources")}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            ID: {event.id ? event.id.slice(0, 8) : "ACT-01"}
          </span>
        </div>
      </div>

      {/* 3. WHY IT MATTERS: India Regional Impact Relevance */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
            {t("intel.subcontinent", "Subcontinent Assessment")}
          </span>
          <span className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
            {t("intel.threat_rating", "Regional Threat Rating")}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-tertiary)] hidden sm:inline">
            {t("intel.relevance", "Relevance")}:
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${indiaRelevance.badgeClass}`}
          >
            {indiaRelevance.label}
          </span>
        </div>
      </div>
    </section>
  );
}
