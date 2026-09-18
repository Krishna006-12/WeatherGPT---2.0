export type WeatherMascotType = "sunny" | "cloudy" | "rainy" | "snowy";

export interface WeatherMascotData {
  type: WeatherMascotType;
  imageSrc: string;
  cardImageSrc: string;
  title: string;
  activityTip: string;
  outfitTip: string;
  moodGradient: string;
  accentColor: string;
  badgeLabel: string;
}

/**
 * Returns the mascot character configuration dynamically tailored to the
 * current weather condition, temperature, wind speed, and precipitation.
 *
 * Modeled after the Samsung One UI minimalist vector walking character:
 * - Sunny: Coffee stroll in light hoodie & warm sunshine
 * - Cloudy/Windy: Flowing windbreaker jacket against autumn wind & leaves
 * - Rainy: Overhead umbrella, bright yellow raincoat & rubber boots
 * - Snowy: Cozy blue puffer jacket, crossbody bag, beanie & footprints in snow
 */
export function getWeatherMascot(
  condition: string,
  temperature?: number,
  windSpeed?: number
): WeatherMascotData {
  const c = (condition || "").toLowerCase();
  const temp = temperature !== undefined ? temperature : 22;
  const wind = windSpeed !== undefined ? windSpeed : 10;

  // 1. Snowy / Freezing conditions (temp <= 0 or snow/ice/sleet in condition)
  if (
    c.includes("snow") ||
    c.includes("sleet") ||
    c.includes("ice") ||
    c.includes("blizzard") ||
    c.includes("freezing") ||
    c.includes("hail") ||
    temp <= 1
  ) {
    return {
      type: "snowy",
      imageSrc: "/images/mascot/snowy.webp",
      cardImageSrc: "/images/mascot/snowy-card.webp",
      title: "Snowy Path",
      activityTip: "Cold wintry weather. Step carefully on frost and fresh snow.",
      outfitTip: "Warm blue puffer coat, thermal layers, beanie & winter boots.",
      moodGradient: "linear-gradient(180deg, rgba(224, 242, 254, 0.15) 0%, rgba(186, 230, 253, 0.05) 100%)",
      accentColor: "#38bdf8",
      badgeLabel: "Winter Walk",
    };
  }

  // 2. Rainy / Storm / Drizzle conditions
  if (
    c.includes("rain") ||
    c.includes("drizzle") ||
    c.includes("shower") ||
    c.includes("storm") ||
    c.includes("thunder")
  ) {
    return {
      type: "rainy",
      imageSrc: "/images/mascot/rainy.webp",
      cardImageSrc: "/images/mascot/rainy-card.webp",
      title: "Rainy Day",
      activityTip: "Precipitation in progress. Watch out for puddles and slippery roads.",
      outfitTip: "Waterproof raincoat, umbrella & slip-resistant rubber boots.",
      moodGradient: "linear-gradient(180deg, rgba(20, 184, 166, 0.15) 0%, rgba(13, 148, 136, 0.05) 100%)",
      accentColor: "#14b8a6",
      badgeLabel: "Rain Shield",
    };
  }

  // 3. Cloudy, Overcast, Windy, Fog, or Mist
  if (
    c.includes("cloud") ||
    c.includes("overcast") ||
    c.includes("fog") ||
    c.includes("mist") ||
    c.includes("haze") ||
    c.includes("smoke") ||
    c.includes("dust") ||
    wind > 24
  ) {
    return {
      type: "cloudy",
      imageSrc: "/images/mascot/cloudy.webp",
      cardImageSrc: "/images/mascot/cloudy-card.webp",
      title: "Cloudy & Windy",
      activityTip: "Breezy conditions and muted sunlight across the horizon.",
      outfitTip: "Windbreaker jacket, casual joggers & eyewear to shield breezes.",
      moodGradient: "linear-gradient(180deg, rgba(251, 146, 60, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)",
      accentColor: "#f97316",
      badgeLabel: "Windy Breeze",
    };
  }

  // 4. Default Sunny / Clear / Fair
  return {
    type: "sunny",
    imageSrc: "/images/mascot/sunny.webp",
    cardImageSrc: "/images/mascot/sunny-card.webp",
    title: "Sunny Walk",
    activityTip: "Crisp and pleasant sunshine. Ideal for a walk with a hot beverage.",
    outfitTip: "Light hoodie, breathable casual wear & comfortable sneakers.",
    moodGradient: "linear-gradient(180deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
    accentColor: "#f59e0b",
    badgeLabel: "Sunny Stroll",
  };
}
