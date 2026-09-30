"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Radio,
  Radar,
  Navigation,
  Camera,
  AlertTriangle,
  Bot,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Play,
  Layers,
} from "lucide-react";
import Link from "next/link";

export interface TourStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  highlights: string[];
  actionLabel?: string;
  actionHref?: string;
  previewGraphic: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    badge: "CORE ENGINE",
    title: "Atmospheric Intelligence & Synthesis",
    subtitle: "Beyond standard forecasts — multi-sensor NWP consensus",
    description:
      "WeatherGPT 2.0 unifies ECMWF, GFS, and local radar telemetry into a cohesive atmospheric dashboard. Get hourly outlooks, 7-day forecasts, and automated risk scoring in real-time.",
    icon: <Globe size={24} />,
    accentColor: "#06b6d4",
    highlights: [
      "ECMWF & GFS Multi-Model Consensus",
      "Dynamic Air Quality, UV, and Solar Indices",
      "Global Search with Instant Geocoding",
    ],
    actionLabel: "Explore Dashboard",
    actionHref: "/dashboard",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-black/60 rounded-2xl border border-cyan-500/20 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/20">
          <Globe size={32} className="animate-spin-slow" />
        </div>
        <span className="text-3xl font-extrabold text-[var(--text-primary)]">24°C</span>
        <span className="text-xs font-semibold text-cyan-400 mt-1">Multi-Model Consensus: 94% High Confidence</span>
        <div className="mt-4 flex gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
          <span className="px-2 py-1 rounded bg-[var(--surface-2)]">ECMWF: 24.2°</span>
          <span className="px-2 py-1 rounded bg-[var(--surface-2)]">GFS: 23.8°</span>
        </div>
      </div>
    ),
  },
  {
    id: "voice-briefing",
    badge: "AI AUDIO ANCHOR",
    title: "60-Second Daily Voice Briefing",
    subtitle: "Listen to hands-free meteorological broadcasts every morning",
    description:
      "No time to scan graphs? Click the 'AI Voice Briefing' button on your dashboard to listen to a synthesized audio forecast with real-time waveform visualizers and bilingual support.",
    icon: <Radio size={24} />,
    accentColor: "#38bdf8",
    highlights: [
      "Real-Time Speech Synthesis (Zero Latency)",
      "Audio Wave Equalizer Visualizer",
      "Instant English & Hinglish Broadcast Modes",
    ],
    actionLabel: "Try Voice Briefing",
    actionHref: "/dashboard",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 bg-gradient-to-br from-blue-950/40 via-cyan-950/30 to-black/60 rounded-2xl border border-blue-500/20 text-center relative overflow-hidden">
        <div className="flex items-end justify-center gap-1.5 h-14 mb-4">
          {[35, 60, 90, 40, 100, 75, 50, 85, 65, 95, 45, 80].map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all duration-300"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/40">
          <Play size={12} fill="currentColor" />
          <span>Live Audio Broadcast Ready</span>
        </div>
      </div>
    ),
  },
  {
    id: "doppler-radar",
    badge: "LIVE RADAR",
    title: "Interactive Precipitation Doppler Map",
    subtitle: "Live rain cells, storm tracking, and 2-hour nowcasts",
    description:
      "Inspect high-resolution Doppler reflectivity scans across your city or corridor. Watch radar loops animate past movements and project future precipitation vectors.",
    icon: <Radar size={24} />,
    accentColor: "#10b981",
    highlights: [
      "RainViewer Global Doppler Station Network",
      "Interactive 2-Hour Scrubber & Auto-Playback Loop",
      "Precipitation Intensity & Severe Hail Scale",
    ],
    actionLabel: "Open Doppler Radar",
    actionHref: "/radar",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-950/40 via-cyan-950/20 to-black/60 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Doppler Loop
          </span>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">ZOOM: 7x</span>
        </div>
        <div className="my-auto flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-emerald-500/40 flex items-center justify-center animate-spin-slow">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 blur-sm" />
          </div>
          <span className="text-xs text-[var(--text-secondary)] mt-2 font-mono">
            Tracking Active Rain Cells
          </span>
        </div>
        <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-400 via-emerald-400 to-red-500 h-full w-3/4" />
        </div>
      </div>
    ),
  },
  {
    id: "route-planner",
    badge: "TRAVEL INTELLIGENCE",
    title: "Highway & Transit Corridor Planner",
    subtitle: "Never get surprised by fog, ice, or storms on the highway",
    description:
      "Enter your origin and destination. WeatherGPT calculates sequential waypoints, estimated arrival times, and warns you of hazards like highway fog, hydroplaning, or heavy mountain snow.",
    icon: <Navigation size={24} />,
    accentColor: "#f59e0b",
    highlights: [
      "Multi-Point Waypoint Meteorological Trajectory",
      "Hazard Alerts: Dense Fog, Torrential Rain, Crosswinds",
      "Corridor Safety Index (0-100 Score)",
    ],
    actionLabel: "Plan Travel Route",
    actionHref: "/routes",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-between p-5 bg-gradient-to-br from-amber-950/40 via-yellow-950/20 to-black/60 rounded-2xl border border-amber-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-amber-400">Delhi → Manali Highway</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
            90/100 SAFE
          </span>
        </div>
        <div className="space-y-2 my-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[var(--text-secondary)]">Delhi Departure: Clear (26°C)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-300 font-medium">Midway Pass: Dense Fog (+3h)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[var(--text-secondary)]">Manali Arrival: Fair (12°C)</span>
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">Distance: 405 km • ETA: ~7h</span>
      </div>
    ),
  },
  {
    id: "sky-vision",
    badge: "AI VISION",
    title: "Sky & Cloud Vision Analyzer",
    subtitle: "Nephology intelligence: identify clouds and storm risks",
    description:
      "Upload a photo of the sky from your smartphone or pick reference formations. WeatherGPT classifies cloud genus, identifies thermal updrafts, and predicts imminent frontal weather.",
    icon: <Camera size={24} />,
    accentColor: "#a855f7",
    highlights: [
      "WMO International Cloud Atlas Standard",
      "Instant Cloud Genus & Altitude Band Diagnostics",
      "Precursor Storm & Atmospheric Stability Check",
    ],
    actionLabel: "Analyze Sky Photo",
    actionHref: "/sky-vision",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-center items-center p-5 bg-gradient-to-br from-purple-950/40 via-blue-950/20 to-black/60 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2">
          <Camera size={28} />
        </div>
        <span className="font-bold text-sm text-[var(--text-primary)]">Cumulonimbus Incus</span>
        <span className="text-xs font-semibold text-rose-400 mt-1">Severe Storm Risk Detected (96%)</span>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-2 max-w-xs">
          Vertical convective updraft penetrating tropopause. Imminent showers.
        </p>
      </div>
    ),
  },
  {
    id: "disasters",
    badge: "DISASTER INTEL",
    title: "Global Disaster & Stakeholder Risk",
    subtitle: "Continuous live feeds from GDACS, NOAA, and USGS",
    description:
      "Track cyclones, earthquakes, flash floods, and wildfires globally. Assess agronomic soil moisture for farming or operational risks for aviation and logistics teams.",
    icon: <AlertTriangle size={24} />,
    accentColor: "#ef4444",
    highlights: [
      "Verified Live GDACS & USGS Disaster Bulletins",
      "Agronomic Soil Moisture & Crop Spray Windows",
      "Aviation, Logistics & Drone Suitability Protocols",
    ],
    actionLabel: "View Disaster Intelligence",
    actionHref: "/intelligence",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-center items-center p-5 bg-gradient-to-br from-rose-950/40 via-orange-950/20 to-black/60 rounded-2xl border border-rose-500/20 text-center relative overflow-hidden">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3">
          <AlertTriangle size={30} className="animate-pulse" />
        </div>
        <span className="font-bold text-sm text-[var(--text-primary)]">24/7 Global Surveillance</span>
        <span className="text-xs text-rose-300 mt-0.5">GDACS &amp; USGS Grounded Data Stream</span>
        <div className="mt-3 flex gap-2">
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] border border-rose-500/30">
            Seismic
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] border border-blue-500/30">
            Flood
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] border border-amber-500/30">
            Cyclone
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "copilot",
    badge: "AI COPILOT",
    title: "Interactive Meteorological Copilot",
    subtitle: "Ask questions, plan outdoor events, and solve weather problems",
    description:
      "Need advice on planning a sports event, outdoor shoot, or harvest window? Chat directly with the WeatherGPT Meteorological Copilot with full atmospheric grounding.",
    icon: <Bot size={24} />,
    accentColor: "#06b6d4",
    highlights: [
      "Grounded in Current NWP Consensus Data",
      "Specialized Persona Recommendations",
      "Floating Chat Widget on Every Page",
    ],
    actionLabel: "Launch Copilot",
    actionHref: "/chat",
    previewGraphic: (
      <div className="w-full h-full flex flex-col justify-center items-center p-5 bg-gradient-to-br from-cyan-950/40 via-sky-950/30 to-black/60 rounded-2xl border border-cyan-500/20 text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
          <Bot size={30} />
        </div>
        <span className="font-bold text-sm text-[var(--text-primary)]">Meteorological Copilot</span>
        <p className="text-[11px] text-cyan-300 italic mt-1 bg-[var(--surface-base)]/80 p-2 rounded-xl border border-[var(--border-subtle)]">
          &ldquo;Tomorrow 8 AM is your optimal 3-hour dry window for outdoor activities.&rdquo;
        </p>
      </div>
    ),
  },
];

