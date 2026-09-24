import type { SupportedLanguage } from "./translations";

export interface LocalizedLocationNames {
  cityName: string;
  regionName?: string;
  countryName?: string;
  fullDisplayName: string;
}

/**
 * Multilingual city names for Hindi (hi) and Punjabi (pa).
 */
const CITY_TRANSLATIONS: Record<string, { hi: string; pa: string }> = {
  // Uttar Pradesh & NCR
  kanpur: { hi: "कानपुर", pa: "ਕਾਨਪੁਰ" },
  lucknow: { hi: "लखनऊ", pa: "ਲਖਨਊ" },
  delhi: { hi: "दिल्ली", pa: "ਦਿੱਲੀ" },
  "new delhi": { hi: "नई दिल्ली", pa: "ਨਵੀਂ ਦਿੱਲੀ" },
  noida: { hi: "नोएडा", pa: "ਨੋਇਡਾ" },
  "greater noida": { hi: "ग्रेटर नोएडा", pa: "ਗ੍ਰੇਟਰ ਨੋਇਡਾ" },
  ghaziabad: { hi: "गाजियाबाद", pa: "ਗ਼ਾਜ਼ੀਆਬਾਦ" },
  faridabad: { hi: "फरीदाबाद", pa: "ਫਰੀਦਾਬਾਦ" },
  gurugram: { hi: "गुरुग्राम", pa: "ਗੁਰੂਗ੍ਰਾਮ" },
  gurgaon: { hi: "गुरुग्राम", pa: "ਗੁਰੂਗ੍ਰਾਮ" },
  varanasi: { hi: "वाराणसी", pa: "ਵਾਰਾਨਸੀ" },
  banaras: { hi: "बनारस", pa: "ਬਨਾਰਸ" },
  kashi: { hi: "काशी", pa: "ਕਾਸ਼ੀ" },
  prayagraj: { hi: "प्रयागराज", pa: "ਪ੍ਰਯਾਗਰਾਜ" },
  allahabad: { hi: "प्रयागराज", pa: "ਪ੍ਰਯਾਗਰਾਜ" },
  agra: { hi: "आगरा", pa: "ਆਗਰਾ" },
  meerut: { hi: "मेरठ", pa: "ਮੇਰਠ" },
  bareilly: { hi: "बरेली", pa: "ਬਰੇਲੀ" },
  aligarh: { hi: "अलीगढ़", pa: "ਅਲੀਗੜ੍ਹ" },
  moradabad: { hi: "मुरादाबाद", pa: "ਮੁਰਾਦਾਬਾਦ" },
  saharanpur: { hi: "सहारनपुर", pa: "ਸਹਾਰਨਪੁਰ" },
  gorakhpur: { hi: "गोरखपुर", pa: "ਗੋਰਖਪੁਰ" },
  ayodhya: { hi: "अयोध्या", pa: "ਅਯੁੱਧਿਆ" },
  jhansi: { hi: "झांसी", pa: "ਝਾਂਸੀ" },
  muzaffarnagar: { hi: "मुजफ्फरनगर", pa: "ਮੁਜ਼ੱਫਰਨਗਰ" },
  mathura: { hi: "मथुरा", pa: "ਮਥੁਰਾ" },
  firozabad: { hi: "फिरोजाबाद", pa: "ਫਿਰੋਜ਼ਾਬਾਦ" },

  // Punjab & Haryana
  amritsar: { hi: "अमृतसर", pa: "ਅੰਮ੍ਰਿਤਸਰ" },
  ludhiana: { hi: "लुधियाना", pa: "ਲੁਧਿਆਣਾ" },
  jalandhar: { hi: "जालंधर", pa: "ਜਲੰਧਰ" },
  chandigarh: { hi: "चंडीगढ़", pa: "ਚੰਡੀਗੜ੍ਹ" },
  patiala: { hi: "पटियाला", pa: "ਪਟਿਆਲਾ" },
  bathinda: { hi: "बठिंडा", pa: "ਬਠਿੰਡਾ" },
  mohali: { hi: "मोहाली", pa: "ਮੋਹਾਲੀ" },
  hoshiarpur: { hi: "होशियारपुर", pa: "ਹੁਸ਼ਿਆਰਪੁਰ" },
  pathankot: { hi: "पठानकोट", pa: "ਪਠਾਨਕੋਟ" },
  moga: { hi: "मोगा", pa: "ਮੋਗਾ" },
  kapurthala: { hi: "कपूरथला", pa: "ਕਪੂਰਥਲਾ" },
  sangrur: { hi: "संगरूर", pa: "ਸੰਗਰੂਰ" },
  firozpur: { hi: "फिरोजपुर", pa: "ਫ਼ਿਰੋਜ਼ਪੁਰ" },
  batala: { hi: "बटाला", pa: "ਬਟਾਲਾ" },
  abohar: { hi: "अबोहर", pa: "ਅਬੋਹਰ" },
  khanna: { hi: "खन्ना", pa: "ਖੰਨਾ" },
  phagwara: { hi: "फगवाड़ा", pa: "ਫਗਵਾੜਾ" },
  ambala: { hi: "अंबाला", pa: "ਅੰਬਾਲਾ" },
  panipat: { hi: "पानीपत", pa: "ਪਾਨੀਪਤ" },
  karnal: { hi: "करनाल", pa: "ਕਰਨਾਲ" },
  sonipat: { hi: "सोनीपत", pa: "ਸੋਨੀਪਤ" },
  rohtak: { hi: "रोहतक", pa: "ਰੋਹਤਕ" },
  hisar: { hi: "हिसार", pa: "ਹਿਸਾਰ" },

  // Himachal & Uttarakhand
  shimla: { hi: "शिमला", pa: "ਸ਼ਿਮਲਾ" },
  dehradun: { hi: "देहरादून", pa: "ਦੇਹਰਾਦੂਨ" },
  haridwar: { hi: "हरिद्वार", pa: "ਹਰਿਦੁਆਰ" },
  rishikesh: { hi: "ऋषिकेश", pa: "ਰਿਸ਼ੀਕੇਸ਼" },
  dharamshala: { hi: "धर्मशाला", pa: "ਧਰਮਸ਼ਾਲਾ" },
  manali: { hi: "मनाली", pa: "ਮਨਾਲੀ" },
  kullu: { hi: "कुल्लू", pa: "ਕੁੱਲੂ" },

  // Jammu & Kashmir
  srinagar: { hi: "श्रीनगर", pa: "ਸ਼੍ਰੀਨਗਰ" },
  jammu: { hi: "जम्मू", pa: "ਜੰਮੂ" },

  // Major Indian Metros & Capitals
  mumbai: { hi: "मुंबई", pa: "ਮੁੰਬਈ" },
  bengaluru: { hi: "बेंगलुरु", pa: "ਬੈਂਗਲੁਰੂ" },
  bangalore: { hi: "बेंगलुरु", pa: "ਬੈਂਗਲੁਰੂ" },
  kolkata: { hi: "कोलकाता", pa: "ਕੋਲਕਾਤਾ" },
  chennai: { hi: "चेन्नई", pa: "ਚੇਨਈ" },
  hyderabad: { hi: "हैदराबाद", pa: "ਹੈਦਰਾਬਾਦ" },
  ahmedabad: { hi: "अहमदाबाद", pa: "ਅਹਿਮਦਾਬਾਦ" },
  pune: { hi: "पुणे", pa: "ਪੁਣੇ" },
  surat: { hi: "सूरत", pa: "ਸੂਰਤ" },
  jaipur: { hi: "जयपुर", pa: "ਜੈਪੁਰ" },
  jodhpur: { hi: "जोधपुर", pa: "ਜੋਧਪੁਰ" },
  udaipur: { hi: "उदयपुर", pa: "ਉਦੈਪੁਰ" },
  kota: { hi: "कोटा", pa: "ਕੋਟਾ" },
  ajmer: { hi: "अजमेर", pa: "ਅਜਮੇਰ" },
  bhopal: { hi: "भोपाल", pa: "ਭੋਪਾਲ" },
  indore: { hi: "इंदौर", pa: "ਇੰਦੌਰ" },
  gwalior: { hi: "ग्वालियर", pa: "ਗਵਾਲੀਅਰ" },
  jabalpur: { hi: "जबलपुर", pa: "ਜਬਲਪੁਰ" },
  patna: { hi: "पटना", pa: "ਪਟਨਾ" },
  gaya: { hi: "गया", pa: "ਗਯਾ" },
  ranchi: { hi: "रांची", pa: "ਰਾਂਚੀ" },
  dhanbad: { hi: "धनबाद", pa: "ਧਨਬਾਦ" },
  nagpur: { hi: "नागपुर", pa: "ਨਾਗਪੁਰ" },
  nashik: { hi: "नासिक", pa: "ਨਾਸਿਕ" },
  aurangabad: { hi: "औरंगाबाद", pa: "ਔਰੰਗਾਬਾਦ" },
  rajkot: { hi: "राजकोट", pa: "ਰਾਜਕੋਟ" },
  vadodara: { hi: "वडोदरा", pa: "ਵਡੋਦਰਾ" },
  raipur: { hi: "रायपुर", pa: "ਰਾਏਪੁਰ" },
  bhubaneswar: { hi: "भुवनेश्वर", pa: "ਭੁਵਨੇਸ਼ਵਰ" },
  cuttack: { hi: "कटक", pa: "ਕਟਕ" },
  guwahati: { hi: "गुवाहाटी", pa: "ਗੁਵਾਹਾਟੀ" },
  coimbatore: { hi: "कोयंबटूर", pa: "ਕੋਇੰਬਟੂਰ" },
  madurai: { hi: "मदुरै", pa: "ਮਦੁਰੈ" },
  salem: { hi: "सेलम", pa: "ਸੇਲਮ" },
  kochi: { hi: "कोच्चि", pa: "ਕੋਚੀ" },
  thiruvananthapuram: { hi: "तिरुवनंतपुरम", pa: "ਤਿਰੂਵਨੰਤਪੁਰਮ" },
  visakhapatnam: { hi: "विशाखापत्तनम", pa: "ਵਿਸ਼ਾਖਾਪਟਨਮ" },
  vijayawada: { hi: "विजयवाड़ा", pa: "ਵਿਜੇਵਾੜਾ" },
  warangal: { hi: "वारंगल", pa: "ਵਾਰੰਗਲ" },

  // International Cities
  london: { hi: "लंदन", pa: "ਲੰਡਨ" },
  paris: { hi: "पेरिस", pa: "ਪੈਰਿਸ" },
  "new york": { hi: "न्यूयॉर्क", pa: "ਨਿਊਯਾਰਕ" },
  dubai: { hi: "दुबई", pa: "ਦੁਬਈ" },
  "abu dhabi": { hi: "अबू धाबी", pa: "ਅਬੂ ਧਾਬੀ" },
  tokyo: { hi: "टोक्यो", pa: "ਟੋਕੀਓ" },
  singapore: { hi: "सिंगापुर", pa: "ਸਿੰਗਾਪੁਰ" },
  sydney: { hi: "सिडनी", pa: "ਸਿਡਨੀ" },
  melbourne: { hi: "मेलबर्न", pa: "ਮੈਲਬੌਰਨ" },
  toronto: { hi: "टोरंटो", pa: "ਟੋਰਾਂਟੋ" },
  vancouver: { hi: "वैंकूवर", pa: "ਵੈਨਕੂਵਰ" },
  berlin: { hi: "बर्लिन", pa: "ਬਰਲਿਨ" },
  rome: { hi: "रोम", pa: "ਰੋਮ" },
  moscow: { hi: "मॉस्को", pa: "ਮਾਸਕੋ" },
  beijing: { hi: "बीजिंग", pa: "ਬੀਜਿੰਗ" },
  shanghai: { hi: "शंघाई", pa: "ਸ਼ੰਘਾਈ" },
  kathmandu: { hi: "काठमांडू", pa: "ਕਾਠਮਾਂਡੂ" },
  dhaka: { hi: "ढाका", pa: "ਢਾਕਾ" },
  colombo: { hi: "कोलंबो", pa: "ਕੋਲੰਬੋ" },
  bangkok: { hi: "बैंकॉक", pa: "ਬੈਂਕਾਕ" },
  doha: { hi: "दोहा", pa: "ਦੋਹਾ" },
  riyadh: { hi: "रियाद", pa: "ਰਿਆਧ" },
  cairo: { hi: "काहिरा", pa: "ਕਾਹਿਰਾ" },
};

