# WeatherGPT 2.0 — Unified Weather Risk Center Documentation

## 1. Overview & Architecture

The **Unified Weather Risk Center** transforms verified meteorological and environmental event data into deterministic, evidence-grounded risk assessments. It serves as an authoritative layer consumed by:
1. **The Dashboard UI** (`WeatherRiskCenterCard` via `GET /api/risk`)
2. **AI Copilot 2.0** (`GetRiskTool` via `get_risk` tool execution and `<verified_risk_center>` prompt context)

### Fundamental Principles
- **100% Deterministic**: Every risk classification is calculated by rules-based algorithms in TypeScript. Gemini is an explanation and reasoning layer—it **never** calculates, invents, or alters risk scores.
- **Strict Provenance**: All meteorological data traces back to authoritative `WeatherService` / Open-Meteo responses. Flood data traces back to verified `EventRepository` disaster bulletins.
- **Zero Hallucination / Zero Fabrication**: Missing values (e.g., UV index or unmeasured variables) yield explicit `unavailable` or `insufficient_evidence` states rather than speculative numbers.

```
┌─────────────────────────────────────────────────────────────┐
│                    Authoritative Ingestion                  │
│   Open-Meteo API / Live Disaster Feeds / Weather Alerts    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Service Boundary                      │
│       WeatherService               EventRepository          │
│   (Validated by Zod schemas)     (Live flood intelligence)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      RiskEngine Engine                      │
│ ├── evaluateHeatRisk                                        │
│ ├── evaluateHeavyRainRisk                                   │
│ ├── evaluateThunderstormRisk                                │
│ ├── evaluateWindRisk                                        │
│ ├── evaluateUVRisk                                          │
│ └── evaluateFloodRisk                                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Structured WeatherRiskReport              │
│       - 6 Evaluated Risk Categories                         │
│       - Overall Severity & Confidence                       │
│       - Structured Evidence Items & Provenance              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        GET /api/risk                get_risk AI Copilot Tool
                │                             │
                ▼                             ▼
      WeatherRiskCenterCard          AIOrchestrator Context
```

---

## 2. Risk Categories & Deterministic Rules

The Risk Center evaluates 6 initial meteorological categories:

### 1. Heat Risk
- **Variables**: `current.temperature`, `current.feelsLike`, `targetDay.temperatureHigh`.
- **Classification Rules**:
  - **Extreme**: `temp >= 42.0°C` or `feelsLike >= 45.0°C`
  - **High**: `temp >= 38.0°C` or `feelsLike >= 40.0°C`
  - **Moderate**: `temp >= 33.0°C` or `feelsLike >= 35.0°C`
  - **Low**: Below moderate threshold.
  - **Unavailable**: If no temperature observations or forecasts are present.
- **Confidence**: `high` if both current and forecast high are available; `moderate` if only current temperature is provided.
- **Disclaimer**: Expressly labeled as meteorological risk for planning, not medical diagnosis or treatment advice.

### 2. Heavy Rain Risk
- **Variables**: `current.precipitation` (rate in mm/h), `targetDay.precipitationSum` (daily sum in mm), `targetDay.precipitationProbability` (%).
- **Classification Rules**:
  - **Extreme**: Daily sum `>= 70.0 mm` or rate `>= 20.0 mm/h` (torrential runoff risk).
  - **High**: Daily sum `>= 30.0 mm`, rate `>= 7.5 mm/h`, or (sum `>= 20.0 mm` with probability `>= 75%`).
  - **Moderate**: Daily sum `>= 10.0 mm`, rate `>= 2.5 mm/h`, or (sum `>= 5.0 mm` with probability `>= 50%`).
  - **Low**: Below moderate threshold.
  - **Unavailable**: If no precipitation quantitative variables or probabilities exist.
- **Confidence**: `high` when quantitative sums and probabilities are present; `moderate` if only one dimension exists.

### 3. Thunderstorm Risk
- **Variables**: Normalized `current.condition`, `targetDay.condition`, official alerts mentioning convective storm / lightning.
- **Strict Rule**: Thunderstorms are **never inferred from ordinary rain alone**. They require explicit convective signals or WMO thunderstorm condition codes.
- **Classification Rules**:
  - **Extreme**: Thunderstorm condition combined with gale-force wind (`>= 60 km/h`) or official severe/extreme weather alerts.
  - **High**: Active or forecasted thunderstorm condition.
  - **Low**: No convective thunderstorm codes present.
- **Confidence**: `high` when condition codes are verified.

