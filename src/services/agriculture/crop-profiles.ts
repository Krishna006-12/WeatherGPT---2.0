/**
 * Crop Sensitivity Profiles for Agriculture Intelligence v1.
 *
 * NOTE ON METHODOLOGY:
 * These thresholds represent deterministic meteorological risk heuristics used by WeatherGPT
 * to assess weather-related stress on common crops. They are NOT official agronomic decrees
 * or direct field sensor measurements. They are evaluated strictly against verified atmospheric
 * observations and forecast parameters from the WeatherSnapshot contract.
 */

import type { CropType, CropProfile } from "@/types/agriculture";

export const CROP_PROFILES: Record<CropType, CropProfile> = {
  wheat: {
    crop: "wheat",
    displayName: "Wheat",
    temperature: {
      heatStressThresholdC: 32.0, // High temperatures above 32°C accelerate maturity and reduce grain yield
      extremeHeatThresholdC: 36.0, // Severe thermal stress
      coldChillingThresholdC: 4.0, // Chilling conditions
      frostThresholdC: 2.0, // Temperatures <= 2°C pose severe frost/freezing danger
    },
    precipitation: {
      moderate24hRainMm: 15.0, // Moderate rain sufficient to delay scheduled irrigation
      heavy24hRainMm: 30.0, // Heavy downpour increasing lodging risk or waterlogging
      excessive7dRainMm: 60.0, // Excessive weekly moisture
    },
    wind: {
      sprayingWindLimitKmh: 15.0, // Foliar/pesticide spraying generally inadvisable above 15 km/h due to drift
      lodgingWindRiskKmh: 35.0, // Strong gusts above 35 km/h risk mechanical lodging
    },
    humidity: {
      highHumidityThresholdPct: 80.0, // High relative humidity coupled with wet foliage favors fungal disease conditions
    },
    notes: "Rabi season cereal crop sensitive to unseasonal spring heat, frost, and high winds during later growth periods.",
  },

  rice: {
    crop: "rice",
    displayName: "Rice (Paddy)",
    temperature: {
      heatStressThresholdC: 35.0, // Extreme temperatures above 35°C during hot afternoons cause spikelet sterility
      extremeHeatThresholdC: 38.0, // Severe heat stress threshold
      coldChillingThresholdC: 18.0, // Temperatures below 18°C cause cold injury/chilling stress in paddy
      frostThresholdC: 10.0, // Temperatures <= 10°C severely impede paddy metabolic growth
    },
    precipitation: {
      moderate24hRainMm: 25.0, // Rice handles water well, moderate rainfall is typically accommodated
      heavy24hRainMm: 50.0, // Sudden downpours > 50 mm risk uncontrolled field flooding/submergence
      excessive7dRainMm: 120.0, // Cumulative excessive deluge
    },
    wind: {
      sprayingWindLimitKmh: 15.0, // Spraying drift threshold
      lodgingWindRiskKmh: 40.0, // Gusts above 40 km/h risk mechanical lodging
    },
    humidity: {
      highHumidityThresholdPct: 85.0, // Prolonged relative humidity >= 85% with overcast weather favors blast/blight favorable conditions
    },
    notes: "Kharif/wet-season crop with high water tolerance, but vulnerable to extreme heat during flowering, cold shock, and prolonged high-humidity disease windows.",
  },

  maize: {
    crop: "maize",
    displayName: "Maize (Corn)",
    temperature: {
      heatStressThresholdC: 34.0, // Heat above 34°C impairs pollen viability and tasseling
      extremeHeatThresholdC: 38.0, // Critical heat stress threshold
      coldChillingThresholdC: 10.0, // Temperatures below 10°C stunt vegetative growth
      frostThresholdC: 4.0, // Light frost / cold damage
    },
    precipitation: {
      moderate24hRainMm: 20.0, // Rain sufficient to pause irrigation
      heavy24hRainMm: 40.0, // Heavy rain risking waterlogging (maize roots are highly sensitive to standing water)
      excessive7dRainMm: 80.0, // Cumulative heavy rainfall
    },
    wind: {
      sprayingWindLimitKmh: 15.0, // Spraying drift cutoff
      lodgingWindRiskKmh: 35.0, // Tall stalks make maize susceptible to stem snapping and root lodging above 35 km/h
    },
    humidity: {
      highHumidityThresholdPct: 80.0, // High humidity favoring foliar pathogen weather
    },
    notes: "Vigorous cereal crop requiring well-drained soil; intolerant of standing water/waterlogging and high winds when stalks are tall.",
  },

  potato: {
    crop: "potato",
    displayName: "Potato",
    temperature: {
      heatStressThresholdC: 28.0, // Tuber bulking slows down drastically above 28°C
      extremeHeatThresholdC: 32.0, // Severe thermal inhibition of tuberization
      coldChillingThresholdC: 4.0, // Cold sensitivity
      frostThresholdC: 2.0, // Frost <= 2°C causes severe foliage freeze damage
    },
    precipitation: {
      moderate24hRainMm: 12.0, // Excess surface moisture can increase tuber decay risk
      heavy24hRainMm: 25.0, // Heavy rain halts digging/harvesting and promotes rot
      excessive7dRainMm: 50.0, // Saturated soil conditions
    },
    wind: {
      sprayingWindLimitKmh: 15.0, // Spraying cutoff
      lodgingWindRiskKmh: 30.0, // Canopy disturbance
    },
    humidity: {
      highHumidityThresholdPct: 85.0, // High humidity (>= 85%) combined with temperatures between 10°C and 22°C represents classical weather conditions conducive to late-blight development
    },
    notes: "Cool-season tuber crop highly susceptible to ground frost, excess waterlogging leading to rotting, and humid blight-favorable weather.",
  },

  mustard: {
    crop: "mustard",
    displayName: "Mustard",
    temperature: {
      heatStressThresholdC: 30.0, // Unseasonal high heat during pod filling reduces oil content and yield
      extremeHeatThresholdC: 34.0, // Severe heat stress
      coldChillingThresholdC: 5.0, // Cool conditions
      frostThresholdC: 2.0, // Ground frost <= 2°C severely damages flowers and pods
    },
    precipitation: {
      moderate24hRainMm: 10.0, // Light/moderate rainfall; standing water harms mustard taproots
      heavy24hRainMm: 20.0, // Heavy rain washes away pollen and causes root asphyxiation
      excessive7dRainMm: 40.0, // Cumulative moisture limit
    },
    wind: {
      sprayingWindLimitKmh: 12.0, // Delicate floral canopy requires low wind (< 12 km/h) for protective sprays
      lodgingWindRiskKmh: 28.0, // Slender stems risk lodging in gusty winds
    },
    humidity: {
      highHumidityThresholdPct: 75.0, // High humidity (> 75%) coupled with overcast weather creates favorable conditions for aphid multiplication and white rust
    },
    notes: "Oilseed crop sensitive to unseasonal rain during flowering, frost at pod setting, and overcast humid weather that promotes aphid risk.",
  },

  generic: {
    crop: "generic",
    displayName: "General Crop",
    temperature: {
      heatStressThresholdC: 35.0,
      extremeHeatThresholdC: 40.0,
      coldChillingThresholdC: 5.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 15.0,
      heavy24hRainMm: 30.0,
      excessive7dRainMm: 70.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Standard atmospheric risk heuristics for general agricultural crops and operations.",
  },
};

export function getCropProfile(crop?: CropType): CropProfile {
  if (!crop || !CROP_PROFILES[crop]) {
    return CROP_PROFILES.generic;
  }
  return CROP_PROFILES[crop];
}
