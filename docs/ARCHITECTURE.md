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

Frontend code must not call weather providers directly. All access goes through a single weather service behind a provider-adapter interface.

```text
UI (React / Client Components)
 ↓
/api/weather (Next.js Route Handler — Lat/Lon/Timezone validation)
 ↓
Weather Service (Time-bucketed Memory Cache & Zod validation boundary)
 ↓
Weather Provider Adapter (Open-Meteo Adapter, implements WeatherProvider)
 ↓
Normalized WeatherSnapshot contract (strict Zod schema validation)
```

All consumers use the same normalized object:

- Dashboard & Charts
- Forecast (hourly & 7-day)
- AI Orchestrator & Copilots
- Severe Risk & Alerts
- Activity Intelligence
- Agriculture Intelligence
- Live-event impact analysis

### Caching Architecture

Requests are cached in-memory using a coordinate and time-bucket index:
`weather:${lat.toFixed(2)}_${lon.toFixed(2)}:${timezone}:b${Math.floor(Date.now() / bucketTtlMs)}`
This provides fast sub-millisecond local responses, smooth edge caching compatibility, and protects upstream providers against rate-limit exhaustion.

## 4. Weather contract

The normalized internal weather contract is strictly validated with Zod (`weatherSnapshotSchema`) at the service boundary before data leaves the weather service:

```ts
export interface WeatherSnapshot {
  location: LocationInfo;
  observedAt: ISOTimestamp;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  alerts: WeatherAlert[];
  provenance: DataProvenance[];
  forecastHorizon?: ForecastHorizon;
  dataSource?: string;
  dataAgeSeconds?: number;
  confidence?: number;
}
```

The adapter interface (`WeatherProvider`) exposes:
```ts
export interface WeatherProvider {
  readonly name: string;
  getWeather(coordinates: Coordinates, timezone?: string): Promise<WeatherSnapshot | Result<WeatherSnapshot>>;
  getCurrentConditions?(coordinates: Coordinates, query?: CurrentWeatherQuery): Promise<CurrentWeather | Result<CurrentWeather>>;
  getForecast?(coordinates: Coordinates, query?: ForecastWeatherQuery): Promise<WeatherSnapshot | Result<WeatherSnapshot>>;
}
```

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

## 6. Live-event & Context News pipeline

```text
Source fetch (GDACS / Authoritative Feed)
  ↓
Parse & Boundary Validation (contextEventSchema)
  ↓
Deterministic Deduplication (token Jaccard similarity & temporal clustering)
  ↓
Deterministic Location-Relevance Scoring (Haversine distance, proximity tiers, recency, source trust)
  ↓
Context News Service (Time-bucketed Memory Cache)
  ↓
/api/news & AI Orchestrator / Impact Engine
```

The LLM is NOT responsible for deduplication, distance calculations, or relevance filtering. All scoring and deduplication are deterministic TypeScript functions.

### News Provider Adapter Contract

Analogous to `WeatherProvider`, the `NewsProvider` interface decouples external news/event APIs:

```ts
export interface NewsProvider {
  readonly name: string;
  getContextEvents?(query?: ContextNewsQuery): Promise<ContextEvent[] | Result<ContextEvent[]>>;
  getArticles?(query?: NewsQuery): Promise<NewsArticle[]>;
}
```

The normalized `ContextEvent` contract:

```ts
export interface ContextEvent {
  id: string;
  headline: string;
  summary?: string;
  source: NewsSource;
  timestamp: ISOTimestamp;
  category: ContextEventCategory;
  location: ContextEventLocation;
  locationRelevance?: LocationRelevance;
  score?: number;
  url?: string;
  provenance: DataProvenance;
}
```

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
