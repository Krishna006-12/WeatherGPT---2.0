"use client";

import { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Car,
  Wind,
  Droplets,
  Eye,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  routeWeatherService,
  type RoutePlan,
} from "@/services/travel/route-weather-service";

const POPULAR_CORRIDORS = [
  {
    name: "Delhi → Manali Highway",
    origin: { name: "Delhi", lat: 28.6139, lon: 77.209 },
    destination: { name: "Manali", lat: 32.2432, lon: 77.1892 },
    speed: 55,
  },
  {
    name: "Mumbai → Pune Expressway",
    origin: { name: "Mumbai", lat: 19.076, lon: 72.8777 },
    destination: { name: "Pune", lat: 18.5204, lon: 73.8567 },
    speed: 80,
  },
  {
    name: "Bengaluru → Mysore Corridor",
    origin: { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
    destination: { name: "Mysore", lat: 12.2958, lon: 76.6394 },
    speed: 75,
  },
  {
    name: "New York → Boston Interstate",
    origin: { name: "New York", lat: 40.7128, lon: -74.006 },
    destination: { name: "Boston", lat: 42.3601, lon: -71.0589 },
    speed: 90,
  },
];

const DEFAULT_CORRIDOR = POPULAR_CORRIDORS[0]!;

export default function RoutesPage() {
  const [selectedCorridor, setSelectedCorridor] = useState(DEFAULT_CORRIDOR);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [originInput, setOriginInput] = useState(DEFAULT_CORRIDOR.origin.name);
  const [destInput, setDestInput] = useState(DEFAULT_CORRIDOR.destination.name);
  const [speed, setSpeed] = useState(DEFAULT_CORRIDOR.speed);

  const fetchPlan = async (
    origName: string,
    oLat: number,
    oLon: number,
    dName: string,
    dLat: number,
    dLon: number,
    spd: number
  ) => {
    setLoading(true);
    try {
      const res = await routeWeatherService.planRoute(
        origName,
        oLat,
        oLon,
        dName,
        dLat,
        dLon,
        spd
      );
      setPlan(res);
    } catch (err) {
      console.error("Failed to plan route", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan(
      selectedCorridor.origin.name,
      selectedCorridor.origin.lat,
      selectedCorridor.origin.lon,
      selectedCorridor.destination.name,
      selectedCorridor.destination.lat,
      selectedCorridor.destination.lon,
      selectedCorridor.speed
    );
  }, [selectedCorridor]);

  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Resolve origin
      const oRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          originInput
        )}&count=1`
      );
      const oData = await oRes.json();
      const originResult = oData.results?.[0];

      // Resolve destination
      const dRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          destInput
        )}&count=1`
      );
      const dData = await dRes.json();
      const destResult = dData.results?.[0];

      if (!originResult || !destResult) {
        alert("Could not locate one or both cities. Please verify city names.");
        setLoading(false);
        return;
      }

      await fetchPlan(
        originResult.name,
        originResult.latitude,
        originResult.longitude,
        destResult.name,
        destResult.latitude,
        destResult.longitude,
        speed
      );
    } catch (err) {
      alert("Error resolving corridor locations.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Travel &amp; Route Weather Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              NEW
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Predictive meteorological conditions along transit corridors with multi-checkpoint hazard detection.
          </p>
        </div>

        {/* Preset Corridors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {POPULAR_CORRIDORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setSelectedCorridor(c);
                setOriginInput(c.origin.name);
                setDestInput(c.destination.name);
                setSpeed(c.speed);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                selectedCorridor.name === c.name
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Route Query Bar */}
      <form
        onSubmit={handleCustomSearch}
        className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">
            ORIGIN CITY / POINT
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="e.g. Delhi, London, Mumbai"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">
            DESTINATION CITY
          </label>
          <div className="relative">
            <Navigation size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
            <input
              type="text"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="e.g. Manali, Paris, Pune"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">
            AVG TRAVEL SPEED
          </label>
          <div className="relative">
            <Car size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition"
            >
              <option value={45}>Mountainous / Heavy Traffic (45 km/h)</option>
              <option value={70}>Standard Highway (70 km/h)</option>
              <option value={95}>Expressway / High Speed (95 km/h)</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} fill="black" />
            )}
            <span>Calculate Route Weather</span>
          </button>
        </div>
      </form>

      {/* Main Route Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface-1)] rounded-2xl border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <RefreshCw size={32} className="animate-spin text-cyan-400 mb-3" />
          <p className="font-semibold text-sm">Synthesizing corridor waypoint forecasts...</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Querying Open-Meteo multi-point atmospheric feeds &amp; hazard indices
          </p>
        </div>
      ) : plan ? (
        <div className="space-y-6">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Safety Score Card */}
            <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Corridor Safety Index
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    {plan.safetyScore}/100
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      plan.overallRiskLevel === "low"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : plan.overallRiskLevel === "moderate"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {plan.overallRiskLevel.toUpperCase()} RISK
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                <ShieldCheck size={28} />
              </div>
            </div>

            {/* Travel Distance & ETA */}
            <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Distance &amp; Duration
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {plan.totalDistanceKm} km
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    (~{plan.estimatedTravelTimeHours} hrs transit)
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                <Clock size={28} />
              </div>
            </div>

            {/* Departure Recommendation */}
            <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Transit Advisory
              </span>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-medium">
                {plan.departureAdvice}
              </p>
            </div>
          </div>

          {/* Sequential Waypoint Corridor Timeline */}
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Waypoint Meteorological Trajectory
                </h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Estimated weather conditions at arrival time along sequential route coordinates
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Safe
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Caution
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Danger
                </span>
              </div>
            </div>

            <div className="relative border-l-2 border-[var(--border-subtle)] ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-8">
              {plan.waypoints.map((wp, idx) => (
                <div key={idx} className="relative group">
                  {/* Waypoint Dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-[var(--surface-1)] transition-transform group-hover:scale-125 ${
                      wp.weather.hazardLevel === "danger"
                        ? "bg-rose-500 shadow-md shadow-rose-500/50"
                        : wp.weather.hazardLevel === "caution"
                        ? "bg-amber-400 shadow-md shadow-amber-400/50"
                        : "bg-emerald-400 shadow-md shadow-emerald-400/50"
                    }`}
                  />

                  {/* Waypoint Content Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:border-cyan-500/40 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                            {wp.name}
                          </h4>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-tertiary)]">
                            +{wp.estimatedArrivalHour}h ETA • {wp.distanceKm} km
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">
                          Coord: {wp.latitude.toFixed(2)}°, {wp.longitude.toFixed(2)}°
                        </p>
                      </div>

                      {wp.weather.hazardReason && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{wp.weather.hazardReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Meteorological Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[var(--text-tertiary)] block text-[11px]">Atmosphere</span>
                        <span className="font-bold text-[var(--text-primary)] text-sm">
                          {wp.weather.temperature}°C
                        </span>
                        <span className="text-[var(--text-secondary)] text-[11px] ml-1">
                          ({wp.weather.condition})
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--text-tertiary)] block text-[11px]">Precipitation</span>
                        <div className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                          <Droplets size={13} className="text-cyan-400" />
                          <span>{wp.weather.precipitationProbability}% chance</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[var(--text-tertiary)] block text-[11px]">Wind Surface</span>
                        <div className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                          <Wind size={13} className="text-blue-400" />
                          <span>{wp.weather.windSpeed} km/h</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[var(--text-tertiary)] block text-[11px]">Visibility</span>
                        <div className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                          <Eye size={13} className="text-emerald-400" />
                          <span>{wp.weather.visibilityKm} km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
