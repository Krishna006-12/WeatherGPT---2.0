# WeatherGPT 2.0 — NWP Model Intelligence & Consensus Documentation

## 1. Overview & Architecture

The **NWP (Numerical Weather Prediction) Model Intelligence & Consensus System** aggregates, compares, and evaluates multi-model forecasts from premier global and regional meteorological organizations via Open-Meteo. By comparing independent supercomputing models, WeatherGPT 2.0 deterministically calculates **forecast confidence, ensemble mean, median, spread, standard deviation, and model divergence**.

It serves as an authoritative layer consumed by:
1. **The Dashboard UI** (`ModelConsensusCard` via `GET /api/consensus`)
2. **AI Copilot 2.0** (`GetModelConsensusTool` via `get_model_consensus` tool execution and `<verified_model_consensus>` prompt context)

### Fundamental Principles
- **100% Deterministic Calculations**: Ensemble mean, median, min, max, spread, standard deviation, agreement levels, and consensus confidence are computed exclusively by pure TypeScript algorithms (`ConsensusEngine`). Gemini acts as an explanation and reasoning layer—it **never** calculates, averages, or hallucinates model consensus or confidence numbers.
- **Authoritative Provenance**: Forecasts are retrieved from verified national meteorological centers via Open-Meteo's multi-model API (`models=ecmwf_ifs025,gfs_seamless,icon_seamless`).
- **Full Transparency & Outlier Detection**: When models disagree (e.g., GFS predicts 25mm rain while ECMWF and ICON predict 0mm), the engine explicitly identifies the divergence, attributes the outlier model, and lowers the consensus confidence rather than blending conflicting forecasts into an ambiguous single value.
- **Zero Fabrication**: If a model parameter is missing or the upstream request fails, explicit error states or reduced model sets are returned with degraded confidence indicators.

```
┌─────────────────────────────────────────────────────────────────┐
│               National Meteorological Centers                   │
│   ECMWF (Europe)   •   NOAA GFS (USA)   •   DWD ICON (Germany) │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 OpenMeteoNwpProvider Ingestion                  │
│    https://api.open-meteo.com/v1/forecast?models=...            │
│   (ecmwf_ifs025, gfs_seamless, icon_seamless + WMO codes)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ConsensusEngine                           │
│  ├── computeDailyConsensus (for each forecast day)              │
│  │   ├── calculateMetricConsensus (High/Low Temp, Rain, Wind)  │
│  │   │   ├── Mean, Median, Min, Max, Spread, Std Dev            │
│  │   │   ├── MetricAgreementLevel (high, moderate, divergent)   │
│  │   │   └── Outlier Model Detection (Z-score / delta)          │
│  │   ├── Dominant Weather Condition Voting                      │
│  │   ├── Daily Agreement Index (0–100%)                         │
│  │   └── Daily Consensus Confidence (high, moderate, low)       │
│  └── computeOverallReport (7-Day horizon aggregation)           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Structured ModelConsensusReport                 │
│       - Validated with Zod Schema (modelConsensusReportSchema)  │
│       - Multi-Model Raw Forecasts per Day                       │
│       - Statistical Consensus per Metric                        │
│       - Outlier Warnings & Provenance Metadata                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        GET /api/consensus            get_model_consensus Tool
                 │                               │
                 ▼                               ▼
        ModelConsensusCard            ContextBuilder & Orchestrator
        (Dashboard UI Component)      (AI Copilot Grounded Response)
```

---

## 2. Integrated NWP Models

