/**
 * Route / Travel Weather Intelligence Service.
 *
 * Computes meteorological conditions along a travel corridor (Origin -> Destination)
 * across sequential waypoints at estimated arrival times.
 */

export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedArrivalHour: number; // relative hour offset from departure (0, 1, 2, ...)
  weather: {
    temperature: number;
    feelsLike: number;
    condition: string;
    precipitationProbability: number;
    windSpeed: number;
    visibilityKm: number;
    hazardLevel: "safe" | "caution" | "danger";
    hazardReason?: string;
  };
}

export interface RoutePlan {
  origin: string;
  destination: string;
  totalDistanceKm: number;
  estimatedTravelTimeHours: number;
  safetyScore: number; // 0 - 100
  overallRiskLevel: "low" | "moderate" | "high";
  departureAdvice: string;
  waypoints: RouteWaypoint[];
}

// Haversine formula to compute great-circle distance between two points
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Weather code interpreter
function interpretWmoCode(code: number): string {
  if (code === 0) return "Clear Skies";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Dense Fog";
  if (code >= 51 && code <= 55) return "Light Drizzle";
  if (code >= 61 && code <= 65) return "Rain Showers";
  if (code >= 71 && code <= 77) return "Snowfall";
  if (code >= 80 && code <= 82) return "Heavy Rain";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

export class RouteWeatherService {
  /**
   * Plan route weather between two geo locations.
   */
  async planRoute(
    originName: string,
    originLat: number,
    originLon: number,
    destinationName: string,
    destLat: number,
    destLon: number,
    speedKmH: number = 70
  ): Promise<RoutePlan> {
    const totalDistanceKm = calculateDistanceKm(originLat, originLon, destLat, destLon);
    const estimatedTravelTimeHours = Math.max(1, Math.round(totalDistanceKm / speedKmH));

    // Create 5 waypoints: 0% (Origin), 25%, 50%, 75%, 100% (Destination)
    const fractions = [0, 0.25, 0.5, 0.75, 1.0] as const;

    const waypoints: RouteWaypoint[] = [];
    let safetyScoreAcc = 100;
    let criticalHazardCount = 0;

    for (let i = 0; i < fractions.length; i++) {
      const frac = fractions[i] ?? 0;
      const curLat = originLat + (destLat - originLat) * frac;
      const curLon = originLon + (destLon - originLon) * frac;
      const distanceSoFar = Math.round(totalDistanceKm * frac);
      const arrivalHour = Math.round(estimatedTravelTimeHours * frac);

      let wpName = `${Math.round(frac * 100)}% Corridor Checkpoint`;
      if (i === 0) wpName = originName;
      if (i === fractions.length - 1) wpName = destinationName;
      if (i === 2) wpName = `Midway Corridor (${distanceSoFar} km)`;

      // Fetch hourly forecast for this checkpoint from Open-Meteo
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${curLat.toFixed(
          4
        )}&longitude=${curLon.toFixed(
          4
        )}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m,visibility&forecast_days=2`;
        const res = await fetch(url, { next: { revalidate: 300 } });
        const data = await res.json();

        const hourIndex = Math.min(arrivalHour, (data.hourly?.time?.length || 24) - 1);
        const temp = data.hourly?.temperature_2m?.[hourIndex] ?? 24;
        const feels = data.hourly?.apparent_temperature?.[hourIndex] ?? temp;
        const precipProb = data.hourly?.precipitation_probability?.[hourIndex] ?? 10;
        const wmo = data.hourly?.weathercode?.[hourIndex] ?? 0;
        const wind = data.hourly?.windspeed_10m?.[hourIndex] ?? 12;
        const visMeters = data.hourly?.visibility?.[hourIndex] ?? 10000;
        const visKm = Math.round(visMeters / 1000);
        const condition = interpretWmoCode(wmo);

        // Hazard Evaluation
        let hazardLevel: "safe" | "caution" | "danger" = "safe";
        let hazardReason: string | undefined;

        if (wmo >= 95 || wmo >= 80 || wind > 45 || temp < 0) {
          hazardLevel = "danger";
          criticalHazardCount++;
          safetyScoreAcc -= 22;
          if (wmo >= 95) hazardReason = "Active Thunderstorm & Severe Lightning Risk";
          else if (wmo >= 80) hazardReason = "Torrential Downpour & Hydroplaning Hazard";
          else if (temp < 0) hazardReason = "Freezing Temperatures & Black Ice Danger";
          else hazardReason = "High Dangerous Crosswinds";
        } else if (wmo === 45 || wmo === 48 || visKm < 2 || precipProb > 60 || wind > 30) {
          hazardLevel = "caution";
          safetyScoreAcc -= 12;
          if (wmo === 45 || visKm < 2) hazardReason = "Reduced Visibility & Dense Fog Corridor";
          else if (precipProb > 60) hazardReason = "Elevated Precipitation & Wet Highway";
          else hazardReason = "Gusty Crosswinds Along Open Highway";
        }

        waypoints.push({
          name: wpName,
          latitude: Number(curLat.toFixed(4)),
          longitude: Number(curLon.toFixed(4)),
          distanceKm: distanceSoFar,
          estimatedArrivalHour: arrivalHour,
          weather: {
            temperature: Math.round(temp),
            feelsLike: Math.round(feels),
            condition,
            precipitationProbability: precipProb,
            windSpeed: Math.round(wind),
            visibilityKm: visKm,
            hazardLevel,
            hazardReason,
          },
        });
      } catch (err) {
        // Fallback gracefully
        waypoints.push({
          name: wpName,
          latitude: Number(curLat.toFixed(4)),
          longitude: Number(curLon.toFixed(4)),
          distanceKm: distanceSoFar,
          estimatedArrivalHour: arrivalHour,
          weather: {
            temperature: 25,
            feelsLike: 25,
            condition: "Fair Weather",
            precipitationProbability: 15,
            windSpeed: 10,
            visibilityKm: 10,
            hazardLevel: "safe",
          },
        });
      }
    }

    const finalSafetyScore = Math.max(20, Math.min(100, safetyScoreAcc));
    let overallRiskLevel: "low" | "moderate" | "high" = "low";
    let departureAdvice = "Excellent travel window. Highway conditions remain clear and optimal.";

    if (finalSafetyScore < 60 || criticalHazardCount > 0) {
      overallRiskLevel = "high";
      departureAdvice =
        "High travel disruption potential. Significant severe weather or ice/fog detected along route. Consider delaying departure.";
    } else if (finalSafetyScore < 85) {
      overallRiskLevel = "moderate";
      departureAdvice =
        "Passable corridor with localized weather caution (wet pavement, fog, or moderate crosswinds). Exercise defensive driving.";
    }

    return {
      origin: originName,
      destination: destinationName,
      totalDistanceKm,
      estimatedTravelTimeHours,
      safetyScore: finalSafetyScore,
      overallRiskLevel,
      departureAdvice,
      waypoints,
    };
  }
}

export const routeWeatherService = new RouteWeatherService();
