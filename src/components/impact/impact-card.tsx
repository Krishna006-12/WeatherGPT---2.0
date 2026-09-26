import { useImpact } from "@/hooks/use-impact";
import { useEvents } from "@/hooks/use-events";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { NormalizedLocation } from "@/services/location/location-service";
import { useLanguage } from "@/context/language-context";

export function ImpactCard({ location }: { location?: NormalizedLocation | null }) {
  const { t } = useLanguage();
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ limit: 1 });
  const event = eventsData?.events[0];

  const { data: impact, isLoading: impactLoading } = useImpact({
    eventId: event?.id,
    lat: location?.latitude,
    lon: location?.longitude,
    city: location?.displayName.split(",")[0],
    country: location?.country,
  });

  if (eventsLoading || (event && impactLoading)) return <div className="wg-skeleton h-56 w-full" />;
  if (!location) return null;

  if (!event) {
    return (
      <div className="wg-surface-decision flex flex-col justify-center items-center min-h-[180px] p-6 text-center">
        <ShieldCheck size={24} className="text-[var(--text-tertiary)] mb-2 opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">{t("impact.no_active", "No active events")}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {t("impact.clear_assessment", "Regional impact assessment is clear.")}
        </p>
      </div>
    );
  }

  const isConfirmed = impact?.relevanceStatus === "confirmed";
  const isElevated = impact?.relevanceStatus === "likely" || impact?.relevanceStatus === "possible";

  const relevanceStyles = isConfirmed
    ? { color: "var(--status-danger)", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.35)" }
    : isElevated
    ? { color: "var(--status-warning)", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)" }
    : { color: "var(--text-secondary)", bg: "var(--surface-3)", border: "var(--border-subtle)" };

  return (
    <section
      aria-label="Regional Impact Assessment"
      className="wg-surface-decision flex flex-col justify-between h-full p-5 sm:p-6 wg-animate-in wg-stagger-3"
    >
      <div>
        {/* Header: Title + Grounded indicator */}
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <ShieldAlert
              size={16}
              style={{
                color: relevanceStyles.color !== "var(--text-secondary)" ? relevanceStyles.color : "var(--text-secondary)",
              }}
            />
            <h3 className="text-xs uppercase font-bold tracking-wider text-[var(--text-primary)]">
              {t("impact.location_impact", "Location Impact")}
            </h3>
          </div>

          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 size={11} strokeWidth={2.5} /> {t("impact.grounded", "Grounded")}
          </span>
        </div>

        {/* Tactical Location Posture Decision Box */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] mb-3">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              {location.displayName.split(",")[0]}
            </span>
            <span
              className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: relevanceStyles.bg,
                color: relevanceStyles.color,
                border: `1px solid ${relevanceStyles.border}`,
              }}
            >
              {impact ? impact.relevanceStatus : "Monitoring"}
            </span>
          </div>

          {/* 3-Segment Visual Risk Posture Bar */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div
              className={`h-2 rounded-full transition-all duration-200 ${
                !isConfirmed && !isElevated ? "bg-emerald-400 shadow-sm shadow-emerald-950" : "bg-[var(--surface-3)]"
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all duration-200 ${
                isElevated ? "bg-amber-400 shadow-sm shadow-amber-950" : "bg-[var(--surface-3)]"
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all duration-200 ${
                isConfirmed ? "bg-red-500 shadow-sm shadow-red-950" : "bg-[var(--surface-3)]"
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pt-1.5">
            <span>{t("impact.normal", "Normal")}</span>
            <span>{t("impact.advisory", "Advisory")}</span>
            <span>{t("impact.warning", "Warning")}</span>
          </div>
        </div>

        {/* Hazard assessment readout */}
        {impact?.actualHazardImpact && (
          <div className="p-3 rounded-xl text-xs leading-relaxed bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mb-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              {t("impact.hazard_assessment", "Hazard Assessment")}
            </div>
            {impact.actualHazardImpact}
          </div>
        )}

        {/* Actionable Advisory callout */}
        {impact?.advisory && (
          <div className="p-3 rounded-xl text-xs leading-relaxed bg-[var(--accent-surface)] border border-[var(--accent-border)] text-[var(--accent)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80 mb-1">
              {t("impact.actionable_advisory", "Actionable Advisory")}
            </div>
            {impact.advisory}
          </div>
        )}
      </div>
    </section>
  );
}
