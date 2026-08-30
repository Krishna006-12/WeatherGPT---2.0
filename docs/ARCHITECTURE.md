# WeatherGPT 2.0 — Architecture

## 1. High-level system

```text
User
  ↓
Web App
  ↓
Application API
  ├── Weather Service
  ├── Live Event Service
  ├── Impact Engine
  └── AI Orchestrator

Weather Service
  ↓
Weather Provider Adapter(s)
  ↓
Normalized Weather Contract

Live Event Service
  ↓
News / Official Source Adapters
  ↓
Event Extractor + Deduplicator + Clusterer
  ↓
Normalized Weather Event Contract

Impact Engine
  ↓
Structured evidence + geography + hazard rules
  ↓
Impact State

AI Orchestrator
  ↓
Grounded context only
  ↓
Primary LLM
  ↓
Validated streamed answer
```

## 2. Recommended stack

Initial implementation target:

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Zod
- Zustand only where local app state genuinely needs it
- Vitest
- Playwright
- Vercel

Database is optional in the earliest weather-core phase. Supabase/Postgres should be introduced when event persistence, saved locations, user preferences, or alert subscriptions require durable server data.

## 3. Core boundary: one weather service

Frontend code must not call weather providers directly.

```text
UI
 ↓
/api/weather
 ↓
Weather Service
 ↓
Provider Adapter
 ↓
Normalized object
```

All consumers use the same normalized object:

- Dashboard
- Forecast
- AI
- Alerts
- Activity intelligence
- Agriculture
- Live-event impact analysis

## 4. Weather contract

Suggested conceptual shape:

```ts
interface WeatherSnapshot {
  location: LocationInfo;
  observedAt: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  alerts: WeatherAlert[];
  provenance: DataProvenance[];
}
```

The exact contract will be finalized before Phase 2 implementation.

## 5. Live event contract

```ts
type HazardType =
  | 'flood'
  | 'cyclone'
  | 'storm'
  | 'heatwave'
  | 'coldwave'
  | 'landslide'
  | 'drought'
  | 'wildfire'
  | 'avalanche'
  | 'earthquake'
  | 'other';

type Severity = 'low' | 'moderate' | 'high' | 'extreme';

type ImpactStatus =
  | 'confirmed'
  | 'likely'
  | 'possible'
  | 'monitoring'
  | 'unlikely'
  | 'unknown';

interface WeatherEvent {
  id: string;
  slug: string;
  title: string;
  hazard: HazardType;
  severity: Severity;
  summary: string;
  startedAt?: string;
  updatedAt: string;
  location: EventLocation;
  affectedRegions: EventRegion[];
  sources: EventSource[];
  confidence: number;
  impacts: RegionalImpact[];
  provenance: DataProvenance[];
}
```

## 6. Live-event pipeline

```text
Source fetch
  ↓
Parse
  ↓
Normalize article/update
  ↓
Weather relevance filter
  ↓
Entity + location extraction
  ↓
Deduplicate
  ↓
Cluster into event
  ↓
Severity/evidence analysis
  ↓
Impact engine
  ↓
AI summary from evidence
  ↓
Persist/cache
  ↓
API/UI
```

The LLM should not be responsible for all pipeline stages. Deterministic parsing, schemas, source metadata, geospatial rules, and validation should surround any AI-assisted extraction.

## 7. Impact engine

Impact analysis should combine:

- Event location
- Hazard type
- Affected/connected regions
- User location
- Weather forecast
- Official warnings where available
- Structured geography/hydrology knowledge where applicable
- Confidence/evidence quality

The first version can be deliberately conservative. `unknown` and `monitoring` are valid outputs.

Never force a confident conclusion when evidence is insufficient.

## 8. AI orchestrator

```text
User question
  ↓
Intent classification
  ↓
Tool/data selection
  ↓
Context builder
  ↓
LLM
  ↓
Output validator
  ↓
Streaming response + citations/provenance
```

Initial provider strategy:

- One fast primary provider
- One fallback provider
- Deterministic fallback for core weather facts

Do not start with four or five providers.

## 9. Suggested source layout

```text
src/
  app/
  components/
    ui/
    weather/
    events/
    ai/
  features/
    weather/
    live-intelligence/
    chat/
    alerts/
  server/
    weather/
      adapters/
    events/
      adapters/
      clustering/
    impact/
    ai/
  lib/
  hooks/
  stores/
  types/
  schemas/
  tests/
```

Prefer feature ownership over a single enormous shared component tree.

## 10. Non-negotiable engineering constraints

- TypeScript strict mode.
- Zod validation at external-data boundaries.
- Secrets server-side only.
- Centralized fetch/timeouts/retries.
- Centralized provenance metadata.
- Explicit loading, empty, stale, and error states.
- Tests for normalization and impact rules before visual polish.
- No service worker in the initial foundation unless explicitly approved later.
- No generated fix-document sprawl in repository root.
- Architecture decisions documented under `docs/`.

## 11. Immediate next implementation step

Before application code is generated, this architecture and `MASTER_SPEC.md` should be reviewed by Gemini Pro as an adversarial senior-engineering review.

After review findings are incorporated, create the Phase 1 foundation in a dedicated branch and open a pull request instead of building directly on `main`.
