"use client";

import { LiveEventCard } from "@/components/events/live-event-card";
import { EventList } from "@/components/events/event-list";
import { useLanguage } from "@/context/language-context";
import { useNotification } from "@/context/notification-context";
import { Bell, ShieldCheck, Volume2, Sparkles } from "lucide-react";

export default function IntelligencePage() {
  const { t } = useLanguage();
  const { permission, requestPermission, testEmergencyNotification } = useNotification();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {t("intel.title", "Live Disaster Intelligence")}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("intel.subtitle", "Real-time global hazard tracking, GDACS disaster alerts, and cross-border meteorological event monitoring.")}
          </p>
        </div>

        {/* Emergency Push Alert Status / Action Chip */}
        <div className="shrink-0">
          {permission === "granted" ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400">
              <ShieldCheck size={15} />
              <span className="font-medium">{t("intel.push_active", "Emergency Push Active")}</span>
              <button
                onClick={() => testEmergencyNotification()}
                className="ml-1 text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                <Volume2 size={11} />
                <span>Test</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => requestPermission()}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-xs font-semibold text-cyan-300 hover:brightness-125 transition-all shadow-sm group"
            >
              <Bell size={14} className="group-hover:animate-bounce" />
              <span>{t("intel.enable_push", "Enable Emergency Alerts")}</span>
            </button>
          )}
        </div>
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
