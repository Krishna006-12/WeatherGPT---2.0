"use client";

import { LiveEventCard } from "@/components/events/live-event-card";
import { EventList } from "@/components/events/event-list";
import { useLanguage } from "@/context/language-context";

export default function IntelligencePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
          {t("intel.title", "Live Disaster Intelligence")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("intel.subtitle", "Real-time global hazard tracking, GDACS disaster alerts, and cross-border meteorological event monitoring.")}
        </p>
      </div>

      {/* Featured Active Event Alert */}
      <LiveEventCard />

      {/* Full Categorized Events Feed */}
      <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] shadow-sm">
        <EventList />
      </div>
    </div>
  );
}