### 4. Wind Risk
- **Variables**: `current.windSpeed` (km/h), `current.windGust` (km/h), `targetDay.windSpeed` (km/h).
- **Classification Rules**:
  - **Extreme**: Wind speed `>= 65.0 km/h` or gusts `>= 80.0 km/h` (gale-force; structural and height hazard).
  - **High**: Wind speed `>= 40.0 km/h` or gusts `>= 55.0 km/h` (elevated scaffolding and crane hazard).
  - **Moderate**: Wind speed `>= 20.0 km/h` or gusts `>= 35.0 km/h` (breezy; light debris drift).
  - **Low**: Wind speed `< 20.0 km/h` (calm/gentle breeze).
  - **Unavailable**: If wind speed is missing.
- **Confidence**: `high` if verified wind speed is available.

### 5. UV Risk
- **Variables**: `current.uvIndex`.
- **Strict Rule**: UV values are **never fabricated or assumed**. If `uvIndex` is undefined/null in the provider payload:
  - `status = "unavailable"`
  - `severity = "unavailable"`
  - `confidence = "low"`
  - `reason = "UV index is not provided by the authoritative weather provider for this location."`
- **When Provided**:
  - **Extreme**: `uvIndex >= 11.0`
  - **High**: `uvIndex >= 8.0`
  - **Moderate**: `uvIndex >= 3.0`
  - **Low**: `uvIndex < 3.0`
- **Confidence**: `high` when reported.

### 6. Flood Risk
- **Variables**: Active flood bulletins from `EventRepository` correlated with geographic coordinates (`calculateHaversineDistanceKm`).
- **Strict Rule**: Flood risk is **never inferred from rainfall alone**. Rainfall triggers *Heavy Rain* risk, while *Flood* requires correlated hydrological or disaster intelligence events.
- **Classification Rules**:
  - **Extreme / High**: Active verified flood event within **Direct Proximity** (`<= 50 km`) with high/critical severity.
  - **Moderate**: Active flood event within **Regional Proximity** (`51 km to 150 km`) under active monitoring.
  - **No Evidence**: If no active flood events exist within regional proximity (`150 km`):
    - `status = "no_evidence"`
    - `severity = "no_evidence"`
    - `confidence = "high"`
    - Explicit notation that this represents **absence of official flood bulletins on record**, which does not guarantee that local unmonitored storm drain ponding cannot occur.

---

## 3. Severity & Confidence Contracts

### Deterministic Severity Levels
- `extreme`: Dangerous hazardous conditions requiring operational cessation or immediate safety protocol.
- `high`: Significant meteorological hazard; precautions and restrictions required.
- `moderate`: Notable weather impact; caution advised for sensitive tasks.
- `low`: Baseline benign conditions favorable for normal operations.
- `no_evidence`: Explicitly used when an event category (e.g. Flood) has been evaluated against intelligence records and found to have 0 recorded bulletins.
- `unavailable`: Evaluator could not evaluate due to provider data omission (e.g., UV index omitted by provider).

### Confidence Levels
- `high`: Authoritative variables verified, multiple corroborating parameters available.
- `moderate`: Partial parameters available (e.g., current temperature without forecast highs).
- `low`: Incomplete or missing data.

---

## 4. Evidence Model & Provenance

Every risk assessment returns an `evidence: RiskEvidenceItem[]` array containing only facts directly supplied by the data provider:

```json
{
  "metric": "daily_precipitation_sum",
  "value": 34.2,
  "unit": "mm",
  "source": "Open-Meteo",
  "timestamp": "2026-09-13T06:00:00Z"
}
```

Provenance chains:
```
Open-Meteo / Disaster Alert Feeds
       │
       ▼
 WeatherService / EventRepository
       │
       ▼
   RiskEngine
       │
       ▼
 WeatherRiskReport
```

---

## 5. API Reference

