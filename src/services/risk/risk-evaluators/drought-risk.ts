/**
 * Deterministic Drought & Aridity Risk Evaluator.
 *
 * Evaluates multi-day precipitation deficit, cumulative evaporation stress,
 * and high thermal indices against deterministic meteorological thresholds.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity } from "@/types/risk";

export function evaluateDroughtRisk(
  weather: WeatherSnapshot,
  _targetDay?: DailyWeather,
  timeWindow: string = "Cumulative 7-Day Window"
): RiskAssessment {
  const current = weather.current;
  const daily = weather.daily || [];

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;
  const evidence: RiskEvidenceItem[] = [];

  // Calculate 7-day cumulative precipitation and temperature maximum
  let sevenDayPrecipMm = 0;
  let maxForecastTempC = current?.temperature ?? 25;
  const daysEvaluated = Math.min(7, daily.length);

  for (let i = 0; i < daysEvaluated; i++) {
    const day = daily[i]!;
    sevenDayPrecipMm += day.precipitationSum ?? 0;
    if (day.temperatureHigh !== undefined && day.temperatureHigh > maxForecastTempC) {
      maxForecastTempC = day.temperatureHigh;
    }
  }

  const currentHumidity = current?.humidity ?? 50;

  evidence.push({
    metric: "seven_day_precipitation_sum",
    value: Number(sevenDayPrecipMm.toFixed(1)),
    unit: "mm",
    source: primaryProvider,
    timestamp,
  });

  evidence.push({
    metric: "max_forecast_temperature",
    value: maxForecastTempC,
    unit: "°C",
    source: primaryProvider,
    timestamp,
  });

  evidence.push({
    metric: "current_relative_humidity",
    value: currentHumidity,
    unit: "%",
    source: primaryProvider,
    timestamp,
  });

  let severity: RiskSeverity = "low";
  let recommendation = "Soil moisture and precipitation balance are within normal ranges.";
  let reason = `7-day precipitation forecast (${sevenDayPrecipMm.toFixed(1)} mm) shows adequate moisture.`;

  if (sevenDayPrecipMm < 1.0 && maxForecastTempC >= 40.0 && currentHumidity < 28) {
    severity = "extreme";
    recommendation =
      "Critical aridity and meteorological drought conditions. High evaporative losses and depleted soil water. Implement emergency irrigation rationing and protect livestock from heat exhaustion.";
    reason = `Severe moisture deficit: 7-day rainfall < 1 mm (${sevenDayPrecipMm.toFixed(1)} mm) with peak heat ${maxForecastTempC}°C and low humidity ${currentHumidity}%.`;
  } else if (sevenDayPrecipMm < 3.0 && maxForecastTempC >= 36.0 && currentHumidity < 38) {
    severity = "high";
    recommendation =
      "Elevated drought stress. Evapotranspiration significantly exceeds rainfall. Conserve irrigation reserves, mulch exposed beds, and avoid nitrogen top-dressing.";
    reason = `Acute dry spell: 7-day rainfall < 3 mm (${sevenDayPrecipMm.toFixed(1)} mm) under sustained temperatures above 36°C.`;
  } else if (sevenDayPrecipMm < 8.0 && maxForecastTempC >= 33.0) {
    severity = "moderate";
    recommendation =
      "Prolonged dry window forecast. Plan supplemental irrigation cycles and monitor soil moisture retention.";
    reason = `Extended dry conditions: 7-day rainfall < 8 mm (${sevenDayPrecipMm.toFixed(1)} mm) with elevated daytime temperatures.`;
  }

  return {
    type: "drought",
    severity,
    confidence: "high",
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