/**
 * Multilingual state/province/region names.
 */
const REGION_TRANSLATIONS: Record<string, { hi: string; pa: string }> = {
  "uttar pradesh": { hi: "उत्तर प्रदेश", pa: "ਉੱਤਰ ਪ੍ਰਦੇਸ਼" },
  punjab: { hi: "पंजाब", pa: "ਪੰਜਾਬ" },
  haryana: { hi: "हरियाणा", pa: "ਹਰਿਆਣਾ" },
  delhi: { hi: "दिल्ली", pa: "ਦਿੱਲੀ" },
  "nct of delhi": { hi: "दिल्ली", pa: "ਦਿੱਲੀ" },
  rajasthan: { hi: "राजस्थान", pa: "ਰਾਜਸਥਾਨ" },
  "madhya pradesh": { hi: "मध्य प्रदेश", pa: "ਮੱਧ ਪ੍ਰਦੇਸ਼" },
  bihar: { hi: "बिहार", pa: "ਬਿਹਾਰ" },
  maharashtra: { hi: "महाराष्ट्र", pa: "ਮਹਾਰਾਸ਼ਟਰ" },
  gujarat: { hi: "गुजरात", pa: "ਗੁਜਰਾਤ" },
  "himachal pradesh": { hi: "हिमाचल प्रदेश", pa: "ਹਿਮਾਚਲ ਪ੍ਰਦੇਸ਼" },
  uttarakhand: { hi: "उत्तराखंड", pa: "ਉੱਤਰਾਖੰਡ" },
  "jammu and kashmir": { hi: "जम्मू और कश्मीर", pa: "ਜੰਮੂ ਅਤੇ ਕਸ਼ਮੀਰ" },
  "west bengal": { hi: "पश्चिम बंगाल", pa: "ਪੱਛਮੀ ਬੰਗਾਲ" },
  odisha: { hi: "ओडिशा", pa: "ਓਡੀਸ਼ਾ" },
  jharkhand: { hi: "झारखंड", pa: "ਝਾਰਖੰਡ" },
  chhattisgarh: { hi: "छत्तीसगढ़", pa: "ਛੱਤੀਸਗੜ੍ਹ" },
  karnataka: { hi: "कर्नाटक", pa: "ਕਰਨਾਟਕ" },
  "tamil nadu": { hi: "तमिलनाडु", pa: "ਤਾਮਿਲਨਾਡੂ" },
  kerala: { hi: "केरल", pa: "ਕੇਰਲ" },
  "andhra pradesh": { hi: "आंध्र प्रदेश", pa: "ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼" },
  telangana: { hi: "तेलंगाना", pa: "ਤੇਲੰਗਾਨਾ" },
  assam: { hi: "असम", pa: "ਅਸਾਮ" },
  goa: { hi: "गोवा", pa: "ਗੋਆ" },
  chandigarh: { hi: "चंडीगढ़", pa: "ਚੰਡੀਗੜ੍ਹ" },
};

