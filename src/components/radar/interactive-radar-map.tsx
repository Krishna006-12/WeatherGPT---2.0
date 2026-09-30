"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLocation } from "@/services/location/location-service";
import { Play, Pause, RotateCcw, Layers, MapPin, Sparkles } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface InteractiveRadarMapProps {
  location?: NormalizedLocation | null;
}

interface RadarFrame {
  time: number;
  path: string;
}

export function InteractiveRadarMap({ location }: InteractiveRadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const radarLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [radarHost, setRadarHost] = useState("https://tilecache.rainviewer.com");
  const [loading, setLoading] = useState(true);

  const lat = location?.latitude ?? 28.6139;
  const lon = location?.longitude ?? 77.209;

  // 1. Fetch live radar frames from RainViewer API
  useEffect(() => {
    async function fetchRadarData() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();
        if (data && data.radar) {
          setRadarHost(data.host || "https://tilecache.rainviewer.com");
          const allFrames: RadarFrame[] = [
            ...(data.radar.past || []),
            ...(data.radar.nowcast || []),
          ];
          setFrames(allFrames);
          setCurrentFrameIndex(Math.max(0, (data.radar.past?.length || 1) - 1));
        }
      } catch (err) {
        console.error("Failed to load RainViewer radar data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRadarData();
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lon],
          zoom: 7,
          zoomControl: false,
        });

        // High quality CartoDB Dark Matter tiles for sleek cyber/dark aesthetic
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
            maxZoom: 18,
          }
        ).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Marker for location
        const customIcon = L.divIcon({
          className: "custom-radar-pin",
          html: `<div style="background-color: #06b6d4; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #06b6d4;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
        marker.bindPopup(`<b>${location?.name || "Target Location"}</b>`).openPopup();

        markerRef.current = marker;
        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setView([lat, lon], 7);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          markerRef.current.setPopupContent(`<b>${location?.name || "Target Location"}</b>`);
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon, location?.name]);

  // 3. Update Radar Overlay TileLayer when frame changes
  useEffect(() => {
    if (!mapInstanceRef.current || frames.length === 0) return;

    async function updateRadar() {
      const L = await import("leaflet");
      const currentFrame = frames[currentFrameIndex];
      if (!currentFrame) return;

      const tileUrl = `${radarHost}${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

      if (radarLayerRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current);
      }

      const radarTileLayer = L.tileLayer(tileUrl, {
        opacity: 0.75,
        zIndex: 500,
        attribution: '&copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
      });

      radarTileLayer.addTo(mapInstanceRef.current);
      radarLayerRef.current = radarTileLayer;
    }

    updateRadar();
  }, [currentFrameIndex, frames, radarHost]);

  // 4. Animation loop for radar playback
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, 850);

    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  const activeTimestamp = frames[currentFrameIndex]?.time
    ? new Date(frames[currentFrameIndex].time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl bg-[var(--surface-base)] flex flex-col">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border-subtle)] shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                Global High-Res Precipitation Radar
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <MapPin size={11} className="text-cyan-400" />
              Centered on {location?.name || "Global Radar Coordinates"}
            </p>
          </div>
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs bg-cyan-500 hover:bg-cyan-400 text-black transition active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause size={14} fill="black" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} fill="black" />
                <span>Play Loop</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)] text-[10px]">TIME:</span>
            <span className="font-bold text-cyan-400">{activeTimestamp}</span>
          </div>
        </div>
      </div>

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Bottom Floating Timeline Scrubber & Color Legend */}
      <div className="absolute bottom-4 left-4 right-16 z-[1000] p-3 rounded-xl bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border-subtle)] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">
            Radar Frames:
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={currentFrameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrameIndex(Number(e.target.value));
            }}
            className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-[var(--surface-base)] rounded-lg"
          />
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            {currentFrameIndex + 1}/{frames.length || 1}
          </span>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
          <span>Drizzle</span>
          <div className="w-20 sm:w-28 h-2 rounded-full bg-gradient-to-r from-blue-300 via-green-400 via-yellow-400 to-red-600 border border-white/20" />
          <span>Heavy Hail</span>
        </div>
      </div>
    </div>
  );
}
