# Impact Engine Architecture & Specification

## 1. Overview
The **Impact Engine** (`impact-engine-v1`) is a deterministic, evidence-based assessment engine that evaluates the relevance and potential impact of live weather and hazard events on a specific user or target location.

Core question answered:
> **"How relevant is this event to this location?"**

The engine strictly adheres to factual evidence, transparent reasoning, and explainable confidence scoring without relying on LLM intuition or speculative geographic leaps.

---

## 2. Impact Assessment Contract

```typescript
export interface ImpactAssessment {
  id: string;                      // Deterministic assessment ID (e.g. imp_hash)
  eventId: string;                 // Reference to parent WeatherEvent
  targetLocation: EventLocation;   // Target location evaluated
  hazard: EventCategory;           // Hazard type (flood, cyclone, heatwave, etc.)
  impactLevel: ImpactLevel;        // "none" | "low" | "moderate" | "high" | "extreme"
  relevanceStatus: RelevanceStatus;// "confirmed" | "likely" | "possible" | "monitoring" | "unlikely" | "unknown"
  confidence: number;              // 0.0 to 1.0 deterministic score
  reasons: string[];               // Human-readable transparent bullet points
  evidence: EvidenceItem[];        // Machine-readable supporting/neutral/refuting evidence
  assessedAt: ISOTimestamp;        // Timestamp of assessment
  methodology: string;             // "impact-engine-v1"
  provenance: DataProvenance[];    // End-to-end data lineage
}
```

---

## 3. Evidence Model

Every assessment is backed by structured `EvidenceItem` records:

| Evidence Type | Description | Typical Weight |
| :--- | :--- | :--- |
| `explicit_city_match` | Target city is explicitly identified in event bulletins. | `supporting` |
| `explicit_region_match` | Target region/state is explicitly listed in affected regions. | `supporting` |
| `explicit_country_match` | Target location is in the same country, but outside specific affected zones. | `neutral` |
| `geographic_proximity` | Great-circle distance between target and event epicenter (Haversine km). | `supporting` / `neutral` |
| `official_authority_citation` | Tier 1 authority (e.g. IMD, CWC, GDACS) provides verified source records. | `supporting` |
| `weather_condition_aligned` | Local live weather observations (rainfall, wind, temperature) align with hazard. | `supporting` |
| `weather_condition_neutral` | Local weather observations show normal/moderate conditions. | `neutral` |
| `downstream_unestablished` | Transboundary/downstream flood impact is unconfirmed by official advisories. | `neutral` |
| `no_evidence_available` | Target location is geographically unrelated to the event. | `refuting` |

---

## 4. Critical Hydrological Safety Rule

> [!CAUTION]
> **Prohibition of Unsupported Downstream Claims**:
> The engine **never** infers downstream disaster propagation (e.g. `Nepal flood → Bihar flooding` or `Nepal flood → UP/Kanpur flooding`) solely based on geographic distance or river proximity.

### Decision Rules for Water/Flood Hazards:
1. **With Explicit Authoritative Evidence**:
   - If official bulletins (e.g. CWC, IMD, GDACS) explicitly list the downstream state/region in `affectedRegions`, status becomes `confirmed` or `likely`.
2. **Without Explicit Authoritative Evidence**:
   - Status remains conservatively set to `monitoring` or `possible` (if nearby) or `unlikely` (if distant).
   - An `EvidenceItem` of type `downstream_unestablished` is attached.
   - Transparent reason emitted: *"Downstream hydrological impact across borders/states is not established without explicit official hydrological advisories or river gauge data."*

---

## 5. Geographic Proximity Logic

- Calculates great-circle distance using the **Haversine formula**.
- Proximity tiers:
  - **Immediate** (≤ 50 km)
  - **Near** (50 – 150 km)
  - **Moderate** (150 – 500 km)
  - **Distant** (> 500 km)
- **Principle**: Distance provides proximity evidence, but does **not** by itself establish causal impact.

---

## 6. Weather Correlation Integration

When a `WeatherSnapshot` is provided for the target location:
- Live observations are correlated against the hazard:
  - **Floods / Heavy Rain**: Evaluates active precipitation rate (>2 mm/h, heavy rain, thunderstorms).
  - **Heatwaves**: Evaluates observed temperatures (≥38°C).
  - **Cold Waves**: Evaluates observed temperatures (≤8°C).
  - **Cyclones / Storms**: Evaluates observed wind speeds and gusts (≥40 km/h).
- **Principle**: Weather correlation serves as supporting contextual evidence, not standalone proof of causation.

---

## 7. Uncertainty & Confidence Scoring

- Uncertainty is **never** collapsed into a single speculative severity number.
- Confidence is calculated deterministically:
  - Explicit city match: `0.95`
  - Explicit region match with Tier 1 authority: `0.88`
  - Explicit region match with Tier 2 media: `0.78`
  - Unconfirmed downstream / transboundary monitoring: `0.65`
  - Unrelated distant location: `0.85` (high confidence of no impact)

---

## 8. REST API Specification

### `GET /api/impact`

#### Query Parameters:
- `eventId` (*required*): ID of the `WeatherEvent` to evaluate.
- `lat` (*optional*): Target latitude (-90 to 90).
- `lon` (*optional*): Target longitude (-180 to 180).
- `city` (*optional*): Target city name.
- `region` (*optional*): Target state/province name.
- `country` (*optional*, default: `"India"`): Target country.

#### Responses:
- `200 OK`: Returns normalized `ImpactAssessment`.
- `400 Bad Request`: Invalid coordinates or missing required `eventId`.
- `404 Not Found`: `WeatherEvent` not found in storage repository.

---

## 9. Future Extension Points
- **River Basin & Gauge Telemetry**: Ingesting live CWC/USGS hydrological gauge discharge data.
- **AI Explanation Layer (Phase 5)**: Consuming `ImpactAssessment` reasons and evidence to generate localized, grounded user briefings.
