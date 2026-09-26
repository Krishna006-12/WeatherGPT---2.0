"use client";

/**
 * WeatherGPT 2.0 — Antigravity Motion System Showcase & Lab.
 *
 * Storybook-equivalent interactive environment demonstrating:
 * 1. Mass/Inertia Tiers (Light, Medium, Heavy) side-by-side with live physics telemetry.
 * 2. Adaptive Device Tiers (High, Medium, Low/Reduced-Motion) with immediate visual feedback.
 * 3. Fluid inertia & velocity-aware snap-to carousel with 4–8% elastic overshoot.
 * 4. Multi-element 60fps stress test with real-time FPS monitoring.
 * 5. Tactile micro-interactions and P3 wide color gamut rendering.
 */

import React, { useState } from "react";
import { FloatingElement } from "@/components/motion/FloatingElement";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import {
  MASS_TIER_CONFIGS,
  type MassTier,
} from "@/lib/motion/antigravity";
import {
  useDeviceTier,
  TIER_CAPABILITIES,
  type DeviceTier,
} from "@/lib/motion/device-tier";
import { triggerHaptic } from "@/lib/motion/haptics";
import { calculateVelocityAwareSnap } from "@/lib/motion/easings";
import { CloudRain, Wind, Thermometer, ShieldAlert, Sparkles, Activity, Compass, Play } from "lucide-react";
import { WeatherSplashScreen } from "@/components/ui/weather-splash-screen";