### `GET /api/risk`

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` / `latitude` | `number` | Yes | Latitude between -90 and 90 |
| `lon` / `longitude` | `number` | Yes | Longitude between -180 and 180 |
| `timezone` | `string` | No | Optional IANA timezone identifier |
| `targetDate` | `string` | No | Optional target forecast date (`YYYY-MM-DD`) |

#### Example Response
```json
{
  "location": {
    "name": "Kanpur",
    "region": "Uttar Pradesh",
    "country": "India",
    "coordinates": { "latitude": 26.4499, "longitude": 80.3319 },
    "timezone": "Asia/Kolkata"
  },
  "period": "Current & Next 24h",
  "overallSeverity": "moderate",
  "assessments": [
    {
      "type": "heat",
      "severity": "moderate",
      "confidence": "high",
      "evidence": [
        { "metric": "current_temperature", "value": 34.5, "unit": "°C", "source": "Open-Meteo", "timestamp": "2026-09-13T06:00:00Z" },
        { "metric": "apparent_temperature", "value": 38.2, "unit": "°C", "source": "Open-Meteo", "timestamp": "2026-09-13T06:00:00Z" }
      ],
      "timeWindow": "Current & Next 24h",
      "recommendation": "Elevated thermal conditions. Stay hydrated and plan rest periods during extended outdoor fieldwork.",
      "status": "available",
      "reason": "Moderate heat observed/forecasted (Peak: 34.5°C, Apparent: 38.2°C)."
    },
    {
      "type": "heavy_rain",
      "severity": "low",
      "confidence": "high",
      "evidence": [
        { "metric": "daily_precipitation_sum", "value": 1.2, "unit": "mm", "source": "Open-Meteo", "timestamp": "2026-09-13T06:00:00Z" }
      ],
      "timeWindow": "Current & Next 24h",
      "recommendation": "Precipitation levels remain low or dry. Favorable for outdoor operations.",
      "status": "available"
    },
    {
      "type": "thunderstorm",
      "severity": "low",
      "confidence": "high",
      "evidence": [
        { "metric": "current_condition", "value": "partly-cloudy", "source": "Open-Meteo", "timestamp": "2026-09-13T06:00:00Z" }
      ],
      "timeWindow": "Current & Next 24h",
      "recommendation": "No convective thunderstorm or lightning signals detected in verified meteorological data.",
      "status": "available"
    },
    {
      "type": "wind",
      "severity": "low",
      "confidence": "high",
      "evidence": [
        { "metric": "current_wind_speed", "value": 12.0, "unit": "km/h", "source": "Open-Meteo", "timestamp": "2026-09-13T06:00:00Z" }
      ],
      "timeWindow": "Current & Next 24h",
      "recommendation": "Calm to gentle breeze. Favorable for standard outdoor work and transit.",
      "status": "available"
    },
    {
      "type": "uv",
      "severity": "unavailable",
      "confidence": "low",
      "evidence": [],
      "timeWindow": "Current observation",
      "recommendation": "UV data currently unavailable from provider. Consult local solar exposure advisories if planning extended direct sun exposure.",
      "status": "unavailable",
      "reason": "UV index is not provided by the authoritative weather provider for this location."
    },
    {
      "type": "flood",
      "severity": "no_evidence",
      "confidence": "high",
      "evidence": [],
      "timeWindow": "Current Live Intelligence",
      "recommendation": "No active flood bulletins on record for this location. Observe standard local drainage during heavy downpours.",
      "status": "no_evidence",
      "reason": "No verified flood events or official disaster bulletins on record for this location in Live Intelligence records."
    }
  ],
  "evaluatedAt": "2026-09-13T09:00:00.000Z",
  "provenance": [
    {
      "provider": "Open-Meteo",
      "retrievedAt": "2026-09-13T09:00:00.000Z",
      "dataType": "current"
    }
  ]
}
```

---

## 6. AI Copilot Integration (`get_risk`)

Natural language queries directed to AI Copilot are classified by `IntentRouter`:
- `"Is it safe to work outside tomorrow?"`
- `"What is the weather risk tomorrow?"`
- `"Will there be heavy rain?"`
- `"Is there a thunderstorm risk?"`
- `"How strong will the wind be?"`
- `"Is there flood risk?"`
- Hindi: `"Kal bahar kaam karna safe hai?"`, `"Kal baarish ka risk kitna hai?"`
- Hinglish: `"Kal Kanpur mein weather risk kya hai?"`

The flow is:
1. `IntentRouter` flags `isRiskQuery = true`.
2. `AIOrchestrator` executes the deterministic `get_risk` tool (`GetRiskTool`).
3. The tool generates the full `WeatherRiskReport` via `RiskEngine`.
4. `ContextBuilder` wraps the report inside `<verified_risk_center>`.
5. Gemini interprets the findings and formulates natural language advice strictly grounded in the verified metrics.
6. If the AI provider is unavailable or rate limited, `AIOrchestrator` executes a deterministic factual fallback reporting the exact risk categories and recommendations.

---

## 7. Limitations & Future Roadmap

1. **AQI Reservation**: Air Quality Index (AQI) is reserved for a future environmental phase. AQI values are not fabricated in the current Phase 9 implementation.
2. **Product Risk vs Official Warnings**: The engineering thresholds (e.g. wind speeds, rain rate, temperature) are decision-support heuristics for outdoor operations and transit. They do not supersede alerts from official national meteorological bodies (such as IMD, NOAA, or WMO).
3. **Hyper-local Microclimate Limitations**: Flood assessment relies on verified news and disaster agency bulletins; unmonitored street-level gutter blockage is not simulated without local sensor telemetry.
