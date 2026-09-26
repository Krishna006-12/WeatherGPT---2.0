"use client";

import { useLocation } from "@/context/location-context";
import { ImpactCard } from "@/components/impact/impact-card";
import { AgricultureCard } from "@/components/agriculture/agriculture-card";
import { Shield, Sprout } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export default function ImpactPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">
            {t("impact.title", "Regional Risk & Impact")}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Search for a location above to assess regional hazards and agricultural vulnerability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
          {t("impact.title", "Regional Risk & Impact Analysis")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("impact.subtitle", "Evaluated hazard exposure, grounded community impact, and agronomic risk intelligence")} for {selectedLocation.displayName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Disaster & Infrastructure Impact */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm">
            <Shield size={18} className="text-cyan-400" />
            <span>{t("impact.hazard_vuln", "Hazard & Event Vulnerability")}</span>
          </h2>
          <ImpactCard location={selectedLocation} />
        </div>

        {/* Agricultural & Crop Intelligence */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm">
            <Sprout size={18} className="text-emerald-400" />
            <span>{t("impact.agri_vuln", "Agronomic & Agricultural Vulnerability")}</span>
          </h2>
          <AgricultureCard location={selectedLocation} />
        </div>
      </div>
    </div>
  );
}
