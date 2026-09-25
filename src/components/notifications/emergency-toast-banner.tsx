"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X, ShieldAlert, ArrowRight } from "lucide-react";
import { useNotification } from "@/context/notification-context";
import { useLanguage } from "@/context/language-context";

export function EmergencyToastBanner() {
  const { activeToast, dismissToast } = useNotification();
  const { t } = useLanguage();

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const isExtreme = activeToast.severity === "extreme";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-16 right-4 sm:right-6 max-w-md w-[calc(100vw-2rem)] z-50 rounded-2xl shadow-2xl border p-4 backdrop-blur-2xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
      style={{
        background: isExtreme
          ? "linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(153, 27, 27, 0.98) 100%)"
          : "linear-gradient(135deg, rgba(234, 88, 12, 0.95) 0%, rgba(194, 65, 12, 0.98) 100%)",
        borderColor: isExtreme ? "rgba(254, 202, 202, 0.4)" : "rgba(254, 215, 170, 0.4)",
        color: "#ffffff",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-white/15 shrink-0 shadow-inner mt-0.5">
          <ShieldAlert size={20} className="text-white animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 text-white">
              {activeToast.severity} Alert
            </span>
            <button
              onClick={dismissToast}
              aria-label="Dismiss alert"
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <h4 className="font-bold text-sm leading-tight text-white line-clamp-2">
            {activeToast.title}
          </h4>

          <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
            {activeToast.body}
          </p>

          {activeToast.url && (
            <div className="pt-1.5 flex items-center justify-between">
              <Link
                href={activeToast.url}
                onClick={dismissToast}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white underline underline-offset-4 hover:text-white/80 transition-opacity"
              >
                <span>{t("notifications.view_advisory", "View Live Advisory")}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
