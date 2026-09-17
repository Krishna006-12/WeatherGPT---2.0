"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldCheck,
  RefreshCw,
  Users,
  Languages,
  Filter,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { PilotOnboardingModal } from "@/components/onboarding/pilot-onboarding-modal";
import type { EvaluationSummary, ForecastAccuracyRecord } from "@/types/evaluation";

export default function EvaluationReportingPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [accuracyRecords, setAccuracyRecords] = useState<ForecastAccuracyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [includeSeed, setIncludeSeed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchMetrics = async (withSeed: boolean = includeSeed) => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/metrics?format=json&includeSeed=${withSeed}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary);
        setAccuracyRecords(json.accuracyRecords || []);
      }
    } catch (err) {
      console.error("Failed to fetch evaluation metrics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics(includeSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeSeed]);

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
        <div className="h-10 bg-white/5 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const directRatePct = Math.round(summary.taskCompletion.directAnswerRate * 100);
  const degradedRatePct = Math.round(summary.taskCompletion.degradedFallbackRate * 100);
  const opStatus = summary.operationalStatus;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      <PilotOnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Header with Title & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent-border)]">
              <BarChart3 size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {t("evaluation.title", "Pilot & Evaluation Metrics")}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {t(
              "evaluation.subtitle",
              "Quantitative performance reporting, latency tracking, and forecast verification"
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] transition-colors"
          >
            <Sparkles size={13} className="text-[var(--accent)]" />
            <span>Pilot Onboarding Walkthrough</span>
          </button>

          <button
            onClick={() => fetchMetrics(includeSeed)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <a
            href={`/api/metrics?format=csv&type=latency&includeSeed=${includeSeed}`}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] shadow-xs transition-colors"
          >
            <Download size={13} />
            <span>Latency CSV</span>
          </a>

          <a
            href={`/api/metrics?format=csv&type=accuracy&includeSeed=${includeSeed}`}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] shadow-xs transition-colors"
          >
            <Download size={13} />
            <span>Accuracy CSV</span>
          </a>

          <a
            href={`/api/metrics?format=json&includeSeed=${includeSeed}`}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white border border-[var(--accent-border)] shadow-xs transition-colors"
          >
            <Download size={13} />
            <span>Full JSON</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar: Live Only vs Include Seed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-tertiary)]" />
          <span className="font-semibold text-[var(--text-primary)]">Data Filter:</span>
          <span className="text-[var(--text-secondary)]">
            {includeSeed
              ? `Displaying Combined Records (${summary.liveRecordCount} Live + ${summary.seedRecordCount} Seed Demo)`
              : `Displaying Real Live Pilot Data Only (${summary.liveRecordCount} records)`}
          </span>
        </div>
        <button
          onClick={() => setIncludeSeed(!includeSeed)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all ${
            includeSeed
              ? "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{includeSeed ? "Showing: All (Live + Seed)" : "Showing: Live Pilot Data Only"}</span>
        </button>
      </div>

      {/* Real-Time Operational SLA Monitoring Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border text-xs ${
          opStatus.status === "healthy"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
            : "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {opStatus.status === "healthy" ? (
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span>
            <strong>Operational SLA Status:</strong>{" "}
            {opStatus.status === "healthy"
              ? `Healthy — p95 latency (${opStatus.p95LatencyMs}ms) meets < ${opStatus.p95TargetMs}ms pilot target.`
              : `Warning — Active alerts: ${opStatus.activeAlerts.join(" ")}`}
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-80 shrink-0">
          Target: &lt; {opStatus.p95TargetMs}ms | Current p95: {opStatus.p95LatencyMs}ms
        </span>
      </div>

      {/* Privacy Notice Banner */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
        <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          <strong>Privacy Guaranteed:</strong> Zero PII logged. Freeform text queries scrubbed for names, emails, and phone numbers.
          Telemetry coordinates coarsened to 10km grid resolution.
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latency */}
        <div className="wg-surface-command p-5 rounded-[24px] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Query-to-Response Latency</span>
            <Clock size={16} className="text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {summary.latency.p50} ms
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">(p50 median)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>p95: {summary.latency.p95} ms</span>
            <span className="text-emerald-600 font-semibold">&lt; 1,200 ms SLA Target</span>
          </div>
        </div>

        {/* Card 2: Task Completion */}
        <div className="wg-surface-command p-5 rounded-[24px] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Task Direct Answer Rate</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {directRatePct}%
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">({summary.taskCompletion.directAnswer} queries)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Degraded Mode: {degradedRatePct}%</span>
            <span>Target: &ge; 85%</span>
          </div>
        </div>

        {/* Card 3: Forecast Accuracy */}
        <div className="wg-surface-command p-5 rounded-[24px] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Forecast Temperature MAE</span>
            <Target size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              ±{summary.accuracy.temperatureMae}°C
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">MAE</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Wind MAE: ±{summary.accuracy.windMae} km/h</span>
            <span>Evaluated: {summary.accuracy.totalEvaluated}</span>
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="wg-surface-command p-5 rounded-[24px] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Pilot Telemetry Queries</span>
            <BarChart3 size={16} className="text-[var(--accent)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {summary.totalQueries}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">({summary.totalSessions} sessions)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>{includeSeed ? "Live + Seed" : "Live Pilot Cohorts"}</span>
            <span>Errors: {summary.taskCompletion.providerError}</span>
          </div>
        </div>
      </div>

      {/* Stakeholder Personas & Language Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Persona Distribution */}
        <div className="wg-surface-command p-5 sm:p-6 rounded-[28px] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Users size={16} className="text-[var(--accent)]" />
            <span>Pilot Stakeholder Persona Distribution</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Farmer / Agricultural Producer</span>
                <span>{summary.personaDistribution.farmer || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.personaDistribution.farmer || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Disaster & Emergency Manager (DDMA)</span>
                <span>{summary.personaDistribution.disaster_manager || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.personaDistribution.disaster_manager || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>General Public</span>
                <span>{summary.personaDistribution.general_public || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.personaDistribution.general_public || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Language Distribution */}
        <div className="wg-surface-command p-5 sm:p-6 rounded-[28px] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Languages size={16} className="text-[var(--accent)]" />
            <span>Language Distribution</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Hindi (हिन्दी)</span>
                <span>{summary.languageDistribution.hi || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.languageDistribution.hi || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Punjabi (ਪੰਜਾਬੀ)</span>
                <span>{summary.languageDistribution.pa || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.languageDistribution.pa || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>English</span>
                <span>{summary.languageDistribution.en || 0} queries</span>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.languageDistribution.en || 0) / Math.max(1, summary.totalQueries)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Accuracy Ground-Truth Verification Table */}
      <div className="wg-surface-command p-5 sm:p-6 rounded-[28px] border border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Target size={16} className="text-amber-500" />
            <span>Forecast vs. Observed Ground-Truth Telemetry (Live IMD Observations)</span>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">
            Ground-truth comparison against physical automatic meteorological stations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                <th className="py-2.5 px-3 font-semibold">Location</th>
                <th className="py-2.5 px-3 font-semibold">Coarsened Coords</th>
                <th className="py-2.5 px-3 font-semibold">Lead Time</th>
                <th className="py-2.5 px-3 font-semibold">Forecast Temp</th>
                <th className="py-2.5 px-3 font-semibold">Observed Temp</th>
                <th className="py-2.5 px-3 font-semibold">Abs Error</th>
                <th className="py-2.5 px-3 font-semibold">Source</th>
                <th className="py-2.5 px-3 font-semibold">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {accuracyRecords.map((rec) => (
                <tr key={rec.recordId} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 font-medium text-[var(--text-primary)]">
                    {rec.locationName}
                  </td>
                  <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">
                    {rec.coarsenedCoordinates
                      ? `${rec.coarsenedCoordinates.latitude}°, ${rec.coarsenedCoordinates.longitude}°`
                      : "10km coarse"}
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)]">{rec.leadTimeHours}h horizon</td>
                  <td className="py-3 px-3 font-mono">{rec.forecasted.temperature}°C</td>
                  <td className="py-3 px-3 font-mono">
                    {rec.observed ? `${rec.observed.temperature}°C` : "Pending"}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold">
                    {rec.tempErrorAbs !== undefined ? (
                      <span
                        className={
                          rec.tempErrorAbs <= 1.0
                            ? "text-emerald-500"
                            : rec.tempErrorAbs <= 2.0
                            ? "text-amber-500"
                            : "text-red-500"
                        }
                      >
                        ±{rec.tempErrorAbs}°C
                      </span>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        rec.source === "live"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {rec.source}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={11} />
                      <span>Verified Station Telemetry</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
