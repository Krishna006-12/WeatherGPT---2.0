"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Flame,
  CloudRain,
  Wind,
  Activity,
  ExternalLink,
  ShieldCheck,
  Volume2,
  X,
} from "lucide-react";
import { useNotification, type EmergencyNotificationItem } from "@/context/notification-context";
import { useLanguage } from "@/context/language-context";
import { triggerHaptic } from "@/lib/motion/haptics";

function getCategoryIcon(category?: string) {
  switch (category?.toLowerCase()) {
    case "cyclone":
    case "tropical_storm":
      return <Wind size={15} className="text-cyan-400" />;
    case "flood":
    case "flash_flood":
    case "heavy_rain":
      return <CloudRain size={15} className="text-blue-400" />;
    case "wildfire":
    case "heatwave":
      return <Flame size={15} className="text-orange-400" />;
    case "earthquake":
      return <Activity size={15} className="text-purple-400" />;
    default:
      return <AlertTriangle size={15} className="text-amber-400" />;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "extreme":
      return "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse";
    case "high":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    case "moderate":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    default:
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
  }
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    permission,
    isSupported,
    notifications,
    unreadCount,
    requestPermission,
    markAllAsRead,
    markAsRead,
    clearAll,
    testEmergencyNotification,
  } = useNotification();
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Outside Click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    triggerHaptic("light");
    setIsOpen((prev) => !prev);
  };

  const handleEnablePush = async () => {
    await requestPermission();
  };

  const handleTestAlert = async () => {
    triggerHaptic("medium");
    await testEmergencyNotification();
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        aria-label={t("notifications.button", "Emergency & News Notifications")}
        aria-expanded={isOpen}
        className="relative p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-all duration-150"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[var(--surface-base)]" />
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Alerts and Notifications"
          className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          style={{ background: "var(--card-bg, rgba(15, 23, 42, 0.95))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
              <h3 className="font-semibold text-xs tracking-wide uppercase text-[var(--text-primary)]">
                {t("notifications.title", "Live Alerts & News")}
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    title={t("notifications.mark_read", "Mark all as read")}
                    className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors text-xs"
                  >
                    <CheckCheck size={14} />
                  </button>
                  <button
                    onClick={clearAll}
                    title={t("notifications.clear", "Clear all")}
                    className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Browser Push Permission State Banner */}
          <div className="px-4 py-2.5 bg-[var(--surface-2)]/80 border-b border-[var(--border-subtle)] text-xs">
            {permission === "granted" ? (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck size={14} />
                  {t("notifications.push_active", "Emergency Push Active")}
                </span>
                <button
                  onClick={handleTestAlert}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors flex items-center gap-1"
                >
                  <Volume2 size={11} />
                  {t("notifications.test_push", "Test Alert")}
                </button>
              </div>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{t("notifications.push_denied", "Browser push blocked. Enable in site settings.")}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {t("notifications.push_prompt", "Instant Push Alerts")}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {t("notifications.push_sub", "Disaster advisories directly on device")}
                  </span>
                </div>
                <button
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm hover:brightness-110 transition-all shrink-0"
                >
                  {t("notifications.enable", "Enable")}
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-[var(--border-subtle)] max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-tertiary)] space-y-2">
                <ShieldCheck size={28} className="mx-auto text-[var(--text-tertiary)] opacity-40" />
                <p className="font-medium text-[var(--text-secondary)]">
                  {t("notifications.empty", "No active emergency alerts")}
                </p>
                <p className="text-[11px]">
                  {t("notifications.monitoring", "Continuous GDACS & NOAA monitoring active across your region.")}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`p-3 text-xs transition-colors cursor-pointer hover:bg-[var(--surface-2)] flex flex-col gap-1.5 ${
                    !item.read ? "bg-cyan-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                      {getCategoryIcon(item.category)}
                      <span className="line-clamp-1">{item.title}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider shrink-0 ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-1">
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.url && (
                      <Link
                        href={item.url}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                        }}
                        className="text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        {t("notifications.view", "View")}
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Action */}
          <div className="p-2.5 bg-[var(--surface-2)]/60 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
            <Link
              href="/intelligence"
              onClick={() => setIsOpen(false)}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              {t("notifications.live_intel", "Live Disaster Board")}
              <ExternalLink size={11} />
            </Link>

            <button
              onClick={handleTestAlert}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px]"
            >
              {t("notifications.simulate", "Send Test Alert")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
