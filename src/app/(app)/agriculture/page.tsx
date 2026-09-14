"use client";

import { useLocation } from "@/context/location-context";
import { useLanguage } from "@/context/language-context";
import { AgricultureCard } from "@/components/agriculture/agriculture-card";
import { Sprout, AlertCircle, ShieldCheck } from "lucide-react";

export default function AgriculturePage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center wg-animate-in">
          <Sprout size={32} className="mx-auto mb-3 text-emerald-400 opacity-80" />
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("agri.title", "Agricultural Weather Intelligence")}
          </h2>
          <p style={{ color: "var(--text-tertiary)" }}>
            {t("welcome.subtitle", "Search for a rural or urban location to view agronomic advisories and crop risk.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sprout size={22} className="text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {t("agri.title", "Agricultural Weather Intelligence")}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          ICAR-aligned agronomic advisories, crop water balance, spraying windows, and pest-risk alerts for {selectedLocation.displayName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AgricultureCard location={selectedLocation} />
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck size={16} />
              ICAR Agronomic Protocol
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Advisories are calibrated against Indian Council of Agricultural Research guidelines, accounting for phenological growth stages, localized relative humidity, and 48-hour precipitation thresholds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <AlertCircle size={16} />
              Precipitation &amp; Spray Notice
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Avoid chemical spraying if sustained wind speed exceeds 15 km/h or rain probability is greater than 40% within the next 4 hours to prevent runoff and foliar burn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
