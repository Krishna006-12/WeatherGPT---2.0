# API Integration Specification — WeatherGPT 2.0

This document satisfies problem-statement deliverable #3 ("API integration specifications for meteorological data sources"). It reflects the providers actually implemented in `src/services/`, not a planned/aspirational list.

## 1. Weather Data — Open-Meteo

| | |
|---|---|
| **Adapter** | `src/services/weather/open-meteo-provider.ts`, implementing `WeatherProvider` (`src/services/weather/weather-provider.ts`) |
| **Auth** | None required — Open-Meteo's public tier is key-free |
| **Base URLs** | `OPEN_METEO_BASE_URL` (weather), `OPEN_METEO_GEOCODING_URL` (location search) — configured via `.env.local` |
| **Methods exposed** | `getWeather(coordinates, timezone)` → full `WeatherSnapshot`; `getCurrentConditions(coordinates, query)` → derived from `getWeather`; `getForecast(coordinates, query)` → time-ranged forecast |
| **Normalization** | Provider response is mapped into the app-wide `WeatherSnapshot` / `CurrentWeather` types (`src/types/weather.ts`) and validated at the service boundary before reaching the rest of the app |
| **Historical data** | `src/services/weather/historical-weather-provider.ts` — separate adapter for the `weather/history` route, same normalization contract |
| **Rate limits** | Open-Meteo free tier: soft-limited by fair use (no hard key-based quota); the app should still cache by location/time-bucket to avoid unnecessary calls |
| **Failure handling** | Adapter returns a `Result<WeatherSnapshot>` shape so callers can branch on success/failure without throwing |

## 2. Context / Alert Feeds — multi-provider registry

All context sources are registered through `FeedRegistry` (`src/services/news/feed-registry.ts`), which fetches every provider **concurrently with `Promise.allSettled`**, so one provider failing or timing out never breaks ingestion from the others.

| Provider | File | Source | Auth |
|---|---|---|---|
| GDACS (Global Disaster Alert and Coordination System) | `gdacs-provider.ts` | Public disaster alert feed | None |
| USGS | `usgs-provider.ts` | Public earthquake feed | None |
| Official Weather (national met advisories) | `official-weather-provider.ts` | Public official advisory feed | None |
| RSS | `rss-feed-provider.ts` | Configurable RSS sources | None |
| Generic news | `news-provider.ts` / `context-news-service.ts` | `NEWS_API_KEY` (env var) | API key |

**Processing pipeline** (all deterministic code, not LLM-based, per architecture rules):
1. `feed-registry.ts` — concurrent fetch + provider failure isolation
2. `severity-engine.ts` — classifies event severity
3. `freshness-engine.ts` — scores recency/staleness
4. `context-event-scorer.ts` — location-relevance scoring
5. `confidence-engine.ts` — combines the above into a confidence score
6. `lifecycle-engine.ts` — tracks an event from active → resolved
7. `live-intelligence-service.ts` / `live-intelligence-sync-service.ts` — orchestrates sync, exposed via `POST /api/events/sync` (protected by `LIVE_INTEL_SYNC_SECRET` header `x-sync-secret` when set)

## 3. AI Layer — Google Gemini

| | |
|---|---|
| **Adapter** | `src/services/ai/gemini-provider.ts`, implementing `ai-provider.ts` interface |
| **Auth** | `GEMINI_API_KEY` / `AI_API_KEY` env vars |
| **Orchestration** | `ai-orchestrator.ts` — routes a parsed intent (`intent-router.ts`) + resolved time reference (`temporal-resolver.ts`) into a built context (`context-builder.ts`, `context-summarizer.ts`) before calling the model |
| **Grounding rule** | The AI layer only explains/summarizes/recommends over data already fetched from the weather and news services above — it does not independently source live facts |
| **Test/offline mode** | `mock-ai-provider.ts` — used in tests and can serve as a fallback when no Gemini key is configured |

## 4. Internal Metrics API (evaluation instrumentation)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/metrics?format=summary` | GET | Statistical evaluation summary (latency percentiles, completion rates, MAE) |
| `/api/metrics?format=csv&type=latency\|accuracy` | GET | RFC-4180 CSV export |
| `/api/metrics?format=json` | GET | Raw telemetry/accuracy export |
| `/api/metrics` | POST | Ingests client-side latency/completion events (schema-validated) |

## 5. What is not yet integrated

Be upfront about this rather than implying broader coverage than exists: **IMD (India Meteorological Department) and ECMWF/NOAA direct integrations are not implemented** — Open-Meteo (which itself aggregates multiple national/global NWP models under the hood, including ECMWF and NOAA GFS data) is the live weather source. If your submission needs to claim direct IMD/ECMWF/NOAA API integration specifically, that is a gap, not a naming difference — say so plainly rather than implying a direct integration that doesn't exist.