| Model ID | Official Name | Meteorological Agency | Grid Resolution | Update Frequency | Primary Strength |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ecmwf_ifs025` | **ECMWF IFS** | European Centre for Medium-Range Weather Forecasts | ~9–25 km | 4x daily (00, 06, 12, 18 UTC) | Global gold standard for mid-range synoptic accuracy & temperature |
| `gfs_seamless` | **NOAA GFS** | US National Oceanic and Atmospheric Administration | ~13–28 km | 4x daily (00, 06, 12, 18 UTC) | Fast updates, convective precipitation, hurricane & cyclone tracks |
| `icon_seamless`| **DWD ICON** | Deutscher Wetterdienst (Germany) | ~13 km | 4x daily (00, 06, 12, 18 UTC) | Excellent European/Asian boundary layer physics, wind fields |

---

## 3. Mathematical Spread & Agreement Formulations

### Metric Consensus Statistics
For any metric $X = [x_1, x_2, \dots, x_N]$ from $N$ reporting models:

1. **Ensemble Mean**:
   $$\mu = \frac{1}{N} \sum_{i=1}^{N} x_i$$

2. **Ensemble Median**:
   $$\tilde{x} = \begin{cases} x_{(k+1)} & \text{if } N = 2k+1 \\ \frac{x_{(k)} + x_{(k+1)}}{2} & \text{if } N = 2k \end{cases}$$
   *(where $x_{(i)}$ are sorted observations)*

3. **Spread**:
   $$\Delta = \max(X) - \min(X)$$

4. **Standard Deviation**:
   $$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2}$$

### Deterministic Metric Agreement Thresholds

| Metric | High Agreement | Moderate Agreement | Divergent |
| :--- | :--- | :--- | :--- |
| **Max / Min Temperature** | Spread $\le 2.0^\circ\text{C}$ | Spread $\le 4.0^\circ\text{C}$ | Spread $> 4.0^\circ\text{C}$ |
| **Precipitation Amount** | Spread $\le 2.0\text{ mm}$ (or both $<1\text{mm}$) | Spread $\le 6.0\text{ mm}$ | Spread $> 6.0\text{ mm}$ |
| **Max Wind Speed** | Spread $\le 10.0\text{ km/h}$ | Spread $\le 20.0\text{ km/h}$ | Spread $> 20.0\text{ km/h}$ |

### Outlier Model Detection
A model $m_i$ is flagged as an outlier if its reading deviates significantly from the median of the ensemble:
- **Temperature Outlier**: $|x_i - \tilde{x}| \ge 3.0^\circ\text{C}$
- **Precipitation Outlier**: $|x_i - \tilde{x}| \ge 10.0\text{ mm}$ (with spread $> 8\text{ mm}$)
- **Wind Speed Outlier**: $|x_i - \tilde{x}| \ge 15.0\text{ km/h}$ (with spread $> 15\text{ km/h}$)

### Daily Agreement Score (0–100%)
Weights applied across meteorological dimensions:
- Temperature Agreement (High + Low): 40%
- Precipitation Agreement: 35%
- Wind Speed Agreement: 15%
- Weather Condition Alignment: 10%

Agreement Level scoring per metric:
- `high`: 1.0
- `moderate`: 0.6
- `divergent`: 0.1

$$\text{Score} = \text{round}(100 \times \sum (w_k \times s_k))$$

### Consensus Confidence Classification
- **`high`**: Overall Agreement Score $\ge 80\%$
- **`moderate`**: Overall Agreement Score $\ge 60\%$ and $< 80\%$
- **`low`**: Overall Agreement Score $< 60\%$

---

## 4. API Endpoints

### `GET /api/consensus`

#### Request Parameters
- `latitude` (number, required): Between -90 and 90.
- `longitude` (number, required): Between -180 and 180.
- `timezone` (string, optional): IANA timezone identifier (e.g., `Asia/Kolkata`).
- `models` (comma-separated string, optional): Subset of supported models (defaults to `ecmwf_ifs025,gfs_seamless,icon_seamless`).

#### Response Schema (`ModelConsensusReport`)
```json
{
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "timezone": "Asia/Kolkata"
  },
  "evaluatedAt": "2026-09-13T03:50:00.000Z",
  "modelsEvaluated": ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"],
  "consensusConfidence": "high",
  "agreementScore": 92,
  "daily": [
    {
      "date": "2026-09-13",
      "consensus": {
        "maxTemperature": {
          "mean": 34.8,
          "median": 35.0,
          "min": 34.2,
          "max": 35.3,
          "spread": 1.1,
          "standardDeviation": 0.46,
          "agreementLevel": "high"
        },
        "minTemperature": { ... },
        "precipitation": {
          "mean": 0.2,
          "median": 0.0,
          "min": 0.0,
          "max": 0.6,
          "spread": 0.6,
          "standardDeviation": 0.28,
          "agreementLevel": "high"
        },
        "maxWindSpeed": { ... },
        "condition": {
          "dominantCondition": "Partly Cloudy",
          "wmoCode": 2,
          "modelAgreementCount": 3,
          "totalModels": 3
        }
      },
      "models": [
        {
          "model": "ecmwf_ifs025",
          "modelName": "ECMWF IFS",
          "maxTemperature": 34.8,
          "minTemperature": 24.2,
          "precipitation": 0.0,
          "maxWindSpeed": 18.2,
          "condition": "Partly Cloudy"
        },
        ...
      ],
      "agreementScore": 95,
      "confidence": "high",
      "divergences": [],
      "summaryNotes": [
        "Models show strong consensus for maximum temperature (spread: 1.1°C).",
        "High agreement on dry or minimal precipitation."
      ]
    }
  ],
  "divergences": [],
  "summaryNotes": [
    "Overall multi-model consensus is high across 3 models.",
    "ECMWF IFS, NOAA GFS, and DWD ICON agree strongly on synoptic evolution."
  ]
}
```

---

## 5. AI Copilot Integration (Deterministic Grounding)

### Copilot Rule 11
When the user inquires about forecast reliability, confidence, model agreement, or model comparisons (e.g., "How reliable is this forecast?", "Which models agree on rain?", "ECMWF vs GFS for Delhi", "Forecast kitna accurate hai?"):
1. The **Intent Router** flags `isConsensusQuery = true`.
2. The **AI Orchestrator** triggers `GetModelConsensusTool` (`get_model_consensus`).
3. The deterministic report is inserted into the prompt within the `<verified_model_consensus>` XML section.
4. Gemini explains the mathematical consensus, explicitly citing:
   - Consensus confidence (`high`, `moderate`, `low`) and agreement score (0–100%).
   - Spread in temperature (°C), precipitation (mm), and wind speed (km/h).
   - Any outlier models identified by `ConsensusEngine`.
5. Gemini **never** invents confidence percentages or recalculates spreads.
6. If the model is offline or unavailable, the deterministic fallback message is returned.

---

## 6. Dashboard UI (`ModelConsensusCard`)

The `ModelConsensusCard` is rendered in Section 4 of the main dashboard:
- **Header**: Status badge with real-time agreement percentage and confidence pill (`High`, `Moderate`, `Divergence`).
- **Active Model Badges**: Visual chips for all reporting models (ECMWF, GFS, ICON).
- **Consensus Metrics Grid**:
  - Max Temperature: Median with spread badge (e.g., `±0.6°C spread`).
  - Expected Rain: Median with agreement indicator.
  - Wind Speed: Peak gust/max wind with spread.
- **Outlier Alert Banners**: Highlighted warning when a model sharply diverges on rain or temperature.
- **Interactive Model Comparison Drawer**: Expandable table comparing individual model predictions side-by-side with resolution and origin metadata.

---

## 7. Verification & Quality Assurance

- **Type Strictness**: No `any`, `@ts-ignore`, or `@ts-expect-error` permitted.
- **Comprehensive Unit Testing**:
  - `src/tests/unit/services/consensus-engine.test.ts`: Covers mean/median/stdDev math, high/moderate/divergent thresholds, outlier detection, and voting.
  - `src/tests/unit/api/consensus-route.test.ts`: Tests HTTP 200, HTTP 400 for invalid latitude/longitude, and Zod response validation.
  - `src/tests/unit/ai/get-model-consensus-copilot.test.ts`: Tests deterministic tool execution, multi-lingual intent routing (English, Hindi, Hinglish), and context injection.
