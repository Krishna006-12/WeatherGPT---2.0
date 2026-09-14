"use client";

import { useState } from "react";
import { useLocation } from "@/context/location-context";
import { useWeather } from "@/hooks/use-weather";
import { useHistoricalWeather } from "@/hooks/use-historical-weather";
import { HourlyForecastCard } from "@/components/weather/hourly-forecast-card";
import { SunriseCard } from "@/components/weather/sunrise-card";
import { SevenDayForecastCard } from "@/components/weather/seven-day-forecast-card";
import { useLanguage } from "@/context/language-context";
import {
  History as HistoryIcon,
  CheckCircle2,
  Calendar,
  Thermometer,
  CloudRain,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

type HistoricalWindow = "1_year_ago" | "3_years_ago" | "5_years_ago" | "10_years_ago";

export default function HistoryPage() {
  const { selectedLocation } = useLocation();
  const { t } = useLanguage();
  const [selectedWindow, setSelectedWindow] = useState<HistoricalWindow>("1_year_ago");

  const {
    data: weather,
    isLoading: isWeatherLoading,
  } = useWeather({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
    timezone: selectedLocation?.timezone,
    enabled: selectedLocation !== null,
  });

  // Compute dates for historical archive comparison
  const now = new Date();
  const yearsBack = selectedWindow === "10_years_ago" ? 10 : selectedWindow === "5_years_ago" ? 5 : selectedWindow === "3_years_ago" ? 3 : 1;
  const targetYear = now.getFullYear() - yearsBack;

  // 7-day window in the target year matching current month & day
  const sMonth = String(now.getMonth() + 1).padStart(2, "0");
  const sDay = String(now.getDate()).padStart(2, "0");
  const startDate = `${targetYear}-${sMonth}-${sDay}`;

  const endDateObj = new Date(now.getTime() - yearsBack * 365 * 24 * 3600 * 1000 + 7 * 24 * 3600 * 1000);
  const eMonth = String(endDateObj.getMonth() + 1).padStart(2, "0");
  const eDay = String(endDateObj.getDate()).padStart(2, "0");
  const endDate = `${endDateObj.getFullYear()}-${eMonth}-${eDay}`;

  const {
    data: archiveReport,
    isLoading: isArchiveLoading,
  } = useHistoricalWeather({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
    startDate,
    endDate,
    timezone: selectedLocation?.timezone,
    enabled: selectedLocation !== null,
  });

  if (!selectedLocation) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">
            {t("history.title", "Meteorological Timeline")}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Search for a location above to view hourly progression and forecast timelines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1 flex items-center gap-2.5">
            <HistoryIcon className="text-cyan-400" size={24} />
            {t("history.title", "Meteorological Timeline & Climate Archive")}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("history.subtitle", "Chronological atmospheric progression, solar interval cycles, and ERA5 historical reanalysis")} for {selectedLocation.displayName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-xs font-medium text-cyan-600 dark:text-cyan-400">
            <CheckCircle2 size={13} />
            <span>{t("history.open_meteo_badge", "Open-Meteo Grounded")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/25 rounded-full text-xs font-medium text-purple-600 dark:text-purple-300">
            <Activity size={13} />
            <span>{t("history.era5_badge", "ERA5 1940–Present")}</span>
          </div>
        </div>
      </div>

      {/* Section 1: ERA5 Historical Climate Archive & Anomaly Center */}
      <section className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-base">
              <Calendar size={18} className="text-purple-400" />
              {t("history.era5_title", "Historical Climate Reanalysis & Anomaly Comparison")}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {t("history.era5_desc", "Comparing current atmospheric state with verified ERA5 historical records for this exact calendar week.")}
            </p>
          </div>

          {/* Time Machine Selector */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setSelectedWindow("1_year_ago")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedWindow === "1_year_ago"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-300"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("history.1_year", "1 Year Ago")} ({now.getFullYear() - 1})
            </button>
            <button
              type="button"
              onClick={() => setSelectedWindow("3_years_ago")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedWindow === "3_years_ago"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-300"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("history.3_years", "3 Years Ago")} ({now.getFullYear() - 3})
            </button>
            <button
              type="button"
              onClick={() => setSelectedWindow("5_years_ago")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedWindow === "5_years_ago"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-300"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("history.5_years", "5 Years Ago")} ({now.getFullYear() - 5})
            </button>
            <button
              type="button"
              onClick={() => setSelectedWindow("10_years_ago")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedWindow === "10_years_ago"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-300"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("history.10_years", "10 Years Ago")} ({now.getFullYear() - 10})
            </button>
          </div>
        </div>

        {/* Anomaly Metrics Cards */}
        {isArchiveLoading || !archiveReport ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="wg-skeleton h-24 rounded-xl" />
            <div className="wg-skeleton h-24 rounded-xl" />
            <div className="wg-skeleton h-24 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Thermal Metric */}
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Thermometer size={14} className="text-amber-400" />
                    {t("history.temp", "Historical Temperature")}
                  </span>
                  <span className="font-mono text-[11px]">{startDate}</span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">
                  {archiveReport.summary.averageMaxTemp}°C{" "}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    {t("history.avg_max", "avg max")}
                  </span>
                </div>
                <div className="text-[11px] mt-1.5 flex items-center gap-1">
                  {archiveReport.climatologicalAnomaly.temperatureAnomalyC >= 0 ? (
                    <span className="text-amber-500 dark:text-amber-400 flex items-center">
                      <ArrowUpRight size={12} />
                      +{archiveReport.climatologicalAnomaly.temperatureAnomalyC}°C
                    </span>
                  ) : (
                    <span className="text-cyan-500 dark:text-cyan-400 flex items-center">
                      <ArrowDownRight size={12} />
                      {archiveReport.climatologicalAnomaly.temperatureAnomalyC}°C
                    </span>
                  )}
                  <span className="text-[var(--text-tertiary)]">
                    {t("history.baseline", "vs 1991–2020 ERA5 baseline")}
                  </span>
                </div>
              </div>

              {/* Moisture & Rain Metric */}
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CloudRain size={14} className="text-blue-400" />
                    {t("history.precip", "Historical Precipitation")}
                  </span>
                  <span className="text-[var(--text-tertiary)] text-[11px]">
                    {archiveReport.summary.daysWithRain} {t("history.rain_days", "rain days")}
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">
                  {archiveReport.summary.totalPrecipitationMm} mm{" "}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    {t("history.total_7d", "total 7d")}
                  </span>
                </div>
                <div className="text-[11px] mt-1.5 text-[var(--text-tertiary)]">
                  {archiveReport.climatologicalAnomaly.precipitationAnomalyPct >= 0 ? "+" : ""}
                  {archiveReport.climatologicalAnomaly.precipitationAnomalyPct}% {t("history.relative_normal", "relative to normal")}
                </div>
              </div>

              {/* Climate Characterization */}
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col justify-between">
                <div className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Activity size={14} className="text-purple-400" />
                  {t("history.characterization", "ERA5 Anomaly Characterization")}
                </div>
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-300 my-1">
                  {archiveReport.climatologicalAnomaly.characterization}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  {t("history.ecmwf_source", "Source: ECMWF Copernicus Climate Change Service (C3S)")}
                </div>
              </div>
            </div>

            {/* Historical Daily Timeline Mini-strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1 wg-hide-scroll">
              {archiveReport.records.map((r) => (
                <div
                  key={r.date}
                  className="min-w-[90px] p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-center text-xs flex-shrink-0"
                >
                  <div className="text-[10px] font-mono text-[var(--text-tertiary)] mb-1">
                    {r.date.slice(5)}
                  </div>
                  <div className="font-bold text-[var(--text-primary)]">
                    {Math.round(r.temperatureMax)}° / {Math.round(r.temperatureMin)}°
                  </div>
                  <div className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                    {r.precipitationSum > 0 ? `${r.precipitationSum} mm` : t("history.dry", "Dry")}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Section 2: Live Hourly and Solar Cycles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HourlyForecastCard weather={weather} isLoading={isWeatherLoading} />
        <SunriseCard weather={weather} isLoading={isWeatherLoading} />
      </div>

      {/* Section 3: Multi-Day Progression */}
      <SevenDayForecastCard weather={weather} isLoading={isWeatherLoading} />
    </div>
  );
}
