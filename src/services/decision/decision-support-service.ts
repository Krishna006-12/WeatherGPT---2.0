/**
 * Deterministic Decision Support Service — WeatherGPT 2.0.
 *
 * Generates transparent, actionable decision checklists per persona:
 * - Disaster & Emergency Manager: Multi-agency incident command checklist derived from active alerts.
 * - Farmer: Agronomic decision support derived from forecast and physical crop rules.
 * - General Public: Daily safety, commute, and personal protection recommendations.
 *
 * CRITICAL RULE:
 * 100% transparent and traceable to source data. No black-box suggestions.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { Alert } from "@/types/alert";
import type { PersonaId } from "@/types/persona";
import type {
  DecisionItem,
  PersonaDecisionSupport,
} from "@/types/decision-support";
import { globalAlertRulesEngine } from "@/services/alerts/alert-rules-engine";
import { getPersonaProfile } from "@/config/personas";

export interface DecisionSupportOptions {
  personaId?: PersonaId;
  alerts?: Alert[];
  crop?: string;
}

export class DecisionSupportService {
  /**
   * Generates a transparent, evidence-traced decision support plan for the chosen persona.
   */
  generateDecisionSupport(
    weather: WeatherSnapshot,
    options: DecisionSupportOptions = {}
  ): PersonaDecisionSupport {
    const personaId: PersonaId = options.personaId || "general_public";
    const profile = getPersonaProfile(personaId);

    // If alerts are not explicitly passed, evaluate them deterministically from the snapshot
    const activeAlerts =
      options.alerts && options.alerts.length > 0
        ? options.alerts
        : globalAlertRulesEngine.evaluate(weather);

    let items: DecisionItem[] = [];
    let overallStatus: PersonaDecisionSupport["overallStatus"] = "normal";

    switch (personaId) {
      case "disaster_manager":
        items = this.evaluateDisasterManagerChecklist(weather, activeAlerts);
        break;
      case "farmer":
        items = this.evaluateFarmerAdvisory(weather, activeAlerts, options.crop);
        break;
      case "general_public":
      default:
        items = this.evaluateGeneralPublicGuidance(weather, activeAlerts);
        break;
    }

    // Determine overall status based on item priorities
    if (items.some((i) => i.priority === "urgent")) {
      overallStatus = activeAlerts.some((a: Alert) => a.severity === "extreme")
        ? "emergency"
        : "action_required";
    } else if (items.some((i) => i.priority === "high")) {
      overallStatus = "action_required";
    } else if (items.some((i) => i.priority === "moderate")) {
      overallStatus = "caution";
    }

    const urgentCount = items.filter((i) => i.priority === "urgent" || i.priority === "high").length;
    const summary =
      urgentCount > 0
        ? `${urgentCount} priority action item(s) require operational attention for ${weather.location.name}.`
        : `Conditions in ${weather.location.name} are currently stable with routine maintenance guidance.`;

    return {
      personaId,
      personaName: profile.name,
      overallStatus,
      summary,
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Disaster & Emergency Manager: Incident command coordination checklist.
   */
  private evaluateDisasterManagerChecklist(
    weather: WeatherSnapshot,
    alerts: Alert[]
  ): DecisionItem[] {
    const items: DecisionItem[] = [];
    const current = weather.current;
    const daily = weather.daily[0];
    const rainfallSum = daily?.precipitationSum ?? current.precipitation ?? 0;

    const cycloneAlert = alerts.find((a) => a.category === "cyclone");
    const floodAlert = alerts.find((a) => a.category === "flood" || a.category === "heavy_rain");
    const heatAlert = alerts.find((a) => a.category === "heat");
    const windAlert = alerts.find((a) => a.category === "wind");
    const thunderAlert = alerts.find((a) => a.category === "thunderstorm");

    // 1. Cyclone / Severe Storm Actions
    if (cycloneAlert || (current.pressure <= 995 && current.windSpeed >= 60)) {
      items.push({
        id: "dm_cyclone_eoc",
        title: "Activate Municipal Emergency Operations Center (EOC)",
        category: "operations",
        priority: "urgent",
        status: "pending",
        actionText: "Convene inter-agency heads (Police, Fire, Civil Defense, Red Cross) for incident briefing.",
        recommendedTimeframe: "Immediate (< 1 hour)",
        traceability: {
          sourceType: cycloneAlert ? "active_alert" : "forecast_threshold",
          metricName: "Atmospheric Pressure & Wind",
          observedValue: `${current.pressure} hPa, ${Math.round(current.windSpeed)} km/h`,
          thresholdValue: "<= 995 hPa & >= 60 km/h",
          sourceReference: cycloneAlert ? `Active Alert #${cycloneAlert.id} (${cycloneAlert.headline})` : "Surface Barometric Telemetry",
        },
      });

      items.push({
        id: "dm_cyclone_evac",
        title: "Broadcast Low-Lying Coastal / Floodplain Evacuation Warnings",
        category: "evacuation",
        priority: "urgent",
        status: "pending",
        actionText: "Trigger early warning sirens and automated emergency SMS broadcasts in high-risk zones.",
        recommendedTimeframe: "Within 2 hours",
        traceability: {
          sourceType: "active_alert",
          metricName: "Cyclone Severity Level",
          observedValue: cycloneAlert?.severity || "severe",
          thresholdValue: "severe / extreme",
          sourceReference: cycloneAlert ? `Active Alert #${cycloneAlert.id}` : "Tropical Storm Ingress",
        },
      });
    }

    // 2. Flood & Heavy Rainfall Actions
    if (floodAlert || rainfallSum >= 30) {
      items.push({
        id: "dm_flood_drainage",
        title: "Inspect & Clear Critical Drainage Culverts & Sluice Gates",
        category: "infrastructure",
        priority: rainfallSum >= 70 ? "urgent" : "high",
        status: "pending",
        actionText: "Deploy municipal engineering teams to inspect flood retention basins and clear obstructions.",
        recommendedTimeframe: "Immediate (< 2 hours)",
        traceability: {
          sourceType: floodAlert ? "active_alert" : "forecast_threshold",
          metricName: "Daily Precipitation Sum",
          observedValue: `${rainfallSum.toFixed(1)} mm`,
          thresholdValue: ">= 30.0 mm",
          sourceReference: floodAlert ? `Active Alert #${floodAlert.id}` : "24h Rainfall Forecast Horizon",
        },
      });

      items.push({
        id: "dm_flood_boats",
        title: "Pre-Position Water Rescue Teams & High-Clearance Vehicles",
        category: "operations",
        priority: "high",
        status: "pending",
        actionText: "Stage inflatable rescue craft and medical supplies at designated secondary response depots.",
        recommendedTimeframe: "Within 3 hours",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Hydrological Accumulation",
          observedValue: `${rainfallSum.toFixed(1)} mm`,
          thresholdValue: ">= 30.0 mm",
          sourceReference: "Open-Meteo Ensemble & Hydrology Signal",
        },
      });
    }

    // 3. Extreme Heat Actions
    if (heatAlert || current.temperature >= 38 || current.feelsLike >= 40) {
      const isExtreme = current.temperature >= 42 || current.feelsLike >= 45;
      items.push({
        id: "dm_heat_shelter",
        title: "Open Municipal Air-Conditioned Cooling Centers",
        category: "public_info",
        priority: isExtreme ? "urgent" : "high",
        status: "pending",
        actionText: "Open public libraries, civic centers, and shaded transit halls for vulnerable populations.",
        recommendedTimeframe: "By 10:00 AM",
        traceability: {
          sourceType: heatAlert ? "active_alert" : "forecast_threshold",
          metricName: "Heat Index (Feels Like)",
          observedValue: `${Math.round(current.feelsLike)}°C`,
          thresholdValue: ">= 40.0°C",
          sourceReference: heatAlert ? `Active Alert #${heatAlert.id}` : "Current Atmospheric Thermal Model",
        },
      });
    }

    // 4. High Wind Actions
    if (windAlert || (current.windGust ?? current.windSpeed) >= 55) {
      const gust = current.windGust ?? current.windSpeed;
      items.push({
        id: "dm_wind_grid",
        title: "Alert Power Distribution & Tree Maintenance Utilities",
        category: "infrastructure",
        priority: gust >= 80 ? "urgent" : "high",
        status: "pending",
        actionText: "Place chainsaw rapid-response crews and overhead power repair teams on 15-minute standby.",
        recommendedTimeframe: "Immediate",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Maximum Wind Gust",
          observedValue: `${Math.round(gust)} km/h`,
          thresholdValue: ">= 55.0 km/h",
          sourceReference: "Anemometer & Gust Forecast",
        },
      });
    }

    // 5. Thunderstorm Actions
    if (thunderAlert || current.condition.toLowerCase().includes("thunder")) {
      items.push({
        id: "dm_thunder_outdoor",
        title: "Suspend Public Outdoor Stadium Events & Construction Cranes",
        category: "safety",
        priority: "high",
        status: "pending",
        actionText: "Order outdoor crane booms lowered and issue public lightning safety advisories.",
        recommendedTimeframe: "Immediate",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Convective Storm Activity",
          observedValue: current.condition,
          thresholdValue: "Thunderstorm WMO Codes (95, 96, 99)",
          sourceReference: "Live Doppler & Convective Model",
        },
      });
    }

    // If no urgent items triggered, provide standard baseline readiness checklist
    if (items.length === 0) {
      items.push({
        id: "dm_baseline_watch",
        title: "Maintain Standard Telemetry Surveillance Watch",
        category: "operations",
        priority: "routine",
        status: "completed",
        actionText: "All meteorological sensors and hydrological stream gauges report within normal operational parameters.",
        recommendedTimeframe: "Continuous (24h)",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Regional Hazard Index",
          observedValue: "0 Threshold Excursions",
          thresholdValue: "No active hazard alerts",
          sourceReference: "Integrated Meteorological Telemetry System",
        },
      });
    }

    return items;
  }

  /**
   * Farmer: Agronomic decision support derived from forecast + crop-relevant rules.
   */
  private evaluateFarmerAdvisory(
    weather: WeatherSnapshot,
    alerts: Alert[],
    crop?: string
  ): DecisionItem[] {
    const items: DecisionItem[] = [];
    const current = weather.current;
    const daily = weather.daily[0];
    const rainNext24h = daily?.precipitationSum ?? current.precipitation ?? 0;
    const windSpeed = current.windSpeed;
    const minTemp = daily?.temperatureLow ?? current.temperature;
    const maxTemp = daily?.temperatureHigh ?? current.temperature;
    const cropPrefix = crop ? `[${crop.charAt(0).toUpperCase() + crop.slice(1)}] ` : "";

    // 1. Chemical Spraying Window (Wind & Rain thresholds)
    const isWindyForSpray = windSpeed >= 15;
    const isRainyForSpray = rainNext24h >= 5 || current.precipitation >= 1;

    if (isWindyForSpray || isRainyForSpray) {
      items.push({
        id: "farm_spray_suspend",
        title: `${cropPrefix}Halt Foliar & Pesticide Chemical Spraying`,
        category: "agronomy",
        priority: "urgent",
        status: "pending",
        actionText: isWindyForSpray
          ? `Wind speeds (${Math.round(windSpeed)} km/h) exceed the 15 km/h spray drift threshold, causing chemical loss and off-target damage.`
          : `Precipitation (${rainNext24h.toFixed(1)} mm) will wash active ingredients off foliage before absorption.`,
        recommendedTimeframe: "Next 24 Hours",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: isWindyForSpray ? "Sustained Wind Speed" : "24h Precipitation Sum",
          observedValue: isWindyForSpray ? `${Math.round(windSpeed)} km/h` : `${rainNext24h.toFixed(1)} mm`,
          thresholdValue: isWindyForSpray ? ">= 15.0 km/h (Drift Limit)" : ">= 5.0 mm (Wash-off Limit)",
          sourceReference: "Standard Agronomic Chemical Application Protocol",
        },
      });
    } else {
      items.push({
        id: "farm_spray_open",
        title: `${cropPrefix}Foliar Spraying Window Available`,
        category: "agronomy",
        priority: "routine",
        status: "pending",
        actionText: "Calm winds and dry conditions provide an optimal window for foliar fertilizer or pest protection.",
        recommendedTimeframe: "Early Morning (06:00 - 09:00 AM)",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Wind Speed & Rain Sum",
          observedValue: `${Math.round(windSpeed)} km/h, 0 mm rain`,
          thresholdValue: "< 15 km/h & < 5 mm rain",
          sourceReference: "Agronomic Application Quality Window",
        },
      });
    }

    // 2. Field Irrigation Decision
    if (rainNext24h >= 20) {
      items.push({
        id: "farm_irrig_halt",
        title: `${cropPrefix}Suspend Scheduled Irrigation`,
        category: "agronomy",
        priority: "high",
        status: "pending",
        actionText: `Substantial rain (${rainNext24h.toFixed(1)} mm) will satisfy crop water demand. Turning off tube-wells conserves power and groundwater.`,
        recommendedTimeframe: "Next 48 Hours",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "24h Rainfall Forecast",
          observedValue: `${rainNext24h.toFixed(1)} mm`,
          thresholdValue: ">= 20.0 mm",
          sourceReference: "Crop Water Balance Calculator",
        },
      });
    } else if (maxTemp >= 38 && rainNext24h < 3) {
      items.push({
        id: "farm_irrig_heat",
        title: `${cropPrefix}Schedule Early Morning Soil Cooling Irrigation`,
        category: "agronomy",
        priority: "high",
        status: "pending",
        actionText: `High daytime heat (${Math.round(maxTemp)}°C) accelerates evapotranspiration. Light irrigation maintains root turgidity without scald.`,
        recommendedTimeframe: "Before 08:00 AM",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Maximum Day Temperature",
          observedValue: `${Math.round(maxTemp)}°C`,
          thresholdValue: ">= 38.0°C",
          sourceReference: "Thermal Evapotranspiration Metric",
        },
      });
    } else {
      items.push({
        id: "farm_irrig_standard",
        title: `${cropPrefix}Maintain Standard Soil Moisture Schedule`,
        category: "agronomy",
        priority: "routine",
        status: "completed",
        actionText: "Normal moisture and temperature profile. Proceed with standard crop water cycles.",
        recommendedTimeframe: "Routine",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Soil Moisture Balance",
          observedValue: `${Math.round(current.humidity)}% humidity, ${rainNext24h.toFixed(1)} mm rain`,
          thresholdValue: "Normal moisture range",
          sourceReference: "Root Zone Hydration Baseline",
        },
      });
    }

    // 3. Waterlogging & Drainage
    if (rainNext24h >= 30 || alerts.some((a) => a.category === "heavy_rain" || a.category === "flood")) {
      items.push({
        id: "farm_drainage_clear",
        title: `${cropPrefix}Clear Field Furrows & Drainage Outlets`,
        category: "agronomy",
        priority: "urgent",
        status: "pending",
        actionText: "Open field bund drains to prevent root asphyxiation, collar rot, and soil compaction from standing water.",
        recommendedTimeframe: "Immediate",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Heavy Precipitation Sum",
          observedValue: `${rainNext24h.toFixed(1)} mm`,
          thresholdValue: ">= 30.0 mm",
          sourceReference: "Field Waterlogging Vulnerability Index",
        },
      });
    }

    // 4. Frost / Cold Shock Protection
    if (minTemp <= 4 || alerts.some((a) => a.category === "cold_wave")) {
      items.push({
        id: "farm_frost_protect",
        title: `${cropPrefix}Apply Evening Frost Defense (Light irrigation / straw mulch)`,
        category: "agronomy",
        priority: "urgent",
        status: "pending",
        actionText: `Night temperature falling to ${Math.round(minTemp)}°C creates ground frost risks on tender foliage and flowering stages.`,
        recommendedTimeframe: "Before Sunset (17:00)",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Minimum Night Temperature",
          observedValue: `${Math.round(minTemp)}°C`,
          thresholdValue: "<= 4.0°C (Frost Threshold)",
          sourceReference: "Microclimate Inversion & Frost Alert",
        },
      });
    }

    return items;
  }

  /**
   * General Public: Daily safety, commute, and personal protection recommendations.
   */
  private evaluateGeneralPublicGuidance(
    weather: WeatherSnapshot,
    alerts: Alert[]
  ): DecisionItem[] {
    const items: DecisionItem[] = [];
    const current = weather.current;
    const daily = weather.daily[0];
    const precipProb = daily?.precipitationProbability ?? current.precipitationProbability ?? 0;
    const rainSum = daily?.precipitationSum ?? current.precipitation ?? 0;
    const uvIndex = current.uvIndex ?? 4.0;
    const feelsLike = current.feelsLike;
    const windSpeed = current.windSpeed;

    // 1. Commute & Rain Gear
    if (precipProb >= 40 || rainSum >= 2.0 || current.condition.toLowerCase().includes("rain")) {
      items.push({
        id: "pub_rain_umbrella",
        title: "Carry Rain Protection & Plan Commute Buffer",
        category: "safety",
        priority: precipProb >= 70 || rainSum >= 10 ? "urgent" : "high",
        status: "pending",
        actionText: `Significant rain likelihood (${Math.round(precipProb)}%). Pack an umbrella/raincoat and anticipate road waterlogging delays.`,
        recommendedTimeframe: "All Day Commute",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Precipitation Probability & Sum",
          observedValue: `${Math.round(precipProb)}%, ${rainSum.toFixed(1)} mm`,
          thresholdValue: ">= 40% probability or >= 2.0 mm",
          sourceReference: "Daily Commuter Weather Forecast",
        },
      });
    } else {
      items.push({
        id: "pub_rain_clear",
        title: "Dry Commute & Travel Conditions",
        category: "operations",
        priority: "routine",
        status: "completed",
        actionText: "No significant precipitation expected during transit hours.",
        recommendedTimeframe: "Daily",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Precipitation Probability",
          observedValue: `${Math.round(precipProb)}%`,
          thresholdValue: "< 40%",
          sourceReference: "Hourly Precipitation Horizon",
        },
      });
    }

    // 2. UV Index & Sun Protection
    if (uvIndex >= 6.0) {
      items.push({
        id: "pub_uv_protect",
        title: "Apply Sun Protection (SPF 30+, Sunglasses & Hat)",
        category: "safety",
        priority: uvIndex >= 8.0 ? "urgent" : "moderate",
        status: "pending",
        actionText: `UV radiation is elevated (${uvIndex.toFixed(1)}). Unprotected skin can burn within 20 minutes under peak midday exposure.`,
        recommendedTimeframe: "11:00 AM - 04:00 PM",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Solar Ultraviolet Index",
          observedValue: `${uvIndex.toFixed(1)} UV`,
          thresholdValue: ">= 6.0 UV (High / Very High)",
          sourceReference: "WHO Global Solar UV Index Specification",
        },
      });
    }

    // 3. Thermal Comfort (Heat or Cold)
    if (feelsLike >= 40.0 || current.temperature >= 38.0) {
      items.push({
        id: "pub_heat_hydration",
        title: "Increase Hydration & Limit Afternoon Strenuous Exertion",
        category: "safety",
        priority: feelsLike >= 43.0 ? "urgent" : "high",
        status: "pending",
        actionText: `Heat Index (${Math.round(feelsLike)}°C) creates heat cramps and exhaustion risks. Drink fluids before feeling thirsty and rest in shade.`,
        recommendedTimeframe: "Peak Afternoon (12:00 - 04:00 PM)",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Feels-Like Thermal Index",
          observedValue: `${Math.round(feelsLike)}°C`,
          thresholdValue: ">= 40.0°C",
          sourceReference: "National Weather Service Heat Index Scale",
        },
      });
    } else if (current.temperature <= 12.0) {
      items.push({
        id: "pub_cold_layers",
        title: "Wear Layered Thermal Clothing & Windproof Outerwear",
        category: "safety",
        priority: current.temperature <= 5.0 ? "urgent" : "moderate",
        status: "pending",
        actionText: `Chilly conditions (${Math.round(current.temperature)}°C). Layering prevents rapid core heat loss during morning and evening transit.`,
        recommendedTimeframe: "Morning & Evening",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Ambient Surface Temperature",
          observedValue: `${Math.round(current.temperature)}°C`,
          thresholdValue: "<= 12.0°C",
          sourceReference: "Surface Temperature Sensor",
        },
      });
    }

    // 4. Wind & Balcony Safety
    if (windSpeed >= 35.0 || (current.windGust ?? 0) >= 50.0) {
      items.push({
        id: "pub_wind_secure",
        title: "Secure Balcony Furnishings & Exercise Caution Cycling",
        category: "safety",
        priority: "high",
        status: "pending",
        actionText: `Gusty winds (${Math.round(windSpeed)} km/h) can displace lightweight outdoor items and destabilize two-wheelers.`,
        recommendedTimeframe: "Until Winds Subside",
        traceability: {
          sourceType: "forecast_threshold",
          metricName: "Wind Velocity & Gusts",
          observedValue: `${Math.round(windSpeed)} km/h (Gusts: ${Math.round(current.windGust ?? windSpeed)} km/h)`,
          thresholdValue: ">= 35.0 km/h",
          sourceReference: "Beaufort Wind Force Scale",
        },
      });
    }

    // 5. Severe Alert Elevation
    for (const alert of alerts) {
      if (alert.severity === "extreme" || alert.severity === "severe") {
        items.unshift({
          id: `pub_alert_${alert.id}`,
          title: `Active Alert: ${alert.headline}`,
          category: "safety",
          priority: "urgent",
          status: "pending",
          actionText: alert.description,
          recommendedTimeframe: "Immediate Safety Notice",
          traceability: {
            sourceType: "active_alert",
            metricName: `${alert.category.toUpperCase()} Severity`,
            observedValue: alert.severity,
            thresholdValue: "severe/extreme",
            sourceReference: `Alert #${alert.id} (${alert.source})`,
          },
        });
      }
    }

    return items;
  }
}

export const globalDecisionSupportService = new DecisionSupportService();
