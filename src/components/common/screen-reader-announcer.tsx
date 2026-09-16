"use client";

import { useEffect, useState } from "react";
import type { WeatherAlert } from "@/types/weather";

interface ScreenReaderAnnouncerProps {
  alerts?: WeatherAlert[];
  isDegraded?: boolean;
  staleWarning?: string;
}

/**
 * ScreenReaderAnnouncer provides accessible, non-visual aria-live regions
 * that ensure blind or low-vision users utilizing screen readers (NVDA, JAWS, VoiceOver)
 * are immediately alerted to severe weather hazards or degraded offline status.
 */
export function ScreenReaderAnnouncer({
  alerts = [],
  isDegraded = false,
  staleWarning,
}: ScreenReaderAnnouncerProps) {
  const [announcement, setAnnouncement] = useState<string>("");

  useEffect(() => {
    const messages: string[] = [];

    if (isDegraded) {
      messages.push(staleWarning || "Weather data may be stale due to provider unavailability.");
    }

    if (alerts.length > 0) {
      const alertTexts = alerts.map(
        (a) => `${a.severity.toUpperCase()} ALERT: ${a.title}. ${a.description}`
      );
      messages.push(...alertTexts);
    }

    if (messages.length > 0) {
      setAnnouncement(messages.join(" "));
    } else {
      setAnnouncement("");
    }
  }, [alerts, isDegraded, staleWarning]);

  if (!announcement) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only pointer-events-none"
    >
      {announcement}
    </div>
  );
}
