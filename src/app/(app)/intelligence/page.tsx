"use client";

import { LiveEventCard } from "@/components/events/live-event-card";
import { EventList } from "@/components/events/event-list";

export default function IntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Live Disaster Intelligence
        </h1>
        <p className="text-sm text-neutral-400">
          Real-time global hazard tracking, GDACS disaster alerts, and cross-border meteorological event monitoring.
        </p>
      </div>

      {/* Featured Active Event Alert */}
      <LiveEventCard />

      {/* Full Categorized Events Feed */}
      <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5">
        <EventList />
      </div>
    </div>
  );
}
