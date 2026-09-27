/**
 * Persona Profiles Configuration — WeatherGPT 2.0.
 *
 * Provides declarative configurations and templates for pilot personas:
 * 1. "general_public" — Everyday commuting, clothing, hydration, and direct safety.
 * 2. "farmer" — Agricultural decision intelligence, crop stages, spraying windows, and soil moisture.
 *
 * RULE:
 * Persona logic lives strictly as configuration and templates, never hardcoded branching.
 */

import type { Alert } from "@/types/alert";
import type { PersonaId, PersonaProfile, PersonaAdvisoryContext } from "@/types/persona";

export const GENERAL_PUBLIC_PERSONA: PersonaProfile = {
  id: "general_public",
  name: "General Public",
  description: "Everyday decisions: commuting, daily clothing, hydration, and immediate weather awareness.",
  detailLevel: "concise",
  units: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
  },
  prioritizedAlertCategories: ["heat", "cyclone", "thunderstorm", "air_quality", "heavy_rain"],
  advisoryFocus: [
    "commute and travel ease",
    "outdoor comfort and hydration",
    "umbrella and clothing suggestions",
    "direct physical safety and storm shelter",
  ],
  instructionAddendum: `// ============================================================
// ACTIVE PERSONA: GENERAL PUBLIC (Daily Citizen)
// ============================================================
- Audience: Everyday citizens, commuters, families, and individuals.
- Persona: Warm, intuitive personal weather companion looking out for the user's daily plans.
- Priorities:
  1. Actionable daily guidance: what to wear, whether an umbrella/sunglasses is needed, and commute outlook.
  2. Real-life comfort & health: hydration during heatwaves, warmth during cold spells, air quality precautions.
  3. Outdoor activity planning: highlight optimal times for walks, workouts, or errands.
  4. Direct safety guidance during active severe weather without sounding robotic or alarmist.
- Style: Warm, friendly, helpful, and scannable with practical tips.`,
  formatAdvisory(ctx: PersonaAdvisoryContext): string {
    const hasHeat = ctx.alerts?.some((a) => a.category === "heat");
    const hasRain = ctx.alerts?.some((a) => a.category === "heavy_rain") || (ctx.rainfallMm ?? 0) > 5;
    const hasStorm = ctx.alerts?.some((a) => a.category === "thunderstorm" || a.category === "cyclone");

    if (ctx.language === "hi") {
      if (hasStorm) {
        return "सुरक्षा सलाह: आपके क्षेत्र में गंभीर तूफान की चेतावनी सक्रिय है। अनावश्यक बाहरी यात्रा से बचें और सुरक्षित स्थान पर रहें।";
      }
      if (hasHeat) {
        return "स्वास्थ्य सलाह: अत्यधिक गर्मी की स्थिति। पर्याप्त मात्रा में पानी पिएं और दोपहर के समय सीधी धूप से बचें।";
      }
      if (hasRain) {
        return "यात्रा सलाह: बारिश की संभावना है। छाता साथ रखें और सुरक्षित यात्रा करें।";
      }
      return `दैनिक सलाह: ${ctx.locationName} में बाहरी गतिविधियों और दैनिक कार्यों के लिए मौसम अनुकूल है।`;
    }

    if (ctx.language === "pa") {
      if (hasStorm) {
        return "ਸੁਰੱਖਿਆ ਸਲਾਹ: ਤੁਹਾਡੇ ਖੇਤਰ ਵਿੱਚ ਗੰਭੀਰ ਤੂਫ਼ਾਨ ਦੀ ਚੇਤਾਵਨੀ ਹੈ। ਬੇਲੋੜੀ ਬਾਹਰੀ ਯਾਤਰਾ ਤੋਂ ਬਚੋ ਅਤੇ ਸੁਰੱਖਿਅਤ ਰਹੋ।";
      }
      if (hasHeat) {
        return "ਸਿਹਤ ਸਲਾਹ: ਵਧੇਰੇ ਗਰਮੀ ਹੈ। ਖੂਬ ਪਾਣੀ ਪੀਓ ਅਤੇ ਦੁਪਹਿਰ ਦੀ ਧੁੱਪ ਤੋਂ ਬਚੋ।";
      }
      if (hasRain) {
        return "ਯਾਤਰਾ ਸਲਾਹ: ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਛਤਰੀ ਨਾਲ ਰੱਖੋ।";
      }
      return `ਰੋਜ਼ਾਨਾ ਸਲਾਹ: ${ctx.locationName} ਵਿੱਚ ਬਾਹਰੀ ਕੰਮਾਂ ਲਈ ਮੌਸਮ ਅਨੁਕੂਲ ਹੈ।`;
    }

    if (ctx.language === "hi-en") {
      if (hasStorm) {
        return "Safety Advisory: Area me active severe storm alert hai. Unnecessary outdoor travel avoid karein aur indoors safe rahein.";
      }
      if (hasHeat) {
        return "Health Advisory: Elevated heat conditions hain. Paani khoob piyein aur direct afternoon sun exposure avoid karein.";
      }
      if (hasRain) {
        return "Commute Advisory: Barish expected hai. Umbrella saath rakhein aur safely commute karein.";
      }
      return `Daily Advisory: ${ctx.locationName} me outdoor activities aur daily commute ke liye pleasant mausam hai.`;
    }

    if (hasStorm) {
      return "Safety Advisory: Active severe storm warnings in your area. Avoid unnecessary outdoor travel and stay indoors.";
    }
    if (hasHeat) {
      return "Health Advisory: Elevated heat conditions. Stay well hydrated and limit prolonged direct sun exposure during peak afternoon hours.";
    }
    if (hasRain) {
      return "Commute Advisory: Wet weather expected. Keep an umbrella on hand and anticipate slower travel speeds.";
    }
    return `Daily Advisory: Pleasant conditions for outdoor activities and commuting in ${ctx.locationName}.`;
  },
};

