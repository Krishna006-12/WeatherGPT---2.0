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
 * Mascot: "Aero" (에어로) — Designed with Samsung One UI weather design language:
 * - Sunny: Warm golden corona & radiant sunlight motes
 * - Cloudy/Windy: Warm knit breeze scarf & flowing wind trails
 * - Rainy: Translucent cyan rain slicker, umbrella & floating water droplets
 * - Snowy: Powder blue knit earmuffs, winter sweater & crystalline frost sparkles
 */
export function getWeatherMascot(
  condition: string,
  temperature?: number,
  windSpeed?: number,
  t?: (key: string, defaultText?: string) => string
): WeatherMascotData {
  const c = (condition || "").toLowerCase();
  const temp = temperature !== undefined ? temperature : 22;
  const wind = windSpeed !== undefined ? windSpeed : 10;
  const tr = t || ((_k: string, defaultText?: string) => defaultText || "");

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
      title: tr("mascot.title.snowy_path", "Snowy Path"),
      activityTip: tr("mascot.activity.snowy", "Cold wintry weather. Step carefully on frost and fresh snow."),
      outfitTip: tr("mascot.outfit.snowy", "Cozy powder-blue earmuffs, knitted winter sweater & warm boots."),
      moodGradient: "linear-gradient(180deg, rgba(224, 242, 254, 0.15) 0%, rgba(186, 230, 253, 0.05) 100%)",
      accentColor: "#38bdf8",
      badgeLabel: tr("mascot.badge.winter_walk", "Winter Walk"),
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
      title: tr("mascot.title.rainy_day", "Rainy Day"),
      activityTip: tr("mascot.activity.rainy", "Precipitation in progress. Watch out for puddles and slippery roads."),
      outfitTip: tr("mascot.outfit.rainy", "Translucent cyan raincoat, floating umbrella & slip-resistant boots."),
      moodGradient: "linear-gradient(180deg, rgba(20, 184, 166, 0.15) 0%, rgba(13, 148, 136, 0.05) 100%)",
      accentColor: "#14b8a6",
      badgeLabel: tr("mascot.badge.rain_shield", "Rain Shield"),
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
      title: tr("mascot.title.cloudy_windy", "Cloudy & Windy"),
      activityTip: tr("mascot.activity.cloudy", "Breezy conditions and muted sunlight across the horizon."),
      outfitTip: tr("mascot.outfit.cloudy", "Warm knitted breeze scarf, windbreaker jacket & wind shield."),
      moodGradient: "linear-gradient(180deg, rgba(251, 146, 60, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)",
      accentColor: "#f97316",
      badgeLabel: tr("mascot.badge.windy_breeze", "Windy Breeze"),
    };
  }

  // 4. Default Sunny / Clear / Fair
  return {
    type: "sunny",
    imageSrc: "/images/mascot/sunny.webp",
    cardImageSrc: "/images/mascot/sunny-card.webp",
    title: tr("mascot.title.sunny_walk", "Sunny Walk"),
    activityTip: tr("mascot.activity.sunny", "Crisp and pleasant sunshine. Ideal for a walk with a hot beverage."),
    outfitTip: tr("mascot.outfit.sunny", "Warm golden sunlight aura, breathable casual wear & sneakers."),
    moodGradient: "linear-gradient(180deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
    accentColor: "#f59e0b",
    badgeLabel: tr("mascot.badge.sunny_stroll", "Sunny Stroll"),
  };
}