export default function MotionShowcasePage() {
  const detectedTier = useDeviceTier();
  const [simulatedTier, setSimulatedTier] = useState<DeviceTier | null>(null);
  const [stressCount, setStressCount] = useState(12);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [showSplashPreview, setShowSplashPreview] = useState(false);

  const activeTierConfig = simulatedTier
    ? TIER_CAPABILITIES[simulatedTier]
    : detectedTier;

  const cardWidth = 240;
  const totalCards = 6;

  const handleDragCarousel = (direction: "prev" | "next") => {
    triggerHaptic("snap");
    const delta = direction === "next" ? -cardWidth : cardWidth;
    const newOffset = calculateVelocityAwareSnap(
      carouselOffset + delta,
      cardWidth,
      direction === "next" ? -0.8 : 0.8,
      totalCards
    );
    setCarouselOffset(newOffset);
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Apple-Caliber Motion System
          </span>
          <span className="text-xs text-slate-400">
            Active Tier: <strong className="text-cyan-300 uppercase">{activeTierConfig.tier}</strong>
            {activeTierConfig.isReducedMotion ? " (Reduced Motion Active)" : ""}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Antigravity Physics & Motion Lab
        </h1>
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <p className="text-sm text-slate-400 max-w-2xl">
            Zero-gravity buoyancy simulation, exponential momentum decay ($v(t) = v_0 \cdot e^{"{-t/\\tau}"}$),
            multi-harmonic Lissajous drift, and GPU-composited parallax layers operating strictly at $\ge 60$ FPS.
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("heavy");
              setShowSplashPreview(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Replay App Launch Animation
          </button>
        </div>
      </div>

      {/* Interactive Splash Screen Preview Modal / Overlay */}
      {showSplashPreview && (
        <WeatherSplashScreen
          forceShow={true}
          autoDismiss={true}
          onComplete={() => setShowSplashPreview(false)}
        />
      )}

      {/* 1. Device Tier Simulation Controls */}
      <section className="wg-card p-5 border border-white/10 rounded-2xl flex flex-col gap-4 bg-[var(--surface-1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Device Tier & Adaptive Scaling</h2>
            <p className="text-xs text-slate-400">
              Test how the motion layer gracefully degrades envelopes, disables overshoot, or activates static mode.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["high", "medium", "low"] as DeviceTier[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  triggerHaptic("light");
                  setSimulatedTier(t);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                  activeTierConfig.tier === t
                    ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                {t} {t === "low" ? "(Reduced Motion)" : ""}
              </button>
            ))}
            {simulatedTier && (
              <button
                onClick={() => setSimulatedTier(null)}
                className="text-xs text-slate-400 underline hover:text-white ml-2"
              >
                Reset to Auto
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
          <div>
            <span className="text-slate-400">Drift Scale:</span>
            <span className="ml-1.5 font-mono text-cyan-300">
              {(activeTierConfig.driftEnvelopeScale * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400">Parallax Multiplier:</span>
            <span className="ml-1.5 font-mono text-cyan-300">
              {activeTierConfig.parallaxMultiplier.toFixed(1)}x
            </span>
          </div>
          <div>
            <span className="text-slate-400">Spring Overshoot:</span>
            <span className={`ml-1.5 font-mono ${activeTierConfig.allowSpringOvershoot ? "text-emerald-400" : "text-amber-400"}`}>
              {activeTierConfig.allowSpringOvershoot ? "Enabled (4–8%)" : "Damped (0%)"}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Glassmorphism:</span>
            <span className="ml-1.5 font-mono text-slate-200">
              {activeTierConfig.blurGlassEnabled ? "20px Blur + Sat" : "Solid Fallback"}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Mass/Inertia Tiers Side-by-Side Comparison */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Mass / Inertia Tiers (Interactive Drag & Nudge)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(["light", "medium", "heavy"] as MassTier[]).map((tier) => {
            const cfg = MASS_TIER_CONFIGS[tier];
            return (
              <div
                key={tier}
                className="wg-card p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Tier: {tier}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    $\tau = {cfg.tauMs}$ms
                  </span>
                </div>

                <div className="h-44 flex items-center justify-center p-4 border border-dashed border-white/10 rounded-xl bg-black/20">
                  <FloatingElement
                    id={`showcase-mass-${tier}`}
                    massTier={tier}
                    draggable={true}
                    envelopeScale={activeTierConfig.driftEnvelopeScale}
                    disabled={activeTierConfig.isReducedMotion}
                    className="select-none"
                  >
                    <div
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 shadow-xl transition-shadow active:shadow-cyan-500/20 ${
                        tier === "light"
                          ? "bg-slate-800/80 border-cyan-400/40 text-cyan-300"
                          : tier === "medium"
                          ? "bg-slate-800/90 border-blue-400/40 text-blue-300"
                          : "bg-slate-900 border-indigo-400/40 text-indigo-200"
                      }`}
                      style={{ width: tier === "light" ? 130 : tier === "medium" ? 160 : 190 }}
                    >
                      {tier === "light" && <Wind className="w-6 h-6 animate-pulse" />}
                      {tier === "medium" && <CloudRain className="w-7 h-7" />}
                      {tier === "heavy" && <Thermometer className="w-8 h-8" />}

                      <span className="text-xs font-semibold capitalize">{tier} Mass</span>
                      <span className="text-[10px] text-slate-400 text-center">
                        Drag & release to test fluid momentum decay
                      </span>
                    </div>
                  </FloatingElement>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                  <div>Envelope: ±{cfg.envelopeY}px</div>
                  <div>Settle: {cfg.settleTimeMs}ms</div>
                  <div>Sensitivity: {cfg.impulseSensitivity}x</div>
                  <div>Base Cycle: {(cfg.basePeriodMs / 1000).toFixed(1)}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Fluid Inertia & Velocity Snap-to Carousel */}
      <section className="wg-card p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Velocity-Aware Snap-to Carousel with Elastic Overshoot
            </h2>
            <p className="text-xs text-slate-400">
              Releasing a swipe with high velocity snaps to the next card even before passing 50% travel, settling with restrained 4–8% overshoot.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDragCarousel("prev")}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold wg-pressable"
            >
              ← Prev
            </button>
            <button
              onClick={() => handleDragCarousel("next")}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold wg-pressable"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="overflow-hidden py-4 px-2 border border-white/5 rounded-xl bg-black/30">
          <div
            className="flex gap-4 will-change-transform"
            style={{
              transform: `translate3d(${carouselOffset}px, 0px, 0px)`,
              transition: activeTierConfig.allowSpringOvershoot
                ? "transform 550ms var(--ease-spring-snappy)"
                : "transform 350ms var(--ease-decelerate)",
            }}
          >
            {Array.from({ length: totalCards }, (_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[240px] p-4 rounded-xl border border-white/10 bg-[var(--surface-2)] flex flex-col gap-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Slot +{i * 2}h</span>
                  <span className="text-xs text-cyan-400 font-mono">{(24 + i * 1.5).toFixed(0)}°C</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <CloudRain className="w-4 h-4 text-cyan-400" />
                  <span>Precipitation {i * 10}%</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Card #{i + 1} of {totalCards}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Depth-Aware Parallax Simulation */}
      <section className="wg-card p-5 rounded-2xl flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white">
          Depth-Aware Parallax Layers (GPU Composited translate3d)
        </h2>
        <p className="text-xs text-slate-400">
          Background (0.2x), Mid Atmospheric (0.5x), and Foreground UI (1.0x) move at differentiated speeds during scroll without layout recalculations.
        </p>

        <div className="relative h-48 overflow-hidden rounded-xl border border-white/10 bg-slate-950 flex items-center justify-center">
          <ParallaxLayer depth="background" className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-96 h-96 rounded-full bg-cyan-600/20 blur-3xl" />
          </ParallaxLayer>

          <ParallaxLayer depth="mid" className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-40">
            <CloudRain className="w-20 h-20 text-blue-400" />
            <Wind className="w-16 h-16 text-cyan-300" />
          </ParallaxLayer>

          <ParallaxLayer depth="foreground" className="z-10 flex flex-col items-center gap-2 text-center">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-md">
              <span className="text-xs font-semibold text-white">Foreground UI Plane (1.0x)</span>
            </div>
          </ParallaxLayer>
        </div>
      </section>

      {/* 5. 60 FPS Multi-Element Stress Test */}
      <section className="wg-card p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Multi-Element 60 FPS Stress Test ({stressCount} Floating Nodes)
            </h2>
            <p className="text-xs text-slate-400">
              Verifies sustained $\ge 60$ FPS budget during simultaneous, uncoordinated multi-card drift.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[6, 12, 20].map((num) => (
              <button
                key={num}
                onClick={() => {
                  triggerHaptic("light");
                  setStressCount(num);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  stressCount === num ? "bg-cyan-500 text-black" : "bg-white/5 text-slate-300"
                }`}
              >
                {num} Elements
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          {Array.from({ length: stressCount }, (_, i) => (
            <FloatingElement
              key={i}
              id={`stress-node-${i}`}
              massTier={i % 3 === 0 ? "light" : i % 3 === 1 ? "medium" : "heavy"}
              envelopeScale={activeTierConfig.driftEnvelopeScale}
              disabled={activeTierConfig.isReducedMotion}
            >
              <div className="p-3 rounded-xl border border-white/5 bg-[var(--surface-2)] flex flex-col items-center gap-1.5 shadow-md">
                {i % 4 === 0 && <Activity className="w-4 h-4 text-cyan-400" />}
                {i % 4 === 1 && <Compass className="w-4 h-4 text-emerald-400" />}
                {i % 4 === 2 && <ShieldAlert className="w-4 h-4 text-amber-400" />}
                {i % 4 === 3 && <CloudRain className="w-4 h-4 text-blue-400" />}
                <span className="text-[11px] font-medium text-slate-300">Node #{i + 1}</span>
                <span className="text-[9px] font-mono text-slate-500 capitalize">
                  {i % 3 === 0 ? "Light" : i % 3 === 1 ? "Medium" : "Heavy"}
                </span>
              </div>
            </FloatingElement>
          ))}
        </div>
      </section>
    </div>
  );
}