export const FARMER_PERSONA: PersonaProfile = {
  id: "farmer",
  name: "Farmer / Agricultural Producer",
  description: "Agronomic decision support: crop safety, sowing, irrigation, pesticide spraying, and harvest protection.",
  detailLevel: "technical",
  units: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
  },
  prioritizedAlertCategories: ["heavy_rain", "flood", "heat", "cold_wave", "cyclone", "wind"],
  advisoryFocus: [
    "soil moisture and waterlogging management",
    "spraying efficacy (wind drift & rain wash-off risks)",
    "irrigation scheduling and conservation",
    "crop thermal stress and frost defense",
    "harvest protection and post-harvest drying",
  ],
  instructionAddendum: `// ============================================================
// ACTIVE PERSONA: AGRICULTURAL PRODUCER (Farmer)
// ============================================================
- Audience: Farmers, agronomists, and agricultural planners.
- Tone: Professional, practical, technical, and focused on agronomic outcomes.
- Priorities:
  1. Soil and field workability: evaluate waterlogging, field compaction, and drying windows.
  2. Chemical application windows: highlight pesticide/fertilizer wash-off risk (rainfall) and spray drift risk (wind speed > 15 km/h).
  3. Crop thermal thresholds: identify heat stress (flowering stage) and frost risk (cold wave).
  4. Specific crops: if a crop is mentioned or detected, tailor guidance to its specific growth phase.
- Style: Deliver actionable agricultural intelligence with specific meteorological metrics.`,
  formatAdvisory(ctx: PersonaAdvisoryContext): string {
    const cropLabel = ctx.crop ? ` for ${ctx.crop}` : "";
    const rain = ctx.rainfallMm ?? 0;
    const wind = ctx.windSpeedKmh ?? 0;

    const hasFlood = ctx.alerts?.some((a) => a.category === "flood" || a.category === "heavy_rain");
    const hasHeat = ctx.alerts?.some((a) => a.category === "heat");
    const hasCold = ctx.alerts?.some((a) => a.category === "cold_wave");

    if (ctx.language === "hi") {
      const cropLabelHi = ctx.crop ? ` (${ctx.crop} फसल)` : "";
      if (hasFlood || rain >= 30) {
        return `कृषि सलाह${cropLabelHi}: भारी वर्षा का जोखिम (${rain} mm)। सिंचाई तुरंत रोकें और जल निकासी नाली साफ रखें ताकि जड़ों में जलभराव न हो। कीटनाशक छिड़काव स्थगित करें।`;
      }
      if (hasCold || ctx.temperature <= 4) {
        return `कृषि सलाह${cropLabelHi}: शीतलहर/पाला पड़ने का गंभीर खतरा (${ctx.temperature}°C)। फसलों की सुरक्षा के लिए शाम को हल्की सिंचाई करें।`;
      }
      if (hasHeat || ctx.temperature >= 38) {
        return `कृषि सलाह${cropLabelHi}: उच्च तापमान तनाव (${ctx.temperature}°C)। नमी बनाए रखने और वाष्पीकरण से बचने के लिए सुबह जल्दी सिंचाई करें।`;
      }
      if (wind >= 20) {
        return `कृषि सलाह${cropLabelHi}: हवा की गति ${wind} km/h होने से स्प्रे के बह जाने का खतरा है। मौसम शांत होने तक छिड़काव टालें।`;
      }
      return `कृषि सलाह${cropLabelHi}: ${ctx.locationName} में नियमित कृषि कार्यों, जुताई और खेत की देखभाल के लिए मौसम अनुकूल है।`;
    }

    if (ctx.language === "pa") {
      const cropLabelPa = ctx.crop ? ` (${ctx.crop} ਫ਼ਸਲ)` : "";
      if (hasFlood || rain >= 30) {
        return `ਖੇਤੀਬਾੜੀ ਸਲਾਹ${cropLabelPa}: ਭਾਰੀ ਮੀਂਹ ਦਾ ਖ਼ਤਰਾ (${rain} mm)। ਸਿੰਚਾਈ ਤੁਰੰਤ ਰੋਕੋ ਅਤੇ ਨਿਕਾਸੀ ਨਾਲੀਆਂ ਸਾਫ਼ ਕਰੋ।`;
      }
      if (hasCold || ctx.temperature <= 4) {
        return `ਖੇਤੀਬਾੜੀ ਸਲਾਹ${cropLabelPa}: ਕੋਰੇ/ਠੰਢ ਦਾ ਖ਼ਤਰਾ (${ctx.temperature}°C)। ਫ਼ਸਲਾਂ ਦੀ ਸੁਰੱਖਿਆ ਲਈ ਸ਼ਾਮ ਨੂੰ ਹਲਕੀ ਸਿੰਚਾਈ ਕਰੋ।`;
      }
      if (hasHeat || ctx.temperature >= 38) {
        return `ਖੇਤੀਬਾੜੀ ਸਲਾਹ${cropLabelPa}: ਵਧੇਰੇ ਗਰਮੀ ਦਾ ਤਣਾਅ (${ctx.temperature}°C)। ਸਵੇਰੇ ਜਲਦੀ ਸਿੰਚਾਈ ਕਰੋ।`;
      }
      if (wind >= 20) {
        return `ਖੇਤੀਬਾੜੀ ਸਲਾਹ${cropLabelPa}: ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ ${wind} km/h ਹੋਣ ਕਰਕੇ ਸਪਰੇਅ ਕਰਨ ਤੋਂ ਬਚੋ।`;
      }
      return `ਖੇਤੀਬਾੜੀ ਸਲਾਹ${cropLabelPa}: ${ctx.locationName} ਵਿੱਚ ਖੇਤੀਬਾੜੀ ਦੇ ਕੰਮਾਂ ਲਈ ਮੌਸਮ ਅਨੁਕੂਲ ਹੈ।`;
    }

    if (hasFlood || rain >= 30) {
      return `Agronomic Advisory${cropLabel}: Heavy precipitation risk (${rain} mm). Suspend irrigation immediately and clear drainage channels to prevent root-zone waterlogging. Delay chemical spraying.`;
    }
    if (hasCold || ctx.temperature <= 4) {
      return `Agronomic Advisory${cropLabel}: Severe frost/cold stress detected (${ctx.temperature}°C). Apply light evening irrigation or mulch to protect sensitive crop root systems.`;
    }
    if (hasHeat || ctx.temperature >= 38) {
      return `Agronomic Advisory${cropLabel}: High heat stress (${ctx.temperature}°C). Schedule irrigation during cooler early-morning hours to maintain plant transpiration and avoid midday moisture loss.`;
    }
    if (wind >= 20) {
      return `Agronomic Advisory${cropLabel}: Wind speeds of ${wind} km/h present chemical drift risks. Postpone pesticide/foliar spraying until calmer conditions prevail.`;
    }
    return `Agronomic Advisory${cropLabel}: Favorable conditions for routine field operations, cultivation, and scheduled farm activities in ${ctx.locationName}.`;
  },
};

