"use client";

import { useState, useEffect, useRef } from "react";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Radio,
  X,
  Languages,
} from "lucide-react";

interface VoiceBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather?: WeatherSnapshot;
  location: NormalizedLocation;
}

export function VoiceBriefingModal({
  isOpen,
  onClose,
  weather,
  location,
}: VoiceBriefingModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Generate dynamic weather anchor script based on real data
  const generateScript = (language: "en" | "hi") => {
    if (!weather || !weather.current) {
      return language === "hi"
        ? "Mausam data prapt kiya ja raha hai, kripya pratiksha karein."
        : "Weather intelligence data is currently synchronizing. Please wait.";
    }

    const cur = weather.current;
    const temp = Math.round(cur.temperature);
    const feels = Math.round(cur.feelsLike);
    const condition = cur.condition;
    const humidity = cur.humidity;
    const wind = Math.round(cur.windSpeed);
    const precipProb = cur.precipitationProbability ?? 10;
    const uv = cur.uvIndex ?? 4;
    const cityName = location.name;

    if (language === "hi") {
      let rainNote = "Aaj aasmaan saaf rehne ki sambhavna hai.";
      if (precipProb > 40) {
        rainNote = `Baarish ke ${precipProb}% chances hain. Apne saath chaata zaroor rakhein.`;
      } else if (condition.toLowerCase().includes("rain") || condition.toLowerCase().includes("shower")) {
        rainNote = "Kshetr mein baarish ho rahi hai. Sadak par sambhal kar chalein.";
      }

      let advisory = "Dincharya ke liye mausam anukool hai.";
      if (uv >= 7) {
        advisory = "UV index kaafi high hai, dhoop mein sunscreen ka upayog karein.";
      } else if (temp > 38) {
        advisory = "Garmi zyada hai, hydration banaye rakhein.";
      } else if (temp < 10) {
        advisory = "Thand zyada hai, garm kapde pehankar niklein.";
      }

      return `Namaste! Yeh hai WeatherGPT ka daily weather briefing for ${cityName}. Abhi yahan tapman ${temp} degree Celsius hai, jo lagbhag ${feels} degree jaisa mehsus ho raha hai. Mausam sthiti hai: ${condition}. Hawa ki raftaar ${wind} kilometer prati ghanta hai aur nami ${humidity}% hai. ${rainNote} ${advisory} WeatherGPT sunne ke liye dhanyavaad, aapka din shubh ho!`;
    }

    // English Script
    let rainNote = "Clear atmospheric conditions dominate the immediate horizon.";
    if (precipProb > 40) {
      rainNote = `Precipitation probability is elevated at ${precipProb}%. Keeping an umbrella handy is strongly advised.`;
    } else if (condition.toLowerCase().includes("rain") || condition.toLowerCase().includes("drizzle")) {
      rainNote = "Active rainfall observed across local sectors. Expect dampened road surfaces.";
    }

    let advisory = "Overall environmental indices are optimal for routine operations.";
    if (uv >= 7) {
      advisory = "UV Radiation index is severe. Sunscreen and UV-protective eye-wear are recommended.";
    } else if (temp > 35) {
      advisory = "High thermal stress detected. Maintain adequate hydration.";
    } else if (temp < 10) {
      advisory = "Sub-seasonal low temperatures in effect. Thermal layering suggested.";
    }

    return `Good day. This is your automated WeatherGPT Meteorological Briefing for ${cityName}. Currently, the temperature stands at ${temp} degrees Celsius, with a heat index feeling like ${feels} degrees under ${condition} skies. Wind currents are measuring ${wind} kilometers per hour, alongside ${humidity}% relative humidity. ${rainNote} ${advisory} Stay informed and stay safe.`;
  };

  const script = generateScript(lang);

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setProgress(0);
  };

  const startAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    utteranceRef.current = utterance;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    if (lang === "hi") {
      const hindiVoice = voices.find(
        (v) => v.lang.startsWith("hi") || v.name.includes("India") || v.name.includes("Hindi")
      );
      if (hindiVoice) utterance.voice = hindiVoice;
      utterance.lang = "hi-IN";
      utterance.rate = 0.95;
    } else {
      const englishVoice = voices.find(
        (v) => v.name.includes("Natural") || v.name.includes("Google") || v.lang.startsWith("en")
      );
      if (englishVoice) utterance.voice = englishVoice;
      utterance.lang = "en-US";
      utterance.rate = 1.0;
    }

    utterance.pitch = 1.0;

    utterance.onboundary = (event) => {
      if (script.length > 0) {
        const pct = Math.min(100, Math.round((event.charIndex / script.length) * 100));
        setProgress(pct);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md wg-animate-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-2xl p-6 overflow-hidden flex flex-col gap-5 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.15)",
        }}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Radio size={20} className={isPlaying ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">AI Weather Anchor Briefing</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  LIVE AUDIO
                </span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                60-second synthesized meteorological broadcast for {location.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Equalizer Visualizer */}
        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] relative overflow-hidden">
          <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-xs mb-3">
            {[40, 65, 85, 30, 95, 75, 45, 90, 60, 100, 70, 50, 80, 35, 60].map((height, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all duration-150 ease-out"
                style={{
                  height: isPlaying ? `${Math.max(15, (height * (progress % 2 === 0 ? 0.9 : 1.1)))}%` : "15%",
                  background: isPlaying
                    ? "linear-gradient(to top, var(--color-cyan-500, #06b6d4), var(--color-blue-400, #60a5fa))"
                    : "var(--border-subtle)",
                  transform: isPlaying ? `scaleY(${1 + Math.sin((i + progress) * 0.5) * 0.3})` : "none",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
            <Sparkles size={12} className="text-cyan-400" />
            <span>{isPlaying ? "Broadcasting Neural Meteorological Audio..." : "Ready to Stream"}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Script Transcript Box */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">Broadcast Script</span>
            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
              <Languages size={12} className="ml-1 text-[var(--text-tertiary)]" />
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  setLang("en");
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  lang === "en"
                    ? "bg-cyan-500 text-black font-semibold shadow"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  setLang("hi");
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  lang === "hi"
                    ? "bg-cyan-500 text-black font-semibold shadow"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Hinglish
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed max-h-32 overflow-y-auto font-sans">
            &ldquo;{script}&rdquo;
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={stopAudio}
            className="wg-btn-ghost text-xs flex items-center gap-1.5 py-2 px-3 text-[var(--text-secondary)]"
            title="Reset Audio"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 transition active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause size={16} fill="black" />
                  <span>Pause Briefing</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="black" />
                  <span>Play Broadcast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
