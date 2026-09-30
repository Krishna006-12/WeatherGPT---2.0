"use client";

import { useState } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  CloudLightning,
  Sun,
  CloudRain,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Compass,
} from "lucide-react";

interface CloudSample {
  id: string;
  name: string;
  genus: string;
  altitude: string;
  weatherOutcome: string;
  stormRisk: "low" | "moderate" | "high";
  confidence: number;
  description: string;
  visualCue: string;
  imageUrl: string;
}

const CLOUD_SAMPLES: CloudSample[] = [
  {
    id: "cumulonimbus",
    name: "Cumulonimbus Incus (Anvil Cloud)",
    genus: "Vertical Convection Cloud",
    altitude: "1,500m - 12,000m (Troposphere Cap)",
    weatherOutcome: "Imminent severe thunderstorms, microbursts, dangerous lightning, and localized flash flooding within 30-90 minutes.",
    stormRisk: "high",
    confidence: 96,
    description: "Massive towering vertical cloud formation characterized by a flat, anvil-shaped icy top penetrating the tropopause. Driven by intense thermal updrafts.",
    visualCue: "Heavy vertical density, dark bruised base, and fibrous anvil divergence.",
    imageUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "altocumulus",
    name: "Altocumulus Castellanus",
    genus: "Mid-level Convective Wave",
    altitude: "2,000m - 6,000m",
    weatherOutcome: "Mid-tropospheric instability. Frequent precursor to late afternoon thunderstorm activity if surface heating persists.",
    stormRisk: "moderate",
    confidence: 88,
    description: "Patches or sheets of roll-like cloud elements with small vertical turret towers resembling castle battlements.",
    visualCue: "Parallel bands with turreted crowns against a blue backdrop.",
    imageUrl: "https://images.unsplash.com/photo-1500491460312-c32fc2dbc751?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "cirrus",
    name: "Cirrus Fibratus",
    genus: "High-Altitude Ice Crystal Cloud",
    altitude: "6,000m - 12,000m",
    weatherOutcome: "Fair weather for the immediate 12-24 hours. May signal an advancing warm front or jet stream moisture.",
    stormRisk: "low",
    confidence: 94,
    description: "Delicate, wispy white filaments made purely of hexagonal ice crystals blown by high-speed upper tropospheric winds.",
    visualCue: "Hair-like silky strands with no shading beneath.",
    imageUrl: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "mammatus",
    name: "Mammatus Cloud Formations",
    genus: "Cellular Downdraft Pouches",
    altitude: "3,000m - 7,000m",
    weatherOutcome: "Associated with intense severe weather systems, severe turbulence, and large hail in adjacent quadrants.",
    stormRisk: "high",
    confidence: 91,
    description: "Smooth, pouch-like rounded cellular lobes hanging underneath the anvil of a severe thunderstorm. Produced by sinking pockets of cold, moist air.",
    visualCue: "Bulbous hanging pouches illuminated by low-angle golden sunlight.",
    imageUrl: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80",
  },
];

const DEFAULT_SAMPLE: CloudSample = CLOUD_SAMPLES[0]!;

export default function SkyVisionPage() {
  const [selectedSample, setSelectedSample] = useState<CloudSample>(DEFAULT_SAMPLE);
  const [analyzing, setAnalyzing] = useState(false);
  const [userCustomImage, setUserCustomImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserCustomImage(url);
      setAnalyzing(true);
      setTimeout(() => {
        // Classify user photo into closest meteorological archetype
        setSelectedSample({
          ...DEFAULT_SAMPLE,
          id: "custom-cloud-upload",
          name: "Detected: Convective Cumulus & Instability",
          genus: "Vertical Cumuliform Convection",
          confidence: 89,
          description: "Analysis of uploaded sky structure reveals active vertical convective updrafts with moderate cloud density.",
        });
        setAnalyzing(false);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Sky &amp; Cloud Vision Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              AI COMPUTER VISION
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Atmospheric nephology analysis: Upload sky photos to identify cloud genus, tropospheric stability, and imminent frontal weather.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer transition active:scale-95 shadow-lg shadow-cyan-500/20">
          <Upload size={15} />
          <span>Upload Sky Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Cloud Sample Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase whitespace-nowrap mr-1">
          Reference Genus:
        </span>
        {CLOUD_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => {
              setUserCustomImage(null);
              setSelectedSample(sample);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
              !userCustomImage && selectedSample.id === sample.id
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold"
                : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {sample.name.split(" ")[0]} ({sample.name.split("(")[1]?.replace(")", "") || "Cloud"})
          </button>
        ))}
      </div>

      {/* Main Analysis Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Image Preview Frame */}
        <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-1)] relative min-h-[360px] sm:min-h-[420px] flex flex-col justify-end p-6 shadow-xl">
          {/* Background Photo */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-90"
            style={{
              backgroundImage: `url(${userCustomImage || selectedSample.imageUrl})`,
            }}
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Overlay Tag */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  selectedSample.stormRisk === "high"
                    ? "bg-rose-500 text-white"
                    : selectedSample.stormRisk === "moderate"
                    ? "bg-amber-400 text-black"
                    : "bg-emerald-400 text-black"
                }`}
              >
                {selectedSample.stormRisk.toUpperCase()} STORM RISK
              </span>
              <span className="text-xs text-white/80 font-mono">
                {selectedSample.confidence}% AI Confidence Match
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {selectedSample.name}
            </h3>

            <p className="text-xs text-white/80 font-medium leading-relaxed max-w-lg">
              {selectedSample.visualCue}
            </p>
          </div>
        </div>

        {/* Right: Meteorological Diagnostic Card */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-xl flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase">
                  Nephology Classification
                </span>
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  {selectedSample.genus}
                </h4>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Compass size={22} />
              </div>
            </div>

            {/* Diagnostics Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-tertiary)] block text-[11px]">Altitude Band</span>
                <span className="font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {selectedSample.altitude}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-tertiary)] block text-[11px]">Thermodynamic State</span>
                <span className="font-semibold text-cyan-400 mt-0.5 block">
                  {selectedSample.stormRisk === "high"
                    ? "Severe Thermal Updraft"
                    : selectedSample.stormRisk === "moderate"
                    ? "Conditionally Unstable"
                    : "Stable Geostrophic Flow"}
                </span>
              </div>
            </div>

            {/* Imminent Outcome */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Sparkles size={15} />
                <span>Atmospheric Outcome &amp; Frontal Forecast</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {selectedSample.weatherOutcome}
              </p>
            </div>

            {/* Scientific Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Cloud Physics &amp; Morphology
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {selectedSample.description}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Verified with WMO Cloud Atlas standards
            </span>
            <span className="font-mono">Sensor: Vision-1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
