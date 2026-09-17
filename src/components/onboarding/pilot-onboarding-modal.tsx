"use client";

import { useState, useEffect } from "react";
import {
  Sprout,
  ShieldAlert,
  Languages,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Info,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import type { PersonaId } from "@/types/persona";

interface PilotOnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (persona: PersonaId, language: "en" | "hi" | "pa") => void;
}

export function PilotOnboardingModal({
  isOpen: controlledIsOpen,
  onClose,
  onComplete,
}: PilotOnboardingModalProps) {
  const { setLanguage } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCohort, setSelectedCohort] = useState<PersonaId>("farmer");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "pa">("pa");

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  useEffect(() => {
    // Automatically open for first-time pilot visitors if not controlled
    if (controlledIsOpen === undefined) {
      const hasOnboarded = typeof window !== "undefined" && localStorage.getItem("weathergpt_pilot_onboarded");
      if (!hasOnboarded) {
        setInternalIsOpen(true);
      }
    }
  }, [controlledIsOpen]);

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("weathergpt_pilot_onboarded", "true");
      localStorage.setItem("weathergpt_active_persona", selectedCohort);
    }
    setLanguage(selectedLanguage);
    if (onComplete) {
      onComplete(selectedCohort, selectedLanguage);
    }
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pilot-onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="wg-surface-command relative w-full max-w-lg overflow-hidden rounded-[32px] border border-[var(--border-subtle)] p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={() => (onClose ? onClose() : setInternalIsOpen(false))}
          aria-label="Close onboarding modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
          <Sparkles size={14} />
          <span>WeatherGPT 2.0 • Pilot Onboarding (Step {step} of 3)</span>
        </div>

        {/* STEP 1: Stakeholder Group Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2
                id="pilot-onboarding-title"
                className="text-xl font-bold tracking-tight text-[var(--text-primary)]"
              >
                Select Your Pilot Stakeholder Group
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                WeatherGPT 2.0 customizes decision thresholds, alerts, and terminology for your field operations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Option A: Farmer */}
              <button
                onClick={() => {
                  setSelectedCohort("farmer");
                  setSelectedLanguage("pa"); // default Punjabi for wheat/mustard cohort
                }}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${selectedCohort === "farmer"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-sm"
                  : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                  }`}
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Sprout size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Smallholder Farmer (ਪੰਜਾਬ / Western UP)</span>
                    {selectedCohort === "farmer" && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Agronomic decision support: foliar spraying drift limits (&lt; 15 km/h), irrigation schedules, and frost protection for wheat and mustard.
                  </p>
                </div>
              </button>

              {/* Option B: Disaster Manager */}
              <button
                onClick={() => {
                  setSelectedCohort("disaster_manager");
                  setSelectedLanguage("en");
                }}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${selectedCohort === "disaster_manager"
                  ? "border-red-500 bg-red-500/10 text-red-950 dark:text-red-100 shadow-sm"
                  : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                  }`}
              >
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Disaster & Emergency Manager (DDMA)</span>
                    {selectedCohort === "disaster_manager" && <CheckCircle2 size={16} className="text-red-600" />}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Multi-agency incident command: Emergency Operations Center (EOC) checklists, siren warnings, and flood/cyclone coordination.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
              >
                <span>Continue to Language</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Language Preference */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <Languages size={20} className="text-[var(--accent)]" />
                <span>Choose Preferred Language</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                All decision checklists, weather alerts, and AI explanations will render in your chosen language.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                onClick={() => setSelectedLanguage("pa")}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all ${selectedLanguage === "pa"
                  ? "border-[var(--accent)] bg-[var(--accent-surface)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                  }`}
              >
                <span>ਪੰਜਾਬੀ (Punjabi — Recommended for Punjab Farmers)</span>
                {selectedLanguage === "pa" && <CheckCircle2 size={18} />}
              </button>

              <button
                onClick={() => setSelectedLanguage("hi")}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all ${selectedLanguage === "hi"
                  ? "border-[var(--accent)] bg-[var(--accent-surface)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                  }`}
              >
                <span>हिन्दी (Hindi — Recommended for UP / Bihar Responders)</span>
                {selectedLanguage === "hi" && <CheckCircle2 size={18} />}
              </button>

              <button
                onClick={() => setSelectedLanguage("en")}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all ${selectedLanguage === "en"
                  ? "border-[var(--accent)] bg-[var(--accent-surface)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                  }`}
              >
                <span>English (Recommended for DDMA Command & Analysis)</span>
                {selectedLanguage === "en" && <CheckCircle2 size={18} />}
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-xs hover:opacity-90"
              >
                <span>Preview Walkthrough</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Walkthrough Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {selectedCohort === "farmer" ? "Farmer Field Walkthrough" : "Incident Command Walkthrough"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Key operational capabilities active for your pilot session:
              </p>
            </div>

            {selectedCohort === "farmer" ? (
              <div className="space-y-2.5 text-xs text-[var(--text-primary)]">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    1. Chemical Spraying Drift Windows
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Informs you before spraying if sustained winds exceed 15 km/h or if rain in the next 24h will wash off chemical inputs.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    2. Soil Moisture & Tube-Well Power Savings
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Advises when to halt irrigation if forecast rain (&ge; 20 mm) meets crop water demand, saving groundwater and electricity.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    3. Ground Frost & Cold Shock Defense
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Alerts you before sunset if night temperatures drop to &le; 4°C so you can apply light irrigation or mulching.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-[var(--text-primary)]">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
                  <div className="font-bold text-red-800 dark:text-red-300">
                    1. Automatic EOC Command Checklist
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Barometric pressure drops (&le; 995 hPa) and gale-force gusts trigger municipal operations center convening protocols.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
                  <div className="font-bold text-red-800 dark:text-red-300">
                    2. Siren & Floodplain Evacuation Alerts
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Every coordination action references transparent observed telemetry and active emergency criteria with zero black-box suggestions.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
                  <div className="font-bold text-red-800 dark:text-red-300">
                    3. Resilient Degraded-Mode Failover
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Maintains emergency telemetry access even during upstream network failures, serving cached snapshots with clear stale notices.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)] text-[11px] text-[var(--text-tertiary)]">
              <Info size={14} className="shrink-0 text-[var(--accent)]" />
              <span>All sessions respect zero-PII logging. Telemetry coordinates are coarsened to 10km grid resolution.</span>
            </div>

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 size={15} />
                <span>Complete Onboarding & Enter Pilot</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
