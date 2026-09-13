/**
 * Crop Sensitivity Profiles for Agriculture Intelligence.
 *
 * Grounded in empirical agronomic parameters from the Indian Council of Agricultural
 * Research (ICAR) institute monographs and FAO-56 irrigation and drainage papers.
 * Evaluated strictly against verified atmospheric observations and forecast parameters.
 */

import type { CropType, CropProfile } from "@/types/agriculture";

export const CROP_PROFILES: Record<CropType, CropProfile> = {
  wheat: {
    crop: "wheat",
    displayName: "Wheat",
    temperature: {
      heatStressThresholdC: 32.0,
      extremeHeatThresholdC: 36.0,
      coldChillingThresholdC: 4.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 15.0,
      heavy24hRainMm: 30.0,
      excessive7dRainMm: 60.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Rabi season cereal crop sensitive to terminal heat, yellow rust, and lodging during grain filling.",
    icarCitation: "ICAR-IIWBR Karnal: Wheat Crop Management Bulletin 2024",
    et0CropCoefficient: { kcInitial: 0.3, kcMid: 1.15, kcEnd: 0.25 },
  },

  rice: {
    crop: "rice",
    displayName: "Rice",
    temperature: {
      heatStressThresholdC: 35.0,
      extremeHeatThresholdC: 38.0,
      coldChillingThresholdC: 18.0,
      frostThresholdC: 10.0,
    },
    precipitation: {
      moderate24hRainMm: 25.0,
      heavy24hRainMm: 50.0,
      excessive7dRainMm: 120.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 40.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "Kharif staple requiring high water retention; vulnerable to spikelet sterility above 35°C and blast disease in humid overcast spells.",
    icarCitation: "ICAR-NRRI Cuttack: Rice Production Technology 2023",
    et0CropCoefficient: { kcInitial: 1.05, kcMid: 1.2, kcEnd: 0.9 },
  },

  maize: {
    crop: "maize",
    displayName: "Maize (Corn)",
    temperature: {
      heatStressThresholdC: 34.0,
      extremeHeatThresholdC: 38.0,
      coldChillingThresholdC: 10.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 20.0,
      heavy24hRainMm: 40.0,
      excessive7dRainMm: 80.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Vigorous cereal crop requiring well-drained soil; highly susceptible to root lodging and waterlogging.",
    icarCitation: "ICAR-IIMR Ludhiana: Kharif & Rabi Maize Advisory",
    et0CropCoefficient: { kcInitial: 0.3, kcMid: 1.2, kcEnd: 0.35 },
  },

  potato: {
    crop: "potato",
    displayName: "Potato",
    temperature: {
      heatStressThresholdC: 28.0,
      extremeHeatThresholdC: 32.0,
      coldChillingThresholdC: 4.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 12.0,
      heavy24hRainMm: 25.0,
      excessive7dRainMm: 50.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 30.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "Cool-season tuber highly prone to Phytophthora infestans (Late Blight) when temperatures sit between 12-22°C with humidity > 85%.",
    icarCitation: "ICAR-CPRI Shimla: Technical Bulletin on Late Blight Forecasting",
    et0CropCoefficient: { kcInitial: 0.5, kcMid: 1.15, kcEnd: 0.75 },
  },

  mustard: {
    crop: "mustard",
    displayName: "Mustard (Rapeseed)",
    temperature: {
      heatStressThresholdC: 30.0,
      extremeHeatThresholdC: 34.0,
      coldChillingThresholdC: 5.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 10.0,
      heavy24hRainMm: 20.0,
      excessive7dRainMm: 40.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 28.0,
    },
    humidity: {
      highHumidityThresholdPct: 75.0,
    },
    notes: "Oilseed crop sensitive to unseasonal rain during flowering and frost at pod formation.",
    icarCitation: "ICAR-DRMR Bharatpur: Rapeseed-Mustard Package of Practices",
    et0CropCoefficient: { kcInitial: 0.35, kcMid: 1.15, kcEnd: 0.35 },
  },

  cotton: {
    crop: "cotton",
    displayName: "Cotton",
    temperature: {
      heatStressThresholdC: 38.0,
      extremeHeatThresholdC: 42.0,
      coldChillingThresholdC: 15.0,
      frostThresholdC: 5.0,
    },
    precipitation: {
      moderate24hRainMm: 20.0,
      heavy24hRainMm: 45.0,
      excessive7dRainMm: 90.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 38.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Warm-season fiber crop; unseasonal rain during boll bursting discolors lint and promotes boll rot.",
    icarCitation: "ICAR-CICR Nagpur: Cotton Production and Protection Guide",
    et0CropCoefficient: { kcInitial: 0.35, kcMid: 1.2, kcEnd: 0.6 },
  },

  sugarcane: {
    crop: "sugarcane",
    displayName: "Sugarcane",
    temperature: {
      heatStressThresholdC: 39.0,
      extremeHeatThresholdC: 44.0,
      coldChillingThresholdC: 10.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 30.0,
      heavy24hRainMm: 60.0,
      excessive7dRainMm: 150.0,
    },
    wind: {
      sprayingWindLimitKmh: 16.0,
      lodgingWindRiskKmh: 45.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "Long-duration cash crop requiring abundant solar radiation; susceptible to severe lodging under gusty winds.",
    icarCitation: "ICAR-IISR Lucknow: Sugarcane Agro-Advisory Manual",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.25, kcEnd: 0.75 },
  },

  chickpea: {
    crop: "chickpea",
    displayName: "Chickpea (Gram)",
    temperature: {
      heatStressThresholdC: 30.0,
      extremeHeatThresholdC: 34.0,
      coldChillingThresholdC: 6.0,
      frostThresholdC: 1.0,
    },
    precipitation: {
      moderate24hRainMm: 8.0,
      heavy24hRainMm: 18.0,
      excessive7dRainMm: 35.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 25.0,
    },
    humidity: {
      highHumidityThresholdPct: 75.0,
    },
    notes: "Rabi pulse intolerant of excessive soil moisture and cloudy humid weather that accelerates Ascochyta blight and pod borer.",
    icarCitation: "ICAR-IIPR Kanpur: Pulse Crop Production Technologies",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.0, kcEnd: 0.35 },
  },

  soybean: {
    crop: "soybean",
    displayName: "Soybean",
    temperature: {
      heatStressThresholdC: 35.0,
      extremeHeatThresholdC: 38.0,
      coldChillingThresholdC: 12.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 22.0,
      heavy24hRainMm: 45.0,
      excessive7dRainMm: 95.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Important Kharif oilseed; highly vulnerable to prolonged dry spells during pod development and rust in humid spells.",
    icarCitation: "ICAR-IISR Indore: Soybean Management Guidelines",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.15, kcEnd: 0.5 },
  },

  groundnut: {
    crop: "groundnut",
    displayName: "Groundnut (Peanut)",
    temperature: {
      heatStressThresholdC: 36.0,
      extremeHeatThresholdC: 40.0,
      coldChillingThresholdC: 14.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 18.0,
      heavy24hRainMm: 35.0,
      excessive7dRainMm: 75.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 30.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Requires friable sandy loam; excess water during pegging induces collar rot and aflatoxin buildup.",
    icarCitation: "ICAR-DGR Junagadh: Groundnut Package of Practices",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.15, kcEnd: 0.6 },
  },

  tomato: {
    crop: "tomato",
    displayName: "Tomato",
    temperature: {
      heatStressThresholdC: 32.0,
      extremeHeatThresholdC: 36.0,
      coldChillingThresholdC: 8.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 12.0,
      heavy24hRainMm: 25.0,
      excessive7dRainMm: 50.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 28.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "High value horticultural crop vulnerable to Early and Late Blight, blossom drop above 32°C, and fruit cracking from irregular rain.",
    icarCitation: "ICAR-IIHR Bengaluru: Solanaceous Vegetable Production",
    et0CropCoefficient: { kcInitial: 0.6, kcMid: 1.15, kcEnd: 0.8 },
  },

  onion: {
    crop: "onion",
    displayName: "Onion",
    temperature: {
      heatStressThresholdC: 34.0,
      extremeHeatThresholdC: 38.0,
      coldChillingThresholdC: 6.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 10.0,
      heavy24hRainMm: 22.0,
      excessive7dRainMm: 45.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 25.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Shallow rooted bulb crop prone to purple blotch under cloudy humid conditions and rotting during waterlogging.",
    icarCitation: "ICAR-DOGR Rajgurunagar: Onion & Garlic Agronomy Guide",
    et0CropCoefficient: { kcInitial: 0.7, kcMid: 1.05, kcEnd: 0.75 },
  },

  chili: {
    crop: "chili",
    displayName: "Chili Pepper",
    temperature: {
      heatStressThresholdC: 35.0,
      extremeHeatThresholdC: 39.0,
      coldChillingThresholdC: 10.0,
      frostThresholdC: 3.0,
    },
    precipitation: {
      moderate24hRainMm: 14.0,
      heavy24hRainMm: 28.0,
      excessive7dRainMm: 60.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 28.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Sensitive to water stagnation which triggers damping-off and die-back; flower shedding occurs under extreme heat.",
    icarCitation: "ICAR-IIHR Bengaluru: Commercial Vegetable Advisory",
    et0CropCoefficient: { kcInitial: 0.6, kcMid: 1.05, kcEnd: 0.9 },
  },

  tea: {
    crop: "tea",
    displayName: "Tea",
    temperature: {
      heatStressThresholdC: 32.0,
      extremeHeatThresholdC: 36.0,
      coldChillingThresholdC: 10.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 35.0,
      heavy24hRainMm: 70.0,
      excessive7dRainMm: 160.0,
    },
    wind: {
      sprayingWindLimitKmh: 16.0,
      lodgingWindRiskKmh: 45.0,
    },
    humidity: {
      highHumidityThresholdPct: 90.0,
    },
    notes: "Perennial plantation crop thriving in warm humid tea gardens; blister blight flourishes under continuous fog and mist.",
    icarCitation: "TRA Tocklai / ICAR Plantation Crops Advisory",
    et0CropCoefficient: { kcInitial: 0.9, kcMid: 1.0, kcEnd: 1.0 },
  },

  coffee: {
    crop: "coffee",
    displayName: "Coffee (Arabica / Robusta)",
    temperature: {
      heatStressThresholdC: 30.0,
      extremeHeatThresholdC: 35.0,
      coldChillingThresholdC: 8.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 25.0,
      heavy24hRainMm: 50.0,
      excessive7dRainMm: 110.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "Requires backing showers for blossom opening; excessive dampness promotes coffee leaf rust (Hemileia vastatrix).",
    icarCitation: "Central Coffee Research Institute (CCRI) Balehonnur",
    et0CropCoefficient: { kcInitial: 0.9, kcMid: 0.95, kcEnd: 0.95 },
  },

  barley: {
    crop: "barley",
    displayName: "Barley",
    temperature: {
      heatStressThresholdC: 31.0,
      extremeHeatThresholdC: 35.0,
      coldChillingThresholdC: 3.0,
      frostThresholdC: 1.0,
    },
    precipitation: {
      moderate24hRainMm: 12.0,
      heavy24hRainMm: 25.0,
      excessive7dRainMm: 50.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 32.0,
    },
    humidity: {
      highHumidityThresholdPct: 75.0,
    },
    notes: "Resilient rabi cereal with moderate drought and salinity tolerance; lodging prone in late stages.",
    icarCitation: "ICAR-IIWBR Karnal: Barley Package of Practices",
    et0CropCoefficient: { kcInitial: 0.3, kcMid: 1.15, kcEnd: 0.25 },
  },

  sorghum: {
    crop: "sorghum",
    displayName: "Sorghum (Jowar)",
    temperature: {
      heatStressThresholdC: 38.0,
      extremeHeatThresholdC: 42.0,
      coldChillingThresholdC: 12.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 20.0,
      heavy24hRainMm: 40.0,
      excessive7dRainMm: 80.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 40.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Drought-hardy millet/cereal; unseasonal rains at maturity cause grain mold and deterioration.",
    icarCitation: "ICAR-IIMR Hyderabad: Millets Technology Compendium",
    et0CropCoefficient: { kcInitial: 0.3, kcMid: 1.1, kcEnd: 0.55 },
  },

  pearl_millet: {
    crop: "pearl_millet",
    displayName: "Pearl Millet (Bajra)",
    temperature: {
      heatStressThresholdC: 40.0,
      extremeHeatThresholdC: 44.0,
      coldChillingThresholdC: 12.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 15.0,
      heavy24hRainMm: 30.0,
      excessive7dRainMm: 65.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 38.0,
    },
    humidity: {
      highHumidityThresholdPct: 75.0,
    },
    notes: "Exceptionally heat- and drought-tolerant Nutri-Cereal; rain during pollination impairs grain setting.",
    icarCitation: "ICAR-AICRP on Pearl Millet Jodhpur",
    et0CropCoefficient: { kcInitial: 0.3, kcMid: 1.0, kcEnd: 0.3 },
  },

  pigeon_pea: {
    crop: "pigeon_pea",
    displayName: "Pigeon Pea (Arhar/Tur)",
    temperature: {
      heatStressThresholdC: 35.0,
      extremeHeatThresholdC: 39.0,
      coldChillingThresholdC: 10.0,
      frostThresholdC: 3.0,
    },
    precipitation: {
      moderate24hRainMm: 20.0,
      heavy24hRainMm: 40.0,
      excessive7dRainMm: 85.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "Deep-rooted legume vulnerable to Phytophthora stem blight in waterlogged fields and sterility mosaic disease.",
    icarCitation: "ICAR-IIPR Kanpur: Kharif Pulses Advisory",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.15, kcEnd: 0.55 },
  },

  lentil: {
    crop: "lentil",
    displayName: "Lentil (Masoor)",
    temperature: {
      heatStressThresholdC: 29.0,
      extremeHeatThresholdC: 33.0,
      coldChillingThresholdC: 4.0,
      frostThresholdC: 1.0,
    },
    precipitation: {
      moderate24hRainMm: 8.0,
      heavy24hRainMm: 18.0,
      excessive7dRainMm: 35.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 24.0,
    },
    humidity: {
      highHumidityThresholdPct: 75.0,
    },
    notes: "Delicate rabi pulse highly sensitive to excess standing water, rust, and heat stress during pod maturity.",
    icarCitation: "ICAR-IIPR Kanpur: Lentil Production Bulletin",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.1, kcEnd: 0.3 },
  },

  garlic: {
    crop: "garlic",
    displayName: "Garlic",
    temperature: {
      heatStressThresholdC: 32.0,
      extremeHeatThresholdC: 36.0,
      coldChillingThresholdC: 4.0,
      frostThresholdC: 1.0,
    },
    precipitation: {
      moderate24hRainMm: 10.0,
      heavy24hRainMm: 20.0,
      excessive7dRainMm: 40.0,
    },
    wind: {
      sprayingWindLimitKmh: 12.0,
      lodgingWindRiskKmh: 25.0,
    },
    humidity: {
      highHumidityThresholdPct: 78.0,
    },
    notes: "Requires good drainage; bulb development is hindered by temperatures > 32°C and high moisture induces rot.",
    icarCitation: "ICAR-DOGR Rajgurunagar: Garlic Cultivation Manual",
    et0CropCoefficient: { kcInitial: 0.7, kcMid: 1.0, kcEnd: 0.7 },
  },

  jute: {
    crop: "jute",
    displayName: "Jute",
    temperature: {
      heatStressThresholdC: 37.0,
      extremeHeatThresholdC: 40.0,
      coldChillingThresholdC: 16.0,
      frostThresholdC: 8.0,
    },
    precipitation: {
      moderate24hRainMm: 30.0,
      heavy24hRainMm: 60.0,
      excessive7dRainMm: 130.0,
    },
    wind: {
      sprayingWindLimitKmh: 15.0,
      lodgingWindRiskKmh: 35.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "Warm and humid season bast fiber crop; seedling stage is susceptible to waterlogging and stem rot.",
    icarCitation: "ICAR-CRIJAF Barrackpore: Jute Production Technology",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.15, kcEnd: 0.8 },
  },

  mango: {
    crop: "mango",
    displayName: "Mango",
    temperature: {
      heatStressThresholdC: 42.0,
      extremeHeatThresholdC: 46.0,
      coldChillingThresholdC: 8.0,
      frostThresholdC: 2.0,
    },
    precipitation: {
      moderate24hRainMm: 25.0,
      heavy24hRainMm: 50.0,
      excessive7dRainMm: 100.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 45.0,
    },
    humidity: {
      highHumidityThresholdPct: 80.0,
    },
    notes: "King of fruits; rain or high humidity during flowering induces powdery mildew, anthracnose, and severe blossom drop.",
    icarCitation: "ICAR-CISH Lucknow: Mango Health and Disease Advisory",
    et0CropCoefficient: { kcInitial: 0.8, kcMid: 0.85, kcEnd: 0.8 },
  },

  banana: {
    crop: "banana",
    displayName: "Banana",
    temperature: {
      heatStressThresholdC: 38.0,
      extremeHeatThresholdC: 42.0,
      coldChillingThresholdC: 12.0,
      frostThresholdC: 4.0,
    },
    precipitation: {
      moderate24hRainMm: 30.0,
      heavy24hRainMm: 60.0,
      excessive7dRainMm: 140.0,
    },
    wind: {
      sprayingWindLimitKmh: 14.0,
      lodgingWindRiskKmh: 30.0,
    },
    humidity: {
      highHumidityThresholdPct: 85.0,
    },
    notes: "High water demanding fruit crop with large fragile leaves; wind gusts > 30 km/h cause crown damage and pseudostem snapping.",
    icarCitation: "ICAR-NRCB Tiruchirappalli: Banana Production Guide",
    et0CropCoefficient: { kcInitial: 0.5, kcMid: 1.1, kcEnd: 1.0 },
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
    icarCitation: "ICAR Agronomic Advisory Standards",
    et0CropCoefficient: { kcInitial: 0.4, kcMid: 1.1, kcEnd: 0.5 },
  },
};

export function getCropProfile(crop?: CropType): CropProfile {
  if (!crop || !CROP_PROFILES[crop]) {
    return CROP_PROFILES.generic;
  }
  return CROP_PROFILES[crop];
}
