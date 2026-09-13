/**
 * Multilingual Translations Dictionary for WeatherGPT 2.0.
 * Supports English (en), Hindi (hi), and Punjabi (pa).
 */

export type SupportedLanguage = "en" | "hi" | "pa";

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation
    "nav.overview": "Overview",
    "nav.forecast": "Forecast",
    "nav.history": "History & Archive",
    "nav.agriculture": "Agriculture",
    "nav.risks": "Risk Center",
    "nav.copilot": "AI Copilot",
    "nav.settings": "Settings",

    // Topbar & Header
    "topbar.search_placeholder": "Search city (e.g. Kanpur, London, Tokyo)...",
    "topbar.synoptic_grid": "Synoptic Grid Active",
    "topbar.model_blend": "Model: ECMWF / GFS Blend",
    "topbar.recent_searches": "Recent Searches",

    // Weather Metrics
    "metric.temperature": "Temperature",
    "metric.feels_like": "Feels like",
    "metric.humidity": "Humidity",
    "metric.wind": "Wind",
    "metric.pressure": "Pressure",
    "metric.uv_index": "UV Index",
    "metric.precipitation": "Precipitation",

    // Agriculture
    "agri.title": "Agricultural Intelligence",
    "agri.subtitle": "ICAR-grounded decision support for farm operations and crop protection",
    "agri.irrigation": "Irrigation",
    "agri.spraying": "Spraying",
    "agri.harvesting": "Harvesting",
    "agri.sowing": "Sowing",
    "agri.disease_risk": "Disease Risk",
    "agri.evapotranspiration": "Evapotranspiration (ET₀)",

    // Risks & Hazards
    "risk.heatwave": "Heatwave",
    "risk.cyclone": "Cyclone",
    "risk.flood": "Flood",
    "risk.drought": "Drought",
    "risk.thunderstorm": "Thunderstorm",
    "risk.low": "Low Risk",
    "risk.moderate": "Moderate Risk",
    "risk.high": "High Alert",
    "risk.extreme": "Extreme Hazard",
  },

  hi: {
    // Navigation
    "nav.overview": "अवलोकन",
    "nav.forecast": "पूर्वानुमान",
    "nav.history": "इतिहास व पुरालेख",
    "nav.agriculture": "कृषि परामर्श",
    "nav.risks": "आपदा व जोखिम केंद्र",
    "nav.copilot": "एआई सह-पायलट",
    "nav.settings": "सेटिंग्स",

    // Topbar & Header
    "topbar.search_placeholder": "शहर या गांव खोजें (जैसे कानपुर, लखनऊ)...",
    "topbar.synoptic_grid": "मौसम ग्रिड सक्रिय",
    "topbar.model_blend": "मॉडल: ECMWF / GFS मिश्रण",
    "topbar.recent_searches": "हाल की खोजें",

    // Weather Metrics
    "metric.temperature": "तापमान",
    "metric.feels_like": "अनुभूत तापमान",
    "metric.humidity": "नमी (आर्द्रता)",
    "metric.wind": "हवा की गति",
    "metric.pressure": "वायुमंडलीय दबाव",
    "metric.uv_index": "पराबैंगनी (UV) सूचकांक",
    "metric.precipitation": "वर्षा",

    // Agriculture
    "agri.title": "कृषि मौसम बुद्धिमत्ता",
    "agri.subtitle": "भारतीय कृषि अनुसंधान परिषद (ICAR) आधारित फसल व सिंचाई परामर्श",
    "agri.irrigation": "सिंचाई",
    "agri.spraying": "कीटनाशक छिड़काव",
    "agri.harvesting": "फसल कटाई",
    "agri.sowing": "बुवाई",
    "agri.disease_risk": "फफूंद व रोग जोखिम",
    "agri.evapotranspiration": "वाष्पोत्सर्जन (ET₀)",

    // Risks & Hazards
    "risk.heatwave": "लू (हीटवेव)",
    "risk.cyclone": "चक्रवात",
    "risk.flood": "बाढ़ व जलभराव",
    "risk.drought": "सूखा व जल संकट",
    "risk.thunderstorm": "आंधी-तूफान व वज्रपात",
    "risk.low": "सामान्य",
    "risk.moderate": "मध्यम जोखिम",
    "risk.high": "उच्च चेतावनी",
    "risk.extreme": "गंभीर आपदा",
  },

  pa: {
    // Navigation
    "nav.overview": "ਸੰਖੇਪ ਜਾਣਕਾਰੀ",
    "nav.forecast": "ਮੌਸਮ ਭਵਿੱਖਬਾਣੀ",
    "nav.history": "ਇਤਿਹਾਸ ਅਤੇ ਆਰਕਾਈਵ",
    "nav.agriculture": "ਖੇਤੀਬਾੜੀ ਸਲਾਹ",
    "nav.risks": "ਜੋਖਮ ਕੇਂਦਰ",
    "nav.copilot": "ਏਆਈ ਸਹਾਇਕ",
    "nav.settings": "ਸੈਟਿੰਗਾਂ",

    // Topbar & Header
    "topbar.search_placeholder": "ਸ਼ਹਿਰ ਜਾਂ ਪਿੰਡ ਖੋਜੋ (ਜਿਵੇਂ ਅੰਮ੍ਰਿਤਸਰ, ਲੁਧਿਆਣਾ)...",
    "topbar.synoptic_grid": "ਮੌਸਮ ਗਰਿੱਡ ਸਰਗਰਮ",
    "topbar.model_blend": "ਮਾਡਲ: ECMWF / GFS",
    "topbar.recent_searches": "ਹਾਲੀਆ ਖੋਜਾਂ",

    // Weather Metrics
    "metric.temperature": "ਤਾਪਮਾਨ",
    "metric.feels_like": "ਮਹਿਸੂਸ ਤਾਪਮਾਨ",
    "metric.humidity": "ਨਮੀ",
    "metric.wind": "ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ",
    "metric.pressure": "ਵਾਯੂਮੰਡਲ ਦਬਾਅ",
    "metric.uv_index": "ਯੂਵੀ ਇੰਡੈਕਸ",
    "metric.precipitation": "ਮੀਂਹ / ਬਾਰਿਸ਼",

    // Agriculture
    "agri.title": "ਖੇਤੀਬਾੜੀ ਮੌਸਮ ਜਾਣਕਾਰੀ",
    "agri.subtitle": "ਪੀਏਯੂ (PAU) ਅਤੇ ਆਈਸੀਏਆਰ (ICAR) ਅਧਾਰਤ ਖੇਤੀ ਤੇ ਸਿੰਚਾਈ ਸਲਾਹ",
    "agri.irrigation": "ਸਿੰਚਾਈ",
    "agri.spraying": "ਸਪਰੇਅ ਵਿੰਡੋ",
    "agri.harvesting": "ਵਾਢੀ",
    "agri.sowing": "ਬਿਜਾਈ",
    "agri.disease_risk": "ਬਿਮਾਰੀ ਦਾ ਖ਼ਤਰਾ",
    "agri.evapotranspiration": "ਵਾਸ਼ਪੀਕਰਨ (ET₀)",

    // Risks & Hazards
    "risk.heatwave": "ਲੂ / ਗਰਮੀ ਦੀ ਲਹਿਰ",
    "risk.cyclone": "ਤੂਫਾਨ / ਚੱਕਰਵਾਤ",
    "risk.flood": "ਹੜ੍ਹ ਤੇ ਜਲ-ਭਰਾਅ",
    "risk.drought": "ਸੋਕਾ",
    "risk.thunderstorm": "ਝੱਖੜ ਤੇ ਅਸਮਾਨੀ ਬਿਜਲੀ",
    "risk.low": "ਆਮ / ਸੁਰੱਖਿਅਤ",
    "risk.moderate": "ਮੱਧਮ ਜੋਖਮ",
    "risk.high": "ਉੱਚ ਚੇਤਾਵਨੀ",
    "risk.extreme": "ਗੰਭੀਰ ਖ਼ਤਰਾ",
  },
};
