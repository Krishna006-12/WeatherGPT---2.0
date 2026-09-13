/**
 * Evapotranspiration (ET₀) and Irrigation Sizing Engine.
 *
 * Implements the FAO-56 Hargreaves-Samani / Penman-Monteith approximation
 * to calculate daily reference evapotranspiration (ET₀), crop evapotranspiration (ETc),
 * and net irrigation deficit from atmospheric inputs.
 */

import type { CropType, EvapotranspirationEstimate } from "@/types/agriculture";
import type { WeatherSnapshot } from "@/types/weather";
import { getCropProfile } from "./crop-profiles";

/**
 * Calculates daily ET₀, crop water demand, and net irrigation deficit.
 */
export function calculateEvapotranspiration(
  crop: CropType,
  weather: WeatherSnapshot
): EvapotranspirationEstimate {
  const currentTemp = weather.current.temperature;
  const tMax = weather.daily[0]?.temperatureHigh ?? currentTemp + 4;
  const tMin = weather.daily[0]?.temperatureLow ?? currentTemp - 4;
  const rain24h = weather.daily[0]?.precipitationSum ?? 0;

  const tMean = (tMax + tMin) / 2;
  const tempRange = Math.max(1, tMax - tMin);

  // Extraterrestrial radiation Ra estimate based on latitude (typical ~14 mm/day equivalent in India)
  const lat = Math.abs(weather.location.coordinates.latitude);
  const raEstimate = 14.5 - (lat / 90) * 3.5;

  // FAO-56 Hargreaves-Samani Equation:
  // ET0 = 0.0023 * (Tmean + 17.8) * (Tmax - Tmin)^0.5 * Ra
  const rawEt0 = 0.0023 * (tMean + 17.8) * Math.sqrt(tempRange) * raEstimate;
  const et0MmDay = Math.max(1.0, Math.min(10.0, Number(rawEt0.toFixed(2))));

  // Crop coefficient Kc (mid-season typical stage)
  const profile = getCropProfile(crop);
  const kc = profile.et0CropCoefficient?.kcMid ?? 1.0;

  // Crop Evapotranspiration: ETc = Kc * ET0
  const cropEtMmDay = Number((et0MmDay * kc).toFixed(2));

  // Net irrigation deficit after deducting 24h rainfall
  const deficitMm = Math.max(0, Number((cropEtMmDay - rain24h).toFixed(2)));

  // 1 mm water depth = 1 Liter per square meter (10,000 Liters / hectare)
  const recommendedLitersPerM2 = deficitMm;

  return {
    et0MmDay,
    cropEtMmDay,
    cropCoefficientKc: kc,
    rainfall24hMm: rain24h,
    irrigationDeficitMm: deficitMm,
    recommendedWaterLitersPerM2: recommendedLitersPerM2,
    method: "FAO-56 Hargreaves-Samani Temperature-Radiation Reference",
  };
}
