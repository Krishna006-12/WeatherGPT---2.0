/**
 * WeatherAmbientBackground
 *
 * A lightweight, theme‑aware ambient background that reacts to the current
 * weather condition, time of day and the user's “prefers‑reduced‑motion”
 * setting.
 *
 * Usage
 * -----
 * ```tsx
 * <WeatherAmbientBackground
 *   condition={currentWeather.condition}   // e.g. "rain"
 *   timeOfDay="day"                       // "dawn" | "day" | "dusk" | "night"
 *   className="absolute inset-0"          // any extra Tailwind layout classes
 * />
 * ```
 *
 * The component sits **behind** all UI (z‑index: -10) and adds a subtle
 * backdrop‑filter blur so foreground text stays legible.
 */

import { useEffect, useMemo, useState } from "react";

type WeatherCondition =
  | "clear"
  | "cloudy"
  | "partly-cloudy"
  | "rain"
  | "thunderstorm"
  | "snow"
  | "fog"
  | "mist";

type TimeOfDay = "dawn" | "day" | "dusk" | "night";

interface WeatherAmbientBackgroundProps {
  /** Current weather condition (from API) */
  condition: WeatherCondition;
  /** Current time slice – controls the radial hue */
  timeOfDay: TimeOfDay;
  /** Optional className for container positioning */
  className?: string;
}

/** Map timeOfDay to hue offset for the base gradient */
const timeOfDayHue: Record<TimeOfDay, number> = {
  dawn: 30,
  day: 200,
  dusk: 10,
  night: 240,
};

export default function WeatherAmbientBackground({
  condition,
  timeOfDay,
  className = "",
}: WeatherAmbientBackgroundProps) {
  const [reduced, setReduced] = useState(false);

  // ---------- reduced‑motion handling ----------
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ---------- particle generation ----------
  const rainDrops = useMemo(() => {
    const count = 45;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      duration: 1.2 + Math.random() * 0.6,
      left: Math.random() * 100,
    }));
  }, []);

  const snowFlakes = useMemo(() => {
    const count = 30;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 2,
      left: Math.random() * 100,
    }));
  }, []);

  // ---------- thunderstorm flash ----------
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (condition !== "thunderstorm" || reduced) return;
    const min = 4000;
    const max = 10000;
    let timer: NodeJS.Timeout;
    const trigger = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 120);
      timer = setTimeout(trigger, min + Math.random() * (max - min));
    };
    timer = setTimeout(trigger, min + Math.random() * (max - min));
    return () => clearTimeout(timer);
  }, [condition, reduced]);

  // ---------- CSS variables from theme ----------
  const cssVars = {
    "--bg-hue": timeOfDayHue[timeOfDay].toString(),
    "--cloud-color": "var(--cloud-color)",
    "--rain-color": "var(--rain-color)",
    "--snow-color": "var(--snow-color)",
    "--fog-color": "var(--fog-color)",
    "--flash-color": "var(--flash-color)",
  } as React.CSSProperties;

  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      style={cssVars}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--bg-hue),70%,95%)] to-[hsl(var(--bg-hue),70%,80%)]" />
      {/* Scrim for contrast */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/10" />

      {/* Animated layers */}
      {!reduced && (
        <>
          {/* Clear */}
          {condition === "clear" && (
            <div className="absolute inset-0">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,hsla(var(--bg-hue),80%,70%,0.2),transparent)] opacity-30 animate-pulse-slow" />
            </div>
          )}

          {/* Cloudy */}
          {(condition === "cloudy" || condition === "partly-cloudy") && (
            <div className="absolute inset-0">
              {[0.6, 0.8, 1].map((speed, idx) => (
                <svg
                  key={idx}
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 800 200"
                  preserveAspectRatio="none"
                  style={{ opacity: 0.12 }}
                >
                  <path
                    fill="var(--cloud-color)"
                    d="M0,100 C150,0 250,200 400,100 C550,0 650,200 800,100 L800,200 L0,200 Z"
                  />
                  <style>{`
                    @keyframes cloudMove${idx} {
                      from { transform: translateX(0%); }
                      to { transform: translateX(-${100 * speed}%); }
                    }
                    svg:nth-child(${idx + 1}) { animation: cloudMove${idx} ${30 * speed}s linear infinite; }
                  `}</style>
                </svg>
              ))}
            </div>
          )}

          {/* Rain */}
          {condition === "rain" && (
            <div className="absolute inset-0">
              {/* Cloud backdrop */}
              <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path fill="var(--cloud-color)" d="M0,120 C200,20 300,220 500,120 C700,20 800,220 800,120 L800,200 L0,200 Z" />
              </svg>
              {/* Raindrops */}
              {rainDrops.map((d) => (
                <div
                  key={d.id}
                  className="absolute top-0 w-px h-12 bg-[var(--rain-color)] opacity-20"
                  style={{
                    left: `${d.left}%`,
                    animation: `rainFall ${d.duration}s linear infinite`,
                    animationDelay: `${d.delay}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes rainFall {
                  0% { transform: translateY(-10%); opacity:0; }
                  10% { opacity:0.2; }
                  100% { transform: translateY(110%); opacity:0.2; }
                }
              `}</style>
            </div>
          )}

          {/* Thunderstorm */}
          {condition === "thunderstorm" && (
            <div className="absolute inset-0">
              {/* Dark clouds */}
              <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path fill="var(--cloud-color)" d="M0,130 C250,30 350,230 600,130 C750,30 800,230 800,130 L800,200 L0,200 Z" />
              </svg>
              {/* Heavy rain */}
              {rainDrops.map((d) => (
                <div
                  key={d.id}
                  className="absolute top-0 w-px h-14 bg-[var(--rain-color)] opacity-30"
                  style={{
                    left: `${d.left}%`,
                    animation: `rainFallTh ${d.duration}s linear infinite`,
                    animationDelay: `${d.delay}s`,
                  }}
                />
              ))}
              {/* Lightning flash */}
              {flash && (
                <div className="absolute inset-0 bg-[var(--flash-color)] opacity-10 animate-fade-in-out" />
              )}
              <style>{`
                @keyframes rainFallTh {
                  0% { transform: translateY(-10%); opacity:0; }
                  5% { opacity:0.35; }
                  100% { transform: translateY(110%); opacity:0.35; }
                }
                @keyframes fade-in-out {
                  0% { opacity:0; }
                  10% { opacity:0.1; }
                  90% { opacity:0.1; }
                  100% { opacity:0; }
                }
              `}</style>
            </div>
          )}

          {/* Snow */}
          {condition === "snow" && (
            <div className="absolute inset-0">
              {snowFlakes.map((f) => (
                <div
                  key={f.id}
                  className="absolute top-0 w-2 h-2 rounded-full bg-[var(--snow-color)] opacity-30"
                  style={{
                    left: `${f.left}%`,
                    animation: `snowFall ${f.duration}s linear infinite`,
                    animationDelay: `${f.delay}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes snowFall {
                  0% { transform: translateY(-5%); opacity:0; }
                  20% { opacity:0.3; }
                  100% { transform: translateY(110%); opacity:0.3; }
                }
              `}</style>
            </div>
          )}

          {/* Fog / Mist */}
          {(condition === "fog" || condition === "mist") && (
            <div className="absolute inset-0">
              <div
                className="absolute inset-x-0 top-1/3 h-1/3 bg-[var(--fog-color)] opacity-20"
                style={{ animation: "fogBreath 8s ease-in-out infinite" }}
              />
              <style>{`
                @keyframes fogBreath {
                  0%,100% { opacity:0.15; }
                  50% { opacity:0.25; }
                }
              `}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
