"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { triggerHaptic } from "@/lib/motion/haptics";

export type NotificationSeverity = "extreme" | "high" | "moderate" | "low" | "info";

export interface EmergencyNotificationItem {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  category?: string;
  eventId?: string;
  url?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationContextValue {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  notifications: EmergencyNotificationItem[];
  unreadCount: number;
  activeToast: EmergencyNotificationItem | null;
  dismissToast: () => void;
  requestPermission: () => Promise<boolean>;
  sendEmergencyNotification: (params: {
    title: string;
    body: string;
    severity?: NotificationSeverity;
    category?: string;
    eventId?: string;
    url?: string;
  }) => Promise<boolean>;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  testEmergencyNotification: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "weathergpt_notifications_history";
const NOTIFIED_EVENTS_KEY = "weathergpt_notified_event_ids";

/**
 * Synthesizes an emergency warning chime using Web Audio API.
 * High-pitched two-tone acoustic alert (880Hz -> 1046Hz) for disaster bulletins.
 */
function playEmergencyChime(isEmergency = true) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = isEmergency ? "triangle" : "sine";
    osc1.frequency.setValueAtTime(isEmergency ? 880 : 587, now);
    osc1.frequency.exponentialRampToValueAtTime(isEmergency ? 1046 : 880, now + 0.15);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(isEmergency ? 0.35 : 0.2, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch (err) {
    // Audio context may be restricted by autoplay policy until user gesture
    console.debug("[AudioChime] Silent audio playback ignored:", err);
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState<EmergencyNotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<EmergencyNotificationItem | null>(null);

  // Initialize permission and history from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "Notification" in window;
      setIsSupported(supported);
      if (supported) {
        setPermission(Notification.permission);
      } else {
        setPermission("unsupported");
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setNotifications(parsed.slice(0, 30));
          }
        }
      } catch (err) {
        console.warn("[NotificationContext] Failed to load cached notifications", err);
      }
    }
  }, []);

  // Save history to localStorage
  const persistNotifications = useCallback((items: EmergencyNotificationItem[]) => {
    setNotifications(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
    } catch {
      // Ignore storage quota
    }
  }, []);

  // Request browser push notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      triggerHaptic("medium");

      if (res === "granted") {
        playEmergencyChime(false);
        // Dispatch welcome confirmation notification
        try {
          new Notification("WeatherGPT 2.0 Alerts Enabled", {
            body: "Emergency weather and disaster intelligence notifications are now active.",
            icon: "/icon-192.png",
            badge: "/favicon-32x32.png",
          });
        } catch {
          // Ignore
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("[NotificationContext] Permission request error:", err);
      return false;
    }
  }, []);

  // Dispatch an emergency notification
  const sendEmergencyNotification = useCallback(
    async ({
      title,
      body,
      severity = "high",
      category,
      eventId,
      url,
    }: {
      title: string;
      body: string;
      severity?: NotificationSeverity;
      category?: string;
      eventId?: string;
      url?: string;
    }): Promise<boolean> => {
      const isEmergency = severity === "extreme" || severity === "high";

      // 1. Play audio alert chime & haptics
      playEmergencyChime(isEmergency);
      if (isEmergency) triggerHaptic("heavy");

      // 2. Create notification record
      const item: EmergencyNotificationItem = {
        id: eventId || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        body,
        severity,
        category,
        eventId,
        url: url || (eventId ? `/intelligence` : undefined),
        timestamp: new Date().toISOString(),
        read: false,
      };

      // 3. Update in-app state & toast
      setNotifications((prev) => {
        // Prevent duplicate entries by id
        const filtered = prev.filter((p) => p.id !== item.id);
        const updated = [item, ...filtered].slice(0, 30);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });

      setActiveToast(item);

      // 4. Send HTML5 System Push Notification if permission granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification(title, {
            body,
            icon: "/icon-192.png",
            badge: "/favicon-32x32.png",
            tag: item.id,
            requireInteraction: isEmergency,
          });

          n.onclick = () => {
            window.focus();
            if (item.url) {
              window.location.href = item.url;
            }
            n.close();
          };
          return true;
        } catch (err) {
          console.warn("[NotificationContext] Browser notification display error:", err);
        }
      }

      return true;
    },
    []
  );

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persistNotifications(updated);
        return updated;
      });
    },
    [persistNotifications]
  );

  const clearAll = useCallback(() => {
    persistNotifications([]);
  }, [persistNotifications]);

  // Test emergency notification for user verification
  const testEmergencyNotification = useCallback(async (): Promise<boolean> => {
    // If not granted, prompt first
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const granted = await requestPermission();
      if (!granted) {
        // Still dispatch in-app alert
      }
    }

    return sendEmergencyNotification({
      title: "🚨 WeatherGPT Emergency Alert: Severe Cyclone Warning",
      body: "High-intensity meteorological disturbance detected. Sustained wind speeds exceeding 120 km/h with heavy precipitation advisories active.",
      severity: "extreme",
      category: "cyclone",
      url: "/intelligence",
    });
  }, [requestPermission, sendEmergencyNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        permission,
        isSupported,
        notifications,
        unreadCount,
        activeToast,
        dismissToast,
        requestPermission,
        sendEmergencyNotification,
        markAllAsRead,
        markAsRead,
        clearAll,
        testEmergencyNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