export const DISASTER_MANAGER_PERSONA: PersonaProfile = {
  id: "disaster_manager",
  name: "Disaster & Emergency Manager",
  description: "Incident command decision support: multi-agency coordination, shelter operations, evacuation triggers, and public alert sirens.",
  detailLevel: "technical",
  units: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
  },
  prioritizedAlertCategories: ["cyclone", "flood", "heavy_rain", "thunderstorm", "heat", "cold_wave"],
  advisoryFocus: [
    "emergency shelter activation",
    "drainage culvert inspections",
    "early evacuation triggers",
    "inter-agency incident notifications",
    "critical infrastructure protection",
  ],
  instructionAddendum: `// ============================================================
// ACTIVE PERSONA: DISASTER & EMERGENCY MANAGER (Incident Command)
// ============================================================
- Audience: Disaster response coordinators, civil protection officers, and municipal emergency planners.
- Tone: Decisive, authoritative, structured, and action-oriented.
- Priorities:
  1. Life safety: immediate hazards to populations in vulnerable flood plains, low-lying coastal regions, or structural wind risk zones.
  2. Coordination checklists: clear status on sirens, evacuation warnings, emergency shelters, and emergency service dispatch.
  3. Actionable thresholds: cite exact meteorological trigger metrics (mm/h rain rate, wind gusts in km/h, atmospheric pressure in hPa).
- Style: Bulleted, structured, prioritized checklist format with transparent evidence thresholds.`,
  formatAdvisory(ctx: PersonaAdvisoryContext): string {
    const hasCyclone = ctx.alerts?.some((a) => a.category === "cyclone");
    const hasFlood = ctx.alerts?.some((a) => a.category === "flood" || a.category === "heavy_rain");
    const hasHeat = ctx.alerts?.some((a) => a.category === "heat" && (a.severity === "extreme" || a.severity === "severe"));

    if (ctx.language === "hi") {
      if (hasCyclone) {
        return `आपदा नियंत्रण सलाह: ${ctx.locationName} के लिए सक्रिय चक्रवात चेतावनी। बहु-एजेंसी प्रतिक्रिया शुरू करें और आपातकालीन आश्रय केंद्र तैयार रखें।`;
      }
      if (hasFlood || (ctx.rainfallMm ?? 0) >= 30) {
        return `आपदा नियंत्रण सलाह: गंभीर बाढ़ का जोखिम (${ctx.rainfallMm ?? 0} mm बारिश)। जल निकासी नालों की जांच करें और बचाव इकाइयों को अलर्ट पर रखें।`;
      }
      if (hasHeat || ctx.temperature >= 42) {
        return `आपदा नियंत्रण सलाह: अत्यधिक गर्मी का प्रकोप (${ctx.temperature}°C)। नागरिक कूलिंग केंद्र खोलें और चिकित्सा सेवाओं को सतर्क करें।`;
      }
      return `आपदा नियंत्रण सलाह: सामान्य परिचालन स्थिति। ${ctx.locationName} के क्षेत्रीय टेलीमेट्री में कोई चेतावनी सीमा पार नहीं हुई है।`;
    }

    if (ctx.language === "pa") {
      if (hasCyclone) {
        return `ਆਫ਼ਤ ਪ੍ਰਬੰਧਨ ਸਲਾਹ: ${ctx.locationName} ਲਈ ਚੱਕਰਵਾਤ ਚੇਤਾਵਨੀ। ਐਮਰਜੈਂਸੀ ਸ਼ੈਲਟਰ ਤਿਆਰ ਕਰੋ।`;
      }
      if (hasFlood || (ctx.rainfallMm ?? 0) >= 30) {
        return `ਆਫ਼ਤ ਪ੍ਰਬੰਧਨ ਸਲਾਹ: ਹੜ੍ਹ ਦਾ ਗੰਭੀਰ ਖ਼ਤਰਾ (${ctx.rainfallMm ?? 0} mm ਮੀਂਹ)। ਡਰੇਨੇਜ ਦੀ ਜਾਂਚ ਕਰੋ।`;
      }
      if (hasHeat || ctx.temperature >= 42) {
        return `ਆਫ਼ਤ ਪ੍ਰਬੰਧਨ ਸਲਾਹ: ਅੱਤ ਦੀ ਗਰਮੀ ਦਾ ਖ਼ਤਰਾ (${ctx.temperature}°C)। ਕੂਲਿੰਗ ਸੈਂਟਰ ਖੋਲ੍ਹੋ।`;
      }
      return `ਆਫ਼ਤ ਪ੍ਰਬੰਧਨ ਸਲਾਹ: ਆਮ ਸੰਚਾਲਨ ਸਥਿਤੀ। ${ctx.locationName} ਵਿੱਚ ਸਥਿਤੀ ਆਮ ਹੈ।`;
    }

    if (hasCyclone) {
      return `Incident Command Advisory: Active Cyclone Warning for ${ctx.locationName}. Initiate Tier-1 multi-agency response, inspect coastal barriers, and prepare emergency shelter evacuation centers.`;
    }
    if (hasFlood || (ctx.rainfallMm ?? 0) >= 30) {
      return `Incident Command Advisory: Severe flood risk detected (${ctx.rainfallMm ?? 0} mm rain). Verify clear storm culverts, notify low-lying sector wardens, and place water rescue units on standby.`;
    }
    if (hasHeat || ctx.temperature >= 42) {
      return `Incident Command Advisory: Extreme heat hazard (${ctx.temperature}°C). Open municipal cooling stations and coordinate public health alerts with medical services.`;
    }
    return `Incident Command Advisory: Normal operational posture. Regional telemetry in ${ctx.locationName} shows no active threshold excursions.`;
  },
};

