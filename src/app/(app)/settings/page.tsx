"use client";

import { Settings, Cpu, CloudRain, Radio, Sprout, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2.5">
          <Settings className="text-cyan-400" size={24} />
          System Settings
        </h1>
        <p className="text-sm text-neutral-400">
          Configure runtime parameters, AI intelligence engine defaults, and meteorological data providers.
        </p>
      </div>

      <div className="space-y-4">
        {/* AI Model Configuration */}
        <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-white">
              <Cpu className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">AI Intelligence Model</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={12} /> Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Current Model
              </div>
              <div className="text-lg font-bold text-white">Gemini 3.6 Flash</div>
              <p className="text-xs text-neutral-400">
                Optimized for low-latency meteorological reasoning, real-time grounded tool execution, and GDACS disaster impact analysis.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Grounding Protocol
              </div>
              <div className="text-sm font-semibold text-emerald-400">Strict Verifiable Grounding</div>
              <p className="text-xs text-neutral-400">
                Responses must cite authoritative data points or explicitly report insufficient evidence when confidence drops.
              </p>
            </div>
          </div>
        </div>

        {/* Data Providers */}
        <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-white">
              <CloudRain className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">Meteorological &amp; Disaster Providers</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">Open-Meteo API</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                  Connected
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Global WMO-standard numerical weather prediction with hourly resolution and solar tracking.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">GDACS &amp; RSS Feeds</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Multi-source emergency hazard alerts, flood warnings, cyclone tracks, and seismic data feeds.
              </p>
            </div>
          </div>
        </div>

        {/* Agriculture & Risk Rules */}
        <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-white">
              <Sprout className="text-emerald-400" size={20} />
              <h2 className="font-semibold text-base">Agricultural Risk Engine</h2>
            </div>
            <span className="text-xs text-neutral-400">FAO / ICAR Standard</span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Deterministic agrometeorological evaluation across 5 key crops (Wheat, Rice, Maize, Potato, Mustard). Evaluates precipitation accumulation, humidity thresholds, wind speed restrictions for spraying, and soil trafficability.
          </p>
        </div>

        {/* Units & Preferences */}
        <div className="rounded-3xl bg-[#1C1C1E] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-white">
              <Radio className="text-cyan-400" size={20} />
              <h2 className="font-semibold text-base">Measurement Units</h2>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-semibold">
              Metric (°C, km/h, mm, hPa)
            </button>
            <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-neutral-400 text-xs font-semibold hover:text-white transition-colors">
              Imperial (°F, mph, in, inHg)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