/**
 * Multilingual country names.
 */
const COUNTRY_TRANSLATIONS: Record<string, { hi: string; pa: string }> = {
  india: { hi: "भारत", pa: "ਭਾਰਤ" },
  nepal: { hi: "नेपाल", pa: "ਨੇਪਾਲ" },
  "united states": { hi: "संयुक्त राज्य अमेरिका", pa: "ਸੰਯੁਕਤ ਰਾਜ ਅਮਰੀਕਾ" },
  usa: { hi: "अमेरिका", pa: "ਅਮਰੀਕਾ" },
  "united kingdom": { hi: "यूनाइटेड किंगडम", pa: "ਯੂਨਾਈਟਿਡ ਕਿੰਗਡਮ" },
  uk: { hi: "यूके", pa: "ਯੂਕੇ" },
  canada: { hi: "कनाडा", pa: "ਕੈਨੇਡਾ" },
  australia: { hi: "ऑस्ट्रेलिया", pa: "ਆਸਟ੍ਰੇਲੀਆ" },
  france: { hi: "फ्रांस", pa: "ਫਰਾਂਸ" },
  germany: { hi: "जर्मनी", pa: "ਜਰਮਨੀ" },
  japan: { hi: "जापान", pa: "ਜਾਪਾਨ" },
  china: { hi: "चीन", pa: "ਚੀਨ" },
  russia: { hi: "रूस", pa: "ਰੂਸ" },
  "united arab emirates": { hi: "संयुक्त अरब अमीरात", pa: "ਸੰਯੁਕਤ ਅਰਬ ਅਮੀਰਾਤ" },
  uae: { hi: "यूएई", pa: "ਯੂਏਈ" },
  singapore: { hi: "सिंगापुर", pa: "ਸਿੰਗਾਪੁਰ" },
  bangladesh: { hi: "बांग्लादेश", pa: "ਬੰਗਲਾਦੇਸ਼" },
  "sri lanka": { hi: "श्रीलंका", pa: "ਸ਼੍ਰੀਲੰਕਾ" },
  thailand: { hi: "थाईलैंड", pa: "ਥਾਈਲੈਂਡ" },
  qatar: { hi: "कतर", pa: "ਕਤਰ" },
  "saudi arabia": { hi: "सऊदी अरब", pa: "ਸਊਦੀ ਅਰਬ" },
  egypt: { hi: "मिस्र", pa: "ਮਿਸਰ" },
};

