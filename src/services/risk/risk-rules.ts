/**
 * Deterministic weather risk rules, thresholds, and recommendations.
 *
 * NOTE:
 * These thresholds are transparent engineering product risk thresholds designed
 * for situational planning and decision support. They do not constitute official
 * meteorological warnings or medical advice.
 */

export const HEAT_THRESHOLDS = {
  EXTREME_TEMP_C: 42.0,
  EXTREME_FEELS_LIKE_C: 45.0,
  HIGH_TEMP_C: 38.0,
  HIGH_FEELS_LIKE_C: 40.0,
  MODERATE_TEMP_C: 33.0,
  MODERATE_FEELS_LIKE_C: 35.0,
};

export const HEAVY_RAIN_THRESHOLDS = {
  EXTREME_DAILY_SUM_MM: 70.0,
  EXTREME_RATE_MM_H: 20.0,
  HIGH_DAILY_SUM_MM: 30.0,
  HIGH_RATE_MM_H: 7.5,
  HIGH_PROB_THRESHOLD_PCT: 75,
  HIGH_SUM_WITH_PROB_MM: 20.0,
  MODERATE_DAILY_SUM_MM: 10.0,
  MODERATE_RATE_MM_H: 2.5,
  MODERATE_PROB_THRESHOLD_PCT: 50,
  MODERATE_SUM_WITH_PROB_MM: 5.0,
};

export const WIND_THRESHOLDS = {
  EXTREME_SPEED_KMH: 65.0,
  EXTREME_GUST_KMH: 80.0,
  HIGH_SPEED_KMH: 40.0,
  HIGH_GUST_KMH: 55.0,
  MODERATE_SPEED_KMH: 20.0,
  MODERATE_GUST_KMH: 35.0,
};

export const UV_THRESHOLDS = {
  EXTREME_INDEX: 11.0,
  HIGH_INDEX: 8.0,
  MODERATE_INDEX: 3.0,
};

export const FLOOD_DISTANCE_THRESHOLDS = {
  DIRECT_PROXIMITY_KM: 50.0,
  REGIONAL_PROXIMITY_KM: 150.0,
};

export const RISK_DISCLAIMER =
  "Deterministic risk indicators are calculated from verified forecast and event feeds for operational decision support, not official government warnings or medical diagnosis.";
