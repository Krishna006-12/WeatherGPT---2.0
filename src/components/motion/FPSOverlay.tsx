"use client";

/**
 * WeatherGPT 2.0 — FPS & Performance Telemetry Overlay.
 *
 * Dev-mode performance monitor measuring real-time frame rates, 60-frame
 * rolling averages, frame delta (ms), and dropped frames (< 50fps).
 * Activated via `NEXT_PUBLIC_DEBUG_FPS=1`, `?debug_fps=1`, or manual toggle.
 */

import React, { useState, useEffect, useRef } from "react";
import { useDeviceTier } from "@/lib/motion/device-tier";

export function FPSOverlay() {
  const [fps, setFps] = useState(60);
  const [avgFps, setAvgFps] = useState(60);
  const [frameDeltaMs, setFrameDeltaMs] = useState(16.67);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const { tier, isReducedMotion } = useDeviceTier();

  const historyRef = useRef<number[]>([]);
  const lastTimeRef = useRef(0);
  const droppedCountRef = useRef(0);

  useEffect(() => {
    // Check activation conditions: env variable, URL query param, or localStorage
    const envActive = process.env.NEXT_PUBLIC_DEBUG_FPS === "1";
    const urlActive =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug_fps") === "1";
    const storageActive =
      typeof window !== "undefined" &&
      window.localStorage.getItem("weathergpt_debug_fps") === "1";

    if (envActive || urlActive || storageActive) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let rafId: number;
    lastTimeRef.current = performance.now();

    const measure = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0) {
        const currentFps = Math.min(120, Math.round(1000 / delta));
        const history = historyRef.current;
        history.push(currentFps);
        if (history.length > 60) history.shift();

        // Dropped frame threshold (< 50fps / > 20ms)
        if (delta > 20.0) {
          droppedCountRef.current++;
        }

        // Periodic UI update (every 10 frames to prevent state churn)
        if (history.length % 10 === 0) {
          const sum = history.reduce((a, b) => a + b, 0);
          const avg = Math.round(sum / history.length);
          setFps(currentFps);
          setAvgFps(avg);
          setFrameDeltaMs(Math.round(delta * 10) / 10);
          setDroppedFrames(droppedCountRef.current);
        }
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const isFluid = avgFps >= 58;
  const isFair = avgFps >= 45 && avgFps < 58;

  return (
    <aside
      aria-label="Dev FPS Overlay"
      className="fixed bottom-4 right-4 z-50 rounded-xl p-3 font-mono text-xs shadow-2xl border backdrop-blur-md select-none pointer-events-auto transition-all"
      style={{
        background: "rgba(16, 17, 21, 0.88)",
        borderColor: isFluid
          ? "rgba(52, 211, 153, 0.3)"
          : isFair
          ? "rgba(251, 191, 36, 0.3)"
          : "rgba(248, 113, 113, 0.4)",
        color: "#F4F4F6",
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 mb-2">
        <span className="font-semibold text-slate-300 text-[11px] tracking-wider uppercase">
          Motion Monitor
        </span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white px-1"
          aria-label="Close FPS monitor"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div>
          <span className="text-slate-400">Current FPS:</span>
          <span
            className={`ml-2 font-bold ${
              fps >= 58 ? "text-emerald-400" : fps >= 45 ? "text-amber-400" : "text-rose-400"
            }`}
          >
            {fps}
          </span>
        </div>

        <div>
          <span className="text-slate-400">60-Frame Avg:</span>
          <span
            className={`ml-2 font-bold ${
              avgFps >= 58 ? "text-emerald-400" : avgFps >= 45 ? "text-amber-400" : "text-rose-400"
            }`}
          >
            {avgFps}
          </span>
        </div>

        <div>
          <span className="text-slate-400">Frame Delta:</span>
          <span className="ml-2 text-slate-200">{frameDeltaMs}ms</span>
        </div>

        <div>
          <span className="text-slate-400">Dropped:</span>
          <span
            className={`ml-2 font-semibold ${
              droppedFrames > 0 ? "text-amber-400" : "text-slate-300"
            }`}
          >
            {droppedFrames}
          </span>
        </div>

        <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
          <span>Tier: <strong className="text-cyan-400 uppercase">{tier}</strong></span>
          <span>Reduced: <strong className={isReducedMotion ? "text-amber-400" : "text-emerald-400"}>{isReducedMotion ? "ON" : "OFF"}</strong></span>
        </div>
      </div>
    </aside>
  );
}
