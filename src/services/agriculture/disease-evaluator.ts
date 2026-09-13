/**
 * Fungal Disease Risk Evaluator for Agricultural Intelligence.
 *
 * Implements deterministic epidemiological rules linking atmospheric moisture,
 * temperature envelopes, and leaf wetness duration to fungal spore germination.
 * Specifically evaluates Late Blight (Potato/Tomato), Yellow Rust (Wheat),
 * Blast (Rice), and White Rust (Mustard).
 */

import type { CropType, DiseaseRiskAssessment, RiskLevel } from "@/types/agriculture";
import type { WeatherSnapshot } from "@/types/weather";

export function evaluateFungalDiseaseRisk(
  crop: CropType,
  weather: WeatherSnapshot
): DiseaseRiskAssessment[] {
  const currentTemp = weather.current.temperature;
  const currentHumidity = weather.current.humidity;
  const dailyHigh = weather.daily[0]?.temperatureHigh ?? currentTemp;
  const dailyLow = weather.daily[0]?.temperatureLow ?? currentTemp;
  const rain24h = weather.daily[0]?.precipitationSum ?? 0;

  // Approximate leaf wetness hours from relative humidity (>85%) and rain
  let estimatedLeafWetnessHours = 0;
  if (rain24h > 2.0) {
    estimatedLeafWetnessHours += 8;
  }
  if (currentHumidity >= 85) {
    estimatedLeafWetnessHours += 6;
  } else if (currentHumidity >= 75) {
    estimatedLeafWetnessHours += 3;
  }

  const results: DiseaseRiskAssessment[] = [];

  switch (crop) {
    case "potato":
    case "tomato": {
      // Late Blight (Phytophthora infestans)
      // Optimal range: 12°C - 22°C, relative humidity >= 85%, sustained leaf wetness
      const tempOptimal = dailyLow >= 10 && dailyHigh <= 24;
      const humidityOptimal = currentHumidity >= 80 || rain24h > 1.0;

      let risk: RiskLevel = "low";
      if (tempOptimal && humidityOptimal && estimatedLeafWetnessHours >= 8) {
        risk = "critical";
      } else if (tempOptimal && humidityOptimal) {
        risk = "high";
      } else if (tempOptimal || humidityOptimal) {
        risk = "moderate";
      }

      results.push({
        diseaseName: "Late Blight",
        cropTarget: crop === "potato" ? "Potato" : "Tomato",
        riskLevel: risk,
        temperatureOptimalMet: tempOptimal,
        humiditySustainedMet: humidityOptimal,
        leafWetnessHoursEstimated: estimatedLeafWetnessHours,
        pathogen: "Phytophthora infestans",
        preventativeAdvisory:
          risk === "critical" || risk === "high"
            ? "High blight pressure detected. Prioritize protective contact fungicide sprays (Mancozeb 75 WP @ 2.5g/L) during clear morning intervals."
            : "Conditions currently stable. Maintain routine canopy monitoring.",
        icarCitation: "ICAR-CPRI Shimla: Late Blight Warning Heuristics Bulletin",
      });
      break;
    }

    case "wheat": {
      // Stripe/Yellow Rust (Puccinia striiformis)
      // Optimal range: 10°C - 20°C, RH >= 75%, persistent morning dew
      const tempOptimal = dailyLow >= 6 && dailyHigh <= 22;
      const humidityOptimal = currentHumidity >= 75 || rain24h > 0.5;

      let risk: RiskLevel = "low";
      if (tempOptimal && humidityOptimal && estimatedLeafWetnessHours >= 6) {
        risk = "high";
      } else if (tempOptimal && humidityOptimal) {
        risk = "moderate";
      }

      results.push({
        diseaseName: "Yellow / Stripe Rust",
        cropTarget: "Wheat",
        riskLevel: risk,
        temperatureOptimalMet: tempOptimal,
        humiditySustainedMet: humidityOptimal,
        leafWetnessHoursEstimated: estimatedLeafWetnessHours,
        pathogen: "Puccinia striiformis",
        preventativeAdvisory:
          risk === "high"
            ? "Cool and humid microclimate favors rust sporulation. Inspect lower canopy for yellow pustules and keep Propiconazole 25 EC ready."
            : "Weather within safe thresholds for rust proliferation.",
        icarCitation: "ICAR-IIWBR Karnal: Wheat Disease Surveillance Advisory",
      });
      break;
    }

    case "rice": {
      // Rice Blast (Magnaporthe oryzae)
      // Optimal range: 20°C - 30°C, RH >= 85%, prolonged overcast days
      const tempOptimal = dailyLow >= 18 && dailyHigh <= 32;
      const humidityOptimal = currentHumidity >= 85 || rain24h > 5.0;

      let risk: RiskLevel = "low";
      if (tempOptimal && humidityOptimal && estimatedLeafWetnessHours >= 8) {
        risk = "high";
      } else if (tempOptimal && humidityOptimal) {
        risk = "moderate";
      }

      results.push({
        diseaseName: "Rice Blast",
        cropTarget: "Rice (Paddy)",
        riskLevel: risk,
        temperatureOptimalMet: tempOptimal,
        humiditySustainedMet: humidityOptimal,
        leafWetnessHoursEstimated: estimatedLeafWetnessHours,
        pathogen: "Magnaporthe oryzae",
        preventativeAdvisory:
          risk === "high"
            ? "Warm humid spell with leaf moisture favors blast lesion expansion. Avoid excessive nitrogen top-dressing and monitor neck nodes."
            : "Blast pressure is currently low.",
        icarCitation: "ICAR-NRRI Cuttack: Rice Blast Risk Criteria",
      });
      break;
    }

    case "mustard": {
      // White Rust (Albugo candida)
      // Optimal range: 12°C - 18°C, RH >= 80%
      const tempOptimal = dailyLow >= 8 && dailyHigh <= 22;
      const humidityOptimal = currentHumidity >= 78;

      let risk: RiskLevel = "low";
      if (tempOptimal && humidityOptimal) {
        risk = "moderate";
      }

      results.push({
        diseaseName: "White Rust",
        cropTarget: "Mustard",
        riskLevel: risk,
        temperatureOptimalMet: tempOptimal,
        humiditySustainedMet: humidityOptimal,
        leafWetnessHoursEstimated: estimatedLeafWetnessHours,
        pathogen: "Albugo candida",
        preventativeAdvisory:
          risk === "moderate"
            ? "Foggy humid mornings create white rust risk. Inspect lower leaves for chalky pustules."
            : "Foliage disease risk remains low.",
        icarCitation: "ICAR-DRMR Bharatpur: Mustard Crop Protection Standards",
      });
      break;
    }

    default:
      // Generic fungal damping risk under high humidity and rainfall
      if (currentHumidity > 85 && rain24h > 15.0) {
        results.push({
          diseaseName: "Foliar Dampening / Mold",
          cropTarget: "General Crop",
          riskLevel: "moderate",
          temperatureOptimalMet: true,
          humiditySustainedMet: true,
          leafWetnessHoursEstimated: estimatedLeafWetnessHours,
          pathogen: "Facultative fungal parasites",
          preventativeAdvisory:
            "Persistent rainfall and high humidity create damp microclimates. Ensure field drainage channels remain open.",
          icarCitation: "ICAR Integrated Pest & Disease Management",
        });
      }
      break;
  }

  return results;
}
