"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherSnapshot } from "@/types/weather";
import type { NormalizedLocation } from "@/services/location/location-service";

interface WeatherDisplayProps {
  weather?: WeatherSnapshot;
  location?: NormalizedLocation | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
}

export function WeatherDisplay({
  weather,
  location,
  isLoading,
  isError,
  error,
}: WeatherDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <div className="font-semibold">Weather Engine Error</div>
        <div className="mt-1 text-sm">{error?.message || "Failed to load weather data."}</div>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  const { current, hourly, daily, provenance } = weather;
  const prov = provenance[0];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Current Conditions Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl font-bold">
                {location?.displayName || weather.location.name}
              </CardTitle>
              <div className="mt-1 text-xs text-neutral-500">
                Observed: {current.observedAt} ({weather.location.timezone})
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {current.description || current.condition}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4">
            <div>
              <div className="text-xs text-neutral-500">Temperature</div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {current.temperature.toFixed(1)}°C
              </div>
              <div className="text-xs text-neutral-500">
                Feels like {current.feelsLike.toFixed(1)}°C
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Humidity / Precip</div>
              <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {current.humidity}%
              </div>
              <div className="text-xs text-neutral-500">
                Precip: {current.precipitation} mm
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Wind</div>
              <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {current.windSpeed} km/h
              </div>
              <div className="text-xs text-neutral-500">
                Dir: {current.windDirection}° {current.windGust ? `• Gusts: ${current.windGust} km/h` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Pressure / Cloud</div>
              <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {current.pressure} hPa
              </div>
              <div className="text-xs text-neutral-500">
                Cloud cover: {current.cloudCover}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Hourly Preview (Next 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {hourly.slice(0, 24).map((h) => {
              const hourLabel = h.time.split("T")[1] || h.time;
              return (
                <div
                  key={h.time}
                  className="flex min-w-[70px] flex-col items-center justify-between rounded-md border border-neutral-100 p-2 text-center text-xs dark:border-neutral-800"
                >
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">{hourLabel}</span>
                  <span className="my-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {Math.round(h.temperature)}°C
                  </span>
                  <span className="text-[10px] text-neutral-500">{h.description || h.condition}</span>
                  {h.precipitationProbability > 0 && (
                    <span className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
                      {h.precipitationProbability}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily 7-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">7-Day Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {daily.map((d) => (
              <div key={d.date} className="flex items-center justify-between py-2">
                <div className="w-24 font-medium text-neutral-700 dark:text-neutral-300">{d.date}</div>
                <div className="flex-1 px-2 text-xs text-neutral-500">
                  {d.description || d.condition}
                  {d.precipitationSum > 0 ? ` • ${d.precipitationSum} mm` : ""}
                </div>
                <div className="flex items-center gap-3 text-right">
                  {d.precipitationProbability > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {d.precipitationProbability}%
                    </span>
                  )}
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {Math.round(d.temperatureHigh)}°
                  </span>
                  <span className="text-neutral-400">{Math.round(d.temperatureLow)}°</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provenance Footer */}
      {prov && (
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-500 dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              Source: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{prov.provider}</span> • Fetched: {new Date(prov.retrievedAt).toLocaleTimeString()}
            </div>
            <div>
              Coordinates: {weather.location.coordinates.latitude.toFixed(4)}, {weather.location.coordinates.longitude.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
