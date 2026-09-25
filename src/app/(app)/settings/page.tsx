"use client";

import { Settings, Cpu, CloudRain, Radio, Sprout, CheckCircle2, User, Phone, Mail, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useNotification } from "@/context/notification-context";
import { useAuth } from "@/context/auth-context";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { permission, requestPermission, testEmergencyNotification } = useNotification();
  const { session, isGuest, isFarmer, openAuthModal, signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1 flex items-center gap-2.5">
          <Settings className="text-cyan-400" size={24} />
          {t("settings.title", "System Settings")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("settings.subtitle", "Configure runtime parameters, AI intelligence engine defaults, and meteorological data providers.")}
        </p>
      </div>

      <div className="space-y-4">
        {/* User Account & Identity Card */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <User className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">Account &amp; Meteorological Identity</h2>
            </div>
            <span
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                isGuest
                  ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                  : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              }`}
            >
              <CheckCircle2 size={12} />
              {isGuest
                ? "Guest Session"
                : session.provider === "phone"
                  ? "Phone Verified"
                  : session.provider === "email"
                    ? "Email Verified"
                    : "Google Verified"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                {session.user.image && !isGuest ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : isFarmer ? (
                  <Sprout size={22} />
                ) : (
                  <User size={22} />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>{session.user.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-700/40 text-cyan-300">
                    {isFarmer ? "🌾 Farmer Mode" : "🏙️ Urban Mode"}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {session.user.email || session.user.phone || "Rural Offline / Guest Session"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              {isGuest ? (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthModal("google")}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Mail size={13} />
                    <span>Sign in with Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("phone")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Phone size={13} />
                    <span>Mobile Login</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthModal(session.provider === "phone" ? "phone" : "google")}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-white transition-colors"
                  >
                    Switch Account
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 text-xs font-medium hover:bg-red-950/50 transition-colors flex items-center gap-1.5"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* AI Model Configuration */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <Cpu className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">{t("settings.ai_model", "AI Intelligence Model")}</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 size={12} /> {t("settings.active", "Active")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-2">
              <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("settings.current_model", "Current Model")}
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)]">Gemini 2.5 Flash</div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t("settings.current_model_desc", "Optimized for low-latency meteorological reasoning, real-time grounded tool execution, and GDACS disaster impact analysis.")}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-2">
              <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("settings.grounding_protocol", "Grounding Protocol")}
              </div>
              <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">
                {t("settings.grounding_protocol_val", "Strict Verifiable Grounding")}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t("settings.grounding_protocol_desc", "Responses must cite authoritative data points or explicitly report insufficient evidence when confidence drops.")}
              </p>
            </div>
          </div>
        </div>

        {/* Data Providers */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <CloudRain className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">{t("settings.data_providers", "Meteorological & Disaster Providers")}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-primary)]">Open-Meteo API</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {t("settings.connected", "Connected")}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t("settings.open_meteo_desc", "Global WMO-standard numerical weather prediction with hourly resolution and solar tracking.")}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-primary)]">GDACS &amp; RSS Feeds</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {t("settings.live_sync", "Live Sync")}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t("settings.gdacs_desc", "Multi-source emergency hazard alerts, flood warnings, cyclone tracks, and seismic data feeds.")}
              </p>
            </div>
          </div>
        </div>

        {/* Agriculture & Risk Rules */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <Sprout className="text-emerald-400" size={20} />
              <h2 className="font-semibold text-base">{t("settings.agri_engine", "Agricultural Risk Engine")}</h2>
            </div>
            <span className="text-xs text-[var(--text-tertiary)] font-medium">FAO / ICAR Standard</span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t("settings.agri_engine_desc", "Deterministic agrometeorological evaluation across 5 key crops (Wheat, Rice, Maize, Potato, Mustard). Evaluates precipitation accumulation, humidity thresholds, wind speed restrictions for spraying, and soil trafficability.")}
          </p>
        </div>

        {/* Emergency Push Notifications */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <Radio className="text-red-400" size={20} />
              <h2 className="font-semibold text-base">{t("settings.notifications", "Emergency Push Alerts & Live Broadcasts")}</h2>
            </div>
            {permission === "granted" ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 size={12} /> {t("settings.push_active", "Push Enabled")}
              </span>
            ) : (
              <span className="text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                {permission === "denied" ? t("settings.push_denied", "Blocked") : t("settings.push_inactive", "Permission Needed")}
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t(
              "settings.notifications_desc",
              "Dispatches browser push notifications and acoustic chimes when high-severity disaster events (cyclones, floods, severe storms, earthquakes) are confirmed by GDACS, NOAA, or regional meteorological agencies."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {permission !== "granted" && (
              <button
                onClick={() => requestPermission()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all"
              >
                {t("settings.enable_push_btn", "Enable Push Notifications")}
              </button>
            )}

            <button
              onClick={() => testEmergencyNotification()}
              className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all flex items-center gap-1.5"
            >
              <span>{t("settings.test_push_btn", "Test Emergency Broadcast")}</span>
            </button>
          </div>
        </div>

        {/* Units & Preferences */}
        <div className="rounded-3xl bg-[var(--surface-1)] p-6 border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <Radio className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">{t("settings.units", "Measurement Units")}</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-600 dark:text-cyan-300 text-xs font-semibold shadow-sm">
              {t("settings.metric", "Metric (°C, km/h, mm, hPa)")}
            </button>
            <button className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors">
              {t("settings.imperial", "Imperial (°F, mph, in, inHg)")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