export const PERSONA_REGISTRY: Record<PersonaId, PersonaProfile> = {
  general_public: GENERAL_PUBLIC_PERSONA,
  farmer: FARMER_PERSONA,
  disaster_manager: DISASTER_MANAGER_PERSONA,
};

/**
 * Retrieve a persona profile by ID, safely defaulting to "general_public".
 */
export function getPersonaProfile(id?: string | null): PersonaProfile {
  if (id === "farmer") {
    return FARMER_PERSONA;
  }
  if (id === "disaster_manager") {
    return DISASTER_MANAGER_PERSONA;
  }
  return GENERAL_PUBLIC_PERSONA;
}

/**
 * Prioritizes a list of alerts based on persona configuration.
 * Categories prioritized by the persona are floated to the top while preserving severity order.
 */
export function prioritizeAlertsForPersona(
  alerts: Alert[],
  personaIdOrProfile?: PersonaId | PersonaProfile
): Alert[] {
  if (!alerts || alerts.length === 0) return [];

  const profile =
    typeof personaIdOrProfile === "string"
      ? getPersonaProfile(personaIdOrProfile)
      : personaIdOrProfile || GENERAL_PUBLIC_PERSONA;

  const severityWeight: Record<Alert["severity"], number> = {
    extreme: 100,
    severe: 50,
    moderate: 20,
    minor: 10,
  };

  return [...alerts].sort((a, b) => {
    // 1. Extreme alerts always lead regardless of persona
    if (a.severity === "extreme" && b.severity !== "extreme") return -1;
    if (b.severity === "extreme" && a.severity !== "extreme") return 1;

    // 2. Persona category priority
    const aIsPrioritized = profile.prioritizedAlertCategories.includes(a.category);
    const bIsPrioritized = profile.prioritizedAlertCategories.includes(b.category);

    const aScore = severityWeight[a.severity] + (aIsPrioritized ? 30 : 0);
    const bScore = severityWeight[b.severity] + (bIsPrioritized ? 30 : 0);

    return bScore - aScore;
  });
}