interface ProductTourModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ProductTourModal({
  isOpen: controlledIsOpen,
  onClose,
}: ProductTourModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Auto-launch for new users on first visit
  useEffect(() => {
    if (controlledIsOpen === undefined && typeof window !== "undefined") {
      const hasCompletedTour = localStorage.getItem("weathergpt_tutorial_completed");
      if (!hasCompletedTour) {
        setInternalIsOpen(true);
      }
    }
  }, [controlledIsOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  const handleNext = () => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("weathergpt_tutorial_completed", "true");
    }
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("weathergpt_tutorial_completed", "true");
    }
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentIndex]!;
  const isLastStep = currentIndex === TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md wg-animate-in"
      onClick={handleSkip}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-2xl p-6 sm:p-8 overflow-hidden flex flex-col gap-6 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.15)",
        }}
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: currentStep.accentColor }}
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border"
              style={{
                backgroundColor: `${currentStep.accentColor}20`,
                borderColor: `${currentStep.accentColor}40`,
                color: currentStep.accentColor,
              }}
            >
              {currentStep.badge}
            </span>
            <span className="text-xs font-mono text-[var(--text-tertiary)]">
              Step {currentIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition"
          >
            <span>Skip Tutorial</span>
            <X size={15} />
          </button>
        </div>

        {/* Step Visual Preview & Description Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch min-h-[260px]">
          {/* Left Preview Card */}
          <div className="md:col-span-5 h-48 md:h-full">
            {currentStep.previewGraphic}
          </div>

          {/* Right Information */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                {currentStep.title}
              </h3>
              <p className="text-xs font-semibold text-cyan-400 mb-2">
                {currentStep.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Highlights bullet points */}
            <div className="space-y-1.5 pt-1">
              {currentStep.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Quick Action Link */}
            {currentStep.actionHref && (
              <div className="pt-2">
                <Link
                  href={currentStep.actionHref}
                  onClick={handleComplete}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition hover:underline"
                >
                  <span>{currentStep.actionLabel}</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Step Dots and Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? "w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50"
                    : "w-2 bg-[var(--surface-3)] hover:bg-[var(--text-tertiary)]"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2.5">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] transition active:scale-95"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 transition active:scale-95"
            >
              <span>{isLastStep ? "Finish & Start Exploring" : "Next Feature"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
