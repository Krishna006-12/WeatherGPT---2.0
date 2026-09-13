# WeatherGPT 2.0 — Phase 11: Activity Suitability & Decision Intelligence

## 1. Overview & Architecture

The **Activity Suitability & Decision Intelligence System** transforms raw meteorological variables (temperatures, precipitation rates, wind speeds, visibility, thunderstorm risk, and heat index) into actionable, deterministic guidance for daily real-world activities:
1. **Daily Commute & Local Travel** (`commute`)
2. **Highway & Intercity Road Travel** (`travel_road`)
3. **Outdoor Construction & Field Labor** (`outdoor_work`)
4. **School Sports & Children Outdoor Play** (`school_sports`)
5. **Running, Jogging & Cycling** (`running_cycling`)
6. **Outdoor Gatherings & Dining** (`outdoor_events`)

### Fundamental Architectural Rules
- **100% Deterministic Calculations**: All suitability scores (0–100), qualitative safety levels (`optimal`, `acceptable`, `caution`, `unsafe`), limiting weather factors, and optimal time windows are calculated exclusively by pure TypeScript algorithms (`ActivitySuitabilityEngine` and `activity-rules.ts`).
- **Gemini is Purely an Interpretation Layer**: Gemini never invents, calculates, or guesses activity suitability scores, best windows, or safety levels. It explains the verified numbers and advisories produced by the engine.
- **Authoritative Weather Source**: Leverages the existing verified `WeatherService` / Open-Meteo hourly observations and forecasts. Zero mock or fabricated weather data.
- **Strict API Response Envelopes**: All endpoints adhere to the standard envelope `{ success: true, data: ActivitySuitabilityReport }` or `{ success: false, error: ... }`.

```
┌────────────────────────────────────────────────────────┐
│                   Open-Meteo API                       │
│    (Hourly Temperatures, Rain, Wind, WMO Codes)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   WeatherService                       │
│           (Validated via Zod Schemas)                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              ActivitySuitabilityEngine                 │
│  ├── evaluateHourlySuitability (per hour & activity)   │
│  │   ├── Severe convective hazards (thunderstorm cap)  │
│  │   ├── Thermal stress (heat index > 38/42°C, chill)  │
│  │   ├── Precipitation & localized waterlogging risk   │
│  │   ├── Visibility & fog road safety degradation      │
│  │   └── Wind hazards (scaffolding, crosswinds)        │
│  └── evaluateDailySuitability                          │
│      ├── Day-long average suitability score (0–100)    │
│      ├── Overall Safety Level (optimal, acceptable...) │
│      ├── 3-hour sliding Best Time Window algorithm     │
│      └── Challenging Time Window identification        │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    GET /api/activity          get_activity_suitability Tool
            │                               │
            ▼                               ▼
  ActivitySuitabilityCard          ContextBuilder & Orchestrator
   (Dashboard Component)           (AI Copilot Grounded Response)
```

---

## 2. Activity Thresholds & Decision Logic

| Activity | Optimal Conditions | Caution Triggers | Unsafe Triggers |
| :--- | :--- | :--- | :--- |
| **Commute** | Dry road, clear skies, wind < 30 km/h | Rain 1–3 mm/h, fog/mist, wind 35–50 km/h | Heavy rain > 10 mm/h, flash floods, thunderstorm, wind > 55 km/h |
| **Road Travel** | Clear highway visibility, dry tarmac | Wet roads, light fog, crosswinds 35–50 km/h | Dense fog, heavy rain (> 10 mm/h, hydroplaning), thunderstorm, gale winds |
| **Outdoor Work** | Moderate temp (15–28°C), dry, wind < 30 km/h | Heat index 37–41°C, rain 1–3 mm/h, wind 35–50 km/h | Heat index ≥ 42°C (OSHA/IMD danger), rain > 7.5 mm/h, wind ≥ 55 km/h (scaffolding collapse risk), lightning |
| **School Sports** | Mild weather, low UV, dry ground | Heat index 35–40°C, light rain, damp field | Thunderstorm/lightning (zero tolerance), heat index ≥ 40°C, heavy rain, poor air quality |
| **Running / Cycling** | Temp 12–24°C, dry, wind < 25 km/h | Heat index 33–37°C, rain 0.8–2.5 mm/h, wind 30–45 km/h | Heat index ≥ 38°C, heavy rain > 7.5 mm/h, active thunderstorm, wind ≥ 45 km/h |
| **Outdoor Events** | Clear or partly cloudy, calm breeze | Light rain or drizzle, breeze 25–35 km/h | Rain > 3 mm/h (without marquee), wind gusts ≥ 40 km/h (canopy/tent damage), thunderstorm |

---

## 3. Sliding Window Algorithm

To find the **Recommended Best Time Window**:
1. Active daylight hours (06:00 to 21:00) are extracted.
2. A 3-hour moving average window $W_k = \frac{1}{3} \sum_{i=k}^{k+2} S_i$ is computed for each consecutive block.
3. The window with the highest average score is selected as `bestWindow`.
4. The window with the lowest average score is selected as `worstWindow` (most challenging period).

---

## 4. API Endpoints

### `GET /api/activity`
Parameters:
- `latitude` (required, -90 to 90)
- `longitude` (required, -180 to 180)
- `activity` (optional: `commute`, `travel_road`, `outdoor_work`, `school_sports`, `running_cycling`, `outdoor_events`)
- `date` (optional: YYYY-MM-DD)
- `timezone` (optional)

Returns standard envelope:
```json
{
  "success": true,
  "data": {
    "location": { "name": "New Delhi", ... },
    "generatedAt": "2026-09-13T10:00:00.000Z",
    "targetDate": "2026-09-13",
    "requestedActivity": "running_cycling",
    "activities": {
      "running_cycling": {
        "activity": "running_cycling",
        "activityName": "Running, Jogging & Cycling",
        "targetDate": "2026-09-13",
        "overallScore": 82,
        "overallSafetyLevel": "acceptable",
        "bestWindow": {
          "startHour": "06:00",
          "endHour": "09:00",
          "averageScore": 92,
          "safetyLevel": "optimal",
          "summary": "Peak favorability between 06:00 and 09:00 (Score: 92/100)."
        },
        "worstWindow": {
          "startHour": "13:00",
          "endHour": "16:00",
          "averageScore": 68,
          "safetyLevel": "acceptable",
          "summary": "Most challenging window between 13:00 and 16:00 (Score: 68/100)."
        },
        "limitingFactors": [],
        "recommendation": "Good day overall for Running, Jogging & Cycling. Proceed normally with standard awareness. Target 06:00 - 09:00 for best weather.",
        "evidenceSummary": "Evaluated 24 hourly periods. Overall suitability score 82/100 (acceptable). Primary constraints: None."
      }
    },
    "provenance": { "provider": "open-meteo", ... }
  }
}
```
