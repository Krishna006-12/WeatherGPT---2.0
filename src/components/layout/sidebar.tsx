"use client";

import { useState, useEffect } from "react";
import { Cloud, Grid, Globe, AlertTriangle, History, MessageSquare, Settings, X, Check, Sliders, Shield, Cpu, Gauge } from "lucide-react";

export function Sidebar() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    const sectionIds = ["section-dashboard", "section-weather", "section-impact", "section-forecast", "section-copilot"];
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          const id = visible.target.id;
          if (id === "section-dashboard" || id === "section-weather") {
            setActiveSection(id === "section-weather" ? "weather" : "dashboard");
          } else if (id === "section-impact") {
            setActiveSection("impact");
          } else if (id === "section-forecast") {
            setActiveSection("forecast");
          } else if (id === "section-copilot") {
            setActiveSection("copilot");
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0.1,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (sectionId: string, sectionKey: string) => {
    setActiveSection(sectionKey);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <aside aria-label="Sidebar Navigation" className="w-16 flex flex-col items-center py-6 bg-neutral-950 border-r border-neutral-800 shrink-0 z-30">
        <button
          onClick={() => scrollTo("section-dashboard", "dashboard")}
          aria-label="WeatherGPT Home"
          title="WeatherGPT Home"
          className="mb-8 text-cyan-400 hover:text-cyan-300 transition-colors p-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <Cloud size={28} />
        </button>

        <nav aria-label="Main Sections" className="flex flex-col gap-5 w-full items-center">
          <NavButton
            icon={<Grid size={22} />}
            label="Dashboard Overview"
            active={activeSection === "dashboard"}
            onClick={() => scrollTo("section-dashboard", "dashboard")}
          />
          <NavButton
            icon={<Globe size={22} />}
            label="Location & Current Conditions"
            active={activeSection === "weather"}
            onClick={() => scrollTo("section-weather", "weather")}
          />
          <NavButton
            icon={<AlertTriangle size={22} />}
            label="Live Intelligence & Impact Alerts"
            active={activeSection === "impact"}
            onClick={() => scrollTo("section-impact", "impact")}
          />
          <NavButton
            icon={<History size={22} />}
            label="Forecast & Meteorological Timeline"
            active={activeSection === "forecast"}
            onClick={() => scrollTo("section-forecast", "forecast")}
          />
          <NavButton
            icon={<MessageSquare size={22} />}
            label="WeatherGPT AI Copilot"
            active={activeSection === "copilot"}
            onClick={() => scrollTo("section-copilot", "copilot")}
          />
        </nav>

        <div className="mt-auto">
          <NavButton
            icon={<Settings size={22} />}
            label="System Intelligence Settings"
            active={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          />
        </div>
      </aside>

      {/* Settings Popover Dialog */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#1C1C1E] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-neutral-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Sliders size={20} />
                <h3 id="settings-dialog-title" className="font-semibold text-lg text-white">
                  System Settings
                </h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                aria-label="Close Settings"
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between p-3 rounded-2xl bg-black/40 border border-neutral-800">
                <div className="flex gap-3">
                  <Cpu className="text-cyan-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <div className="font-medium text-white">AI Intelligence Model</div>
                    <div className="text-xs text-neutral-400">Gemini 2.5 Flash (Grounded Reasoning)</div>
                  </div>
                </div>
                <span className="text-xs text-cyan-400 flex items-center gap-1 bg-cyan-950/60 px-2 py-1 rounded-full border border-cyan-800/40">
                  <Check size={12} /> Active
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-2xl bg-black/40 border border-neutral-800">
                <div className="flex gap-3">
                  <Gauge className="text-cyan-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <div className="font-medium text-white">Measurement Units</div>
                    <div className="text-xs text-neutral-400">Metric (°C, km/h, mm, hPa)</div>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/40">
                  <Check size={12} /> Default
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-2xl bg-black/40 border border-neutral-800">
                <div className="flex gap-3">
                  <Shield className="text-cyan-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <div className="font-medium text-white">Live Intelligence Pipeline</div>
                    <div className="text-xs text-neutral-400">GDACS Disaster Alerts & Open-Meteo</div>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/40">
                  <Check size={12} /> Verified
                </span>
              </div>
            </div>

            <div className="pt-2 text-center text-xs text-neutral-500">
              WeatherGPT 2.0 &bull; Atmospheric Intelligence Platform
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
        active
          ? "bg-cyan-950/80 text-cyan-400 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/50"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
      }`}
    >
      {icon}
    </button>
  );
}