/**
 * Returns localized city name according to user language (hi, pa, en, hi-en).
 */
export function getLocalizedCityName(name: string, lang: SupportedLanguage): string {
  if (!name) return "";
  if (lang === "en" || lang === "hi-en") return name;

  const key = name.trim().toLowerCase();
  const match = CITY_TRANSLATIONS[key];
  if (match) {
    return lang === "hi" ? match.hi : match.pa;
  }

  return name;
}

/**
 * Returns localized state / region name according to user language.
 */
export function getLocalizedRegionName(region?: string, lang?: SupportedLanguage): string {
  if (!region) return "";
  if (!lang || lang === "en" || lang === "hi-en") return region;

  const key = region.trim().toLowerCase();
  const match = REGION_TRANSLATIONS[key];
  if (match) {
    return lang === "hi" ? match.hi : match.pa;
  }

  return region;
}

/**
 * Returns localized country name according to user language.
 */
export function getLocalizedCountryName(country?: string, lang?: SupportedLanguage): string {
  if (!country) return "";
  if (!lang || lang === "en" || lang === "hi-en") return country;

  const key = country.trim().toLowerCase();
  const match = COUNTRY_TRANSLATIONS[key];
  if (match) {
    return lang === "hi" ? match.hi : match.pa;
  }

  return country;
}

/**
 * Formats a location object into fully localized parts and a unified display string.
 */
export function getLocalizedLocationName(
  location: {
    name: string;
    region?: string;
    country?: string;
    displayName?: string;
  },
  lang: SupportedLanguage
): LocalizedLocationNames {
  const cityName = getLocalizedCityName(location.name, lang);
  const regionName = getLocalizedRegionName(location.region, lang);
  const countryName = getLocalizedCountryName(location.country, lang);

  // If in English or no translations found
  if (lang === "en" || lang === "hi-en") {
    return {
      cityName: location.name,
      regionName: location.region,
      countryName: location.country,
      fullDisplayName: location.displayName || [location.name, location.region, location.country].filter(Boolean).join(", "),
    };
  }

  const parts = [cityName, regionName, countryName].filter(Boolean);
  const fullDisplayName = parts.join(", ");

  return {
    cityName,
    regionName: regionName || undefined,
    countryName: countryName || undefined,
    fullDisplayName: fullDisplayName || location.displayName || cityName,
  };
}
