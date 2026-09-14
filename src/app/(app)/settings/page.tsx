"use client";

import { Settings, Cpu, CloudRain, Radio, Sprout, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export default function SettingsPage() {
  const { t } = useLanguage();

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
