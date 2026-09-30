"use client";

import { useState, useEffect } from "react";
import { useNotification } from "@/context/notification-context";
import { useLocation } from "@/context/location-context";
import {
  Bell,
  Clock,
  Droplets,
  CloudRain,
  Sun,
  ShieldAlert,
  Car,
  Check,
  Sparkles,
  X,
  Volume2,
} from "lucide-react";

interface CommuteAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommuteAlertModal({ isOpen, onClose }: CommuteAlertModalProps) {
  const { sendEmergencyNotification, requestPermission, permission } = useNotification();
  const { selectedLocation } = useLocation();

  const [morningTime, setMorningTime] = useState("08:30");
  const [eveningTime, setEveningTime] = useState("18:00");
  const [notifyRain, setNotifyRain] = useState(true);
  const [notifyFog, setNotifyFog] = useState(true);
  const [notifyUV, setNotifyUV] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("weathergpt_commute_settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.morningTime) setMorningTime(parsed.morningTime);
          if (parsed.eveningTime) setEveningTime(parsed.eveningTime);
          if (parsed.notifyRain !== undefined) setNotifyRain(parsed.notifyRain);
          if (parsed.notifyFog !== undefined) setNotifyFog(parsed.notifyFog);
          if (parsed.notifyUV !== undefined) setNotifyUV(parsed.notifyUV);
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "weathergpt_commute_settings",
        JSON.stringify({
          morningTime,
          eveningTime,
          notifyRain,
          notifyFog,
          notifyUV,
        })
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    await requestPermission();

    const cityName = selectedLocation?.name || "Your City";

    await sendEmergencyNotification({
      title: `🚗 Commute Forecast: ${cityName}`,
      body: `Morning transit update: Clear commute corridor expected. Precipitation probability is low (15%). Have a safe drive!`,
      severity: "low",
      category: "commute",
    });

    setTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md wg-animate-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-2xl p-6 overflow-hidden flex flex-col gap-5 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.15)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Car size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Smart Commute Alert Engine</h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Automated rain &amp; transit alerts before you leave
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Schedule Inputs */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Daily Commute Schedule
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
                <Clock size={13} className="text-cyan-400" />
                <span>Morning Transit</span>
              </label>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent text-[var(--text-primary)] focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
                <Clock size={13} className="text-amber-400" />
                <span>Evening Return</span>
              </label>
              <input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Trigger Toggles */}
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider pt-1">
            Proactive Warning Triggers
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] cursor-pointer hover:border-cyan-500/40 transition">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <CloudRain size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-[var(--text-primary)]">
                    Rain &amp; Hydroplaning Warning
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Trigger when precipitation probability &gt; 40%
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyRain}
                onChange={(e) => setNotifyRain(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] cursor-pointer hover:border-cyan-500/40 transition">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-[var(--text-primary)]">
                    Dense Fog &amp; Smog Visibility
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Trigger when highway visibility drops below 2.5 km
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyFog}
                onChange={(e) => setNotifyFog(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] cursor-pointer hover:border-cyan-500/40 transition">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
                  <Sun size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-[var(--text-primary)]">
                    Extreme UV / Heat Advisory
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Alert when UV index &gt; 7 or heat index &gt; 38°C
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyUV}
                onChange={(e) => setNotifyUV(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={testing}
            className="wg-btn-ghost text-xs flex items-center gap-1.5 py-2 px-3 text-[var(--text-secondary)]"
          >
            <Volume2 size={14} className="text-cyan-400" />
            <span>Test Chime &amp; Alert</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-xs bg-cyan-500 hover:bg-cyan-400 text-black transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            {isSaved ? (
              <>
                <Check size={14} />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <span>Save Schedule</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
