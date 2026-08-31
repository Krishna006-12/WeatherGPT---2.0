# WeatherGPT 2.0 — Weather Engine (Phase 2)

## 1. System Overview

The Weather Engine is the factual meteorological foundation of WeatherGPT 2.0. It is responsible for fetching, validating, normalizing, caching, and serving weather data and geocoding results to all downstream consumers (UI components, AI reasoning layers, live-event impact engine, and alert systems).

### Core Principles

1. **Single Source of Truth**: All consumers receive the identical normalized `WeatherSnapshot` contract.
2. **Zero Direct External Calls from UI**: Frontend code interacts only with internal Next.js API routes (`/api/weather`, `/api/location/search`).
3. **Strict Validation Boundaries**: All external provider responses are validated via Zod schemas before transformation.
4. **Deterministic Normalization**: Meteorological transformations, unit conversions, and WMO code mappings are 100% deterministic code—no LLM involvement.
5. **Full Provenance & Auditability**: Every weather data point tracks its origin provider, retrieval time, observation time, model run time, and target timezone.
6. **No AI-Generated Weather Facts**: AI components interpret, explain, and contextualize weather data but never fabricate meteorological measurements.

---

## 2. Data Flow Architecture

### 2.1 High-Level Request Pipeline

```mermaid
flowchart TD
    subgraph Client ["Client / UI Layer"]
        SearchUI["Location Search Bar"]
        WeatherUI["Weather Dashboard / AI Chat"]
    end

    subgraph API ["Next.js API Layer"]
        SearchRoute["/api/location/search"]
        WeatherRoute["/api/weather?lat=&lon=&timezone="]
    end

    subgraph Services ["Service Layer"]
        LocService["LocationService"]
        WService["WeatherService"]
        MemCache["MemoryCache (In-Memory TTL)"]
    end

    subgraph Providers ["Provider Layer"]
        OpenMeteoProv["OpenMeteoProvider (implements WeatherProvider)"]
        OpenMeteoGeo["Open-Meteo Geocoding Client"]
    end

    subgraph External ["External APIs (Open-Meteo)"]
        GeoAPI["https://geocoding-api.open-meteo.com/v1/search"]
        ForecastAPI["https://api.open-meteo.com/v1/forecast"]
    end

    SearchUI -->|query=Kanpur| SearchRoute
    SearchRoute --> LocService
    LocService --> OpenMeteoGeo
    OpenMeteoGeo --> GeoAPI
    GeoAPI -->|Raw JSON| OpenMeteoGeo
    OpenMeteoGeo -->|Zod Validation| LocService
    LocService -->|GeocodingResult[]| SearchRoute
    SearchRoute -->|JSON| SearchUI

    WeatherUI -->|lat, lon, timezone| WeatherRoute
    WeatherRoute --> WService
    WService -->|Cache Lookup| MemCache
    WService -->|On Cache Miss| OpenMeteoProv
    OpenMeteoProv --> ForecastAPI
    ForecastAPI -->|Raw Forecast JSON| OpenMeteoProv
    OpenMeteoProv -->|Zod Raw Schema Validation| OpenMeteoProv
    OpenMeteoProv -->|Normalize + Provenance| WService
    WService -->|Validate WeatherSnapshotSchema| WService
    WService -->|Store in Cache| MemCache
    WService -->|Result<WeatherSnapshot>| WeatherRoute
    WeatherRoute -->|JSON| WeatherUI
```

### 2.2 Location Search Flow

```text
User Search Input ("Kanpur")
  ↓
GET /api/location/search?q=Kanpur
  ↓
LocationService.searchLocations("Kanpur")
  ↓
Cache Check (`geo:kanpur`)
  ├── Cache Hit: Return cached GeocodingResult[]
  └── Cache Miss:
        ↓
      Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search?name=Kanpur&count=10&language=en&format=json`)
        ↓
      Validate Raw Response with Zod (`openMeteoGeocodingSchema`)
        ↓
      Normalize to `GeocodingResult[]` (`id`, `name`, `latitude`, `longitude`, `country`, `admin1`, `timezone`)
        ↓
      Store in MemoryCache (TTL: 24 hours)
        ↓
      Return `Result<GeocodingResult[]>`
```

### 2.3 Weather Data Flow

```text
User Request / Navigation
  ↓
GET /api/weather?lat=26.4499&lon=80.3319&timezone=Asia/Kolkata
  ↓
WeatherService.getWeather({ latitude: 26.4499, longitude: 80.3319 }, "Asia/Kolkata")
  ↓
Cache Check (`weather:26.4499,80.3319,Asia/Kolkata`)
  ├── Cache Hit (within 5m TTL): Return cached WeatherSnapshot
  └── Cache Miss:
        ↓
      OpenMeteoProvider.getWeather({ latitude, longitude }, timezone)
        ↓
      Open-Meteo Forecast API Request
        (current: temp, feels_like, humidity, precipitation, weathercode, wind_speed, wind_direction, surface_pressure, cloudcover)
        (hourly: temp, feels_like, humidity, precipitation_probability, precipitation, weathercode, wind_speed)
        (daily: weathercode, temp_max, temp_min, precipitation_sum, precipitation_probability_max, sunrise, sunset)
        ↓
      Validate Raw Response with Zod (`openMeteoRawResponseSchema`)
        ↓
      Deterministic Transformation:
        ├── Map WMO Weather Codes (0-99) → WeatherCondition
        ├── Map Hourly Array series → HourlyWeather[]
        ├── Map Daily Array series → DailyWeather[]
        └── Map Current conditions → CurrentWeather
        ↓
      Attach Provenance Metadata (`DataProvenance[]` with provider, retrievedAt, modelRunAt, timezone)
        ↓
      Construct `WeatherSnapshot`
        ↓
      WeatherService validates complete `WeatherSnapshot` against `weatherSnapshotSchema`
        ↓
      Store in MemoryCache (TTL: 5 minutes)
        ↓
      Return `Result<WeatherSnapshot>`
```

---

## 3. Provider Abstraction

The weather system isolates external provider implementations behind a clean adapter interface. The application core depends exclusively on the `WeatherProvider` interface, allowing providers to be swapped, mocked for testing, or run in fallback modes without modifying downstream code.

### 3.1 Interface Definition

Located at `src/services/weather/weather-provider.ts`:

```typescript
import type { Coordinates } from "@/types/common";
import type { WeatherSnapshot } from "@/types/weather";

/**
 * Configuration options for weather provider instances.
 */
export interface WeatherProviderConfig {
  baseUrl?: string;
  timeout?: number;
  apiKey?: string;
}

/**
 * The adapter contract that every weather provider must implement.
 * Transforms provider-specific payloads into the standard WeatherSnapshot shape.
 */
export interface WeatherProvider {
  /** Unique identifier for this provider (e.g., "open-meteo"). */
  readonly name: string;

  /**
   * Fetch a complete weather snapshot for the given coordinates and timezone.
   *
   * @param coordinates Latitude and longitude.
   * @param timezone IANA timezone string (e.g., "Asia/Kolkata", "UTC").
   * @returns Promise resolving to the normalized WeatherSnapshot.
   */
  getWeather(
    coordinates: Coordinates,
    timezone?: string
  ): Promise<WeatherSnapshot>;
}
```

### 3.2 Service Layer Boundary (`WeatherService`)

Located at `src/services/weather/weather-service.ts`:

- Accepts an implementation of `WeatherProvider` via dependency injection.
- Manages in-memory caching with TTL invalidation.
- Enforces runtime Zod validation on the output of the provider before returning data to the caller.
- Wraps execution in `Result<WeatherSnapshot, AppError>` for explicit error handling without unhandled exceptions.

---

## 4. WeatherSnapshot Contract

The `WeatherSnapshot` is the universal data contract used across WeatherGPT 2.0. Defined in `src/types/weather.ts` and validated via `src/schemas/weather.ts`.

### 4.1 Schema Definition

```typescript
export interface WeatherSnapshot {
  /** Geographic and administrative location metadata. */
  location: LocationInfo;
  /** ISO timestamp when the snapshot was observed/generated. */
  observedAt: string;
  /** Current meteorological conditions. */
  current: CurrentWeather;
  /** 24-48 hour hourly forecasts. */
  hourly: HourlyWeather[];
  /** 7-14 day daily forecasts. */
  daily: DailyWeather[];
  /** Active severe weather warnings/alerts. */
  alerts: WeatherAlert[];
  /** Lineage and provenance records for auditing. */
  provenance: DataProvenance[];
}
```

### 4.2 Sub-Component Specifications

#### `LocationInfo`
```typescript
export interface LocationInfo {
  name: string;          // e.g., "Kanpur"
  region: string;        // e.g., "Uttar Pradesh"
  country: string;       // e.g., "India"
  coordinates: {
    latitude: number;    // -90 to 90
    longitude: number;   // -180 to 180
  };
  timezone: string;      // IANA format, e.g., "Asia/Kolkata"
}
```

#### `CurrentWeather`
```typescript
export interface CurrentWeather {
  temperature: number;            // °C
  feelsLike: number;              // °C (apparent temperature)
  humidity: number;               // 0 - 100 %
  precipitation: number;          // mm (current hour)
  windSpeed: number;              // km/h
  windDirection: number;          // 0 - 360 degrees
  pressure: number;               // hPa
  visibility: number;             // meters
  uvIndex: number;                // 0 - 15 index
  cloudCover: number;             // 0 - 100 %
  condition: WeatherCondition;    // Normalized union code
  description: string;            // Human-friendly label (e.g. "Scattered Showers")
  observedAt: string;             // ISO 8601 string
}
```

#### `HourlyWeather`
```typescript
export interface HourlyWeather {
  time: string;                     // ISO 8601 string (local time)
  temperature: number;              // °C
  feelsLike: number;                // °C
  humidity: number;                 // 0 - 100 %
  precipitation: number;            // mm
  precipitationProbability: number; // 0 - 100 %
  condition: WeatherCondition;      // Normalized condition code
  windSpeed: number;                // km/h
  description: string;              // Human label
}
```

#### `DailyWeather`
```typescript
export interface DailyWeather {
  date: string;                     // ISO date string ("YYYY-MM-DD" or ISO)
  temperatureHigh: number;          // °C max
  temperatureLow: number;           // °C min
  precipitationSum: number;         // mm total
  precipitationProbability: number; // 0 - 100 % max probability
  condition: WeatherCondition;      // Normalized condition code
  windSpeed: number;                // km/h (max wind speed)
  sunrise: string;                  // ISO 8601 string
  sunset: string;                   // ISO 8601 string
  description: string;              // Human label
}
```

#### `WeatherAlert`
```typescript
export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface WeatherAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  description: string;
  source: string;
  effectiveAt: string;
  expiresAt: string;
}
```

---

## 5. Provenance Rules

Every `WeatherSnapshot` must include at least one `DataProvenance` entry. Provenance enables grounded AI citations, transparent data freshness indicators in the UI, and reproducible debugging.

### 5.1 `DataProvenance` Structure

```typescript
export interface DataProvenance {
  /** Identifier of the data source (e.g., "open-meteo"). */
  provider: string;
  /** ISO timestamp when our application fetched the data from the provider. */
  retrievedAt: string;
  /** ISO timestamp when the data is considered stale or expired. */
  expiresAt?: string;
  /** Observation timestamp reported by the provider. */
  observedAt?: string;
  /** Numerical Weather Prediction (NWP) model run timestamp if exposed. */
  modelRunAt?: string;
  /** The target IANA timezone requested for the data. */
  timezone?: string;
  /** Scope of data described by this provenance entry ('current' | 'forecast'). */
  dataType?: "current" | "forecast" | "alerts";
}
```

### 5.2 Provenance Rules and Lifecycle

1. **`retrievedAt`**: Recorded at the instant the provider adapter receives the response. Set using `new Date().toISOString()`.
2. **`observedAt`**: Set from the provider's timestamp corresponding to the current observation slot.
3. **`modelRunAt`**: Populated when using numerical weather models (e.g., ECMWF, GFS) that expose model initialization times.
4. **`timezone`**: Explicitly set to the resolved IANA timezone used in the query.
5. **`dataType`**: Distinguishes current observation lineage from forecast lineage when multiple endpoints are combined.
6. **AI Grounding**: When the AI orchestrator creates answers, it embeds `provenance` metadata to cite the exact observation times and provider sources.

---

## 6. Time Handling Rules

Timezone issues are one of the most common sources of bugs in weather applications. WeatherGPT 2.0 enforces strict time normalization rules:

### 6.1 Open-Meteo Timestamp Format
- Open-Meteo returns timestamps as ISO-like strings in the **local time of the requested timezone**, without a UTC offset suffix (e.g., `"2026-08-31T23:00"`).
- **Rule**: When `timezone` is provided (e.g. `Asia/Kolkata`), Open-Meteo formats hourly and daily times directly in that timezone.

### 6.2 Application Time Rules
1. **Explicit Timezones**: Never assume UTC or server local time. The location's IANA timezone is stored in `LocationInfo.timezone` and passed explicitly to all provider queries.
2. **No Silent Mixing**: Do not parse un-suffixed local strings as UTC (e.g., `new Date("2026-08-31T23:00")` parses as local server time in Node.js, which creates subtle shifts).
3. **Snapshot Consistency**:
   - `observedAt` and `retrievedAt` are full UTC ISO 8601 strings (`2026-08-31T17:45:00.000Z`).
   - Hourly `time` strings represent the exact localized hour slot for display.
   - Daily `sunrise` and `sunset` are localized ISO timestamps formatted for the target timezone.
4. **Client Formatting**: UI components format timestamps using `Intl.DateTimeFormat` with the location's `timezone` prop to ensure users in New York viewing Tokyo weather see Tokyo local time.

---

## 7. WMO Weather Code Mapping

The World Meteorological Organization (WMO) Code 4677 standard maps numeric weather codes (0–99) to standardized atmospheric conditions. WeatherGPT 2.0 uses a **pure, deterministic mapping table** in `src/lib/wmo-codes.ts`.

### 7.1 Condition Union Type (`WeatherCondition`)

```typescript
export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "mist"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "sleet"
  | "hail"
  | "dust"
  | "smoke"
  | "tornado"
  | "unknown";
```

### 7.2 WMO Code Mapping Table

| WMO Code | Condition | Human Label | Notes |
|---|---|---|---|
| `0` | `clear` | Clear Sky | Cloudless |
| `1` | `clear` | Mainly Clear | Low cloud cover |
| `2` | `partly-cloudy` | Partly Cloudy | Scattered clouds |
| `3` | `overcast` | Overcast | Complete cloud cover |
| `45`, `48` | `fog` | Fog / Depositing Rime Fog | Reduced visibility |
| `51`, `53`, `55` | `drizzle` | Drizzle (Light / Moderate / Dense) | Light liquid precipitation |
| `56`, `57` | `sleet` | Freezing Drizzle | Supercooled drizzle |
| `61`, `63` | `rain` | Rain (Slight / Moderate) | Continuous liquid rain |
| `65` | `heavy-rain` | Heavy Rain | High intensity rainfall |
| `66`, `67` | `sleet` | Freezing Rain | Freezing precipitation |
| `71`, `73`, `75` | `snow` | Snow Fall (Slight / Moderate / Heavy) | Solid precipitation |
| `77` | `snow` | Snow Grains | Granular snow |
| `80`, `81` | `rain` | Rain Showers (Slight / Moderate) | Convective rain |
| `82` | `heavy-rain` | Violent Rain Showers | Extreme convective rain |
| `85`, `86` | `snow` | Snow Showers | Convective snow |
| `95` | `thunderstorm` | Thunderstorm | Convective storm with lightning |
| `96`, `99` | `thunderstorm` | Thunderstorm with Hail | Severe convective storm |

### 7.3 Mapping Function

```typescript
export interface WMOInterpretation {
  condition: WeatherCondition;
  label: string;
  description: string;
  iconName: string;
}

export function mapWMOCode(code: number, isDay = true): WMOInterpretation {
  // Deterministic switch statement mapping code -> WMOInterpretation
  // No AI / LLM involvement
}
```

---

## 8. How to Add Another Weather Provider

Adding a new provider (e.g., Tomorrow.io, OpenWeatherMap, WeatherAPI) follows a modular, 6-step extension pattern:

```text
Step 1: Create Provider Class
  src/services/weather/<name>-provider.ts

Step 2: Implement WeatherProvider Interface
  implements WeatherProvider { readonly name = "<name>"; async getWeather(...) }

Step 3: Define Raw Response Schema
  src/schemas/<name>.ts (Zod schema validating provider JSON)

Step 4: Implement Normalizer
  Transform raw provider JSON into WeatherSnapshot structure

Step 5: Attach Data Provenance
  Include provider name, timestamps, and model lineage in DataProvenance[]

Step 6: Register in WeatherService / Factory
  Allow selecting the provider via configuration or fallback chain
```

### 8.1 Example Provider Skeleton

```typescript
// src/services/weather/tomorrow-provider.ts
import { z } from "zod";
import type { Coordinates } from "@/types/common";
import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherProvider, WeatherProviderConfig } from "./weather-provider";
import { tomorrowRawResponseSchema } from "@/schemas/tomorrow";

export class TomorrowProvider implements WeatherProvider {
  readonly name = "tomorrow.io";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: WeatherProviderConfig) {
    this.apiKey = config.apiKey || process.env.TOMORROW_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.tomorrow.io/v4";
  }

  async getWeather(
    coordinates: Coordinates,
    timezone = "UTC"
  ): Promise<WeatherSnapshot> {
    const url = `${this.baseUrl}/weather/forecast?location=${coordinates.latitude},${coordinates.longitude}&timesteps=1h,1d&apikey=${this.apiKey}&timezone=${timezone}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Tomorrow.io HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();
    const validated = tomorrowRawResponseSchema.parse(rawData);

    return this.normalize(validated, coordinates, timezone);
  }

  private normalize(
    data: z.infer<typeof tomorrowRawResponseSchema>,
    coordinates: Coordinates,
    timezone: string
  ): WeatherSnapshot {
    // Transform to WeatherSnapshot and append DataProvenance
  }
}
```

---

## 9. Error Model

WeatherGPT 2.0 uses structured error domain types with typed error codes. Errors returned from API routes never expose internal stack traces or secrets to the client.

### 9.1 Typed Error Codes (`AppErrorCode`)

| Error Code | HTTP Status | Description |
|---|---|---|
| `INVALID_LOCATION` | 400 | Coordinates out of valid range (lat [-90, 90], lon [-180, 180]) or invalid query |
| `LOCATION_NOT_FOUND` | 404 | Geocoding search returned 0 matching locations |
| `WEATHER_PROVIDER_UNAVAILABLE` | 503 | External provider returned 5xx, timed out, or network unreachable |
| `WEATHER_RESPONSE_INVALID` | 502 | Provider returned malformed JSON failing Zod schema validation |
| `RATE_LIMITED` | 429 | Provider or internal rate limit reached |
| `UNKNOWN_ERROR` | 500 | Unhandled internal exception (sanitized in production) |

### 9.2 `AppError` Class

```typescript
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
```

### 9.3 API Error Response Contract

All error responses from `/api/*` conform to the following schema:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_LOCATION",
    "message": "Latitude must be between -90 and 90 degrees."
  }
}
```

---

## 10. Caching Strategy

To ensure sub-50ms response times and minimize external API requests, the engine uses an in-memory TTL caching layer (`MemoryCache<T>`).

### 10.1 Cache Keys and TTLs

| Cache Category | Key Pattern | TTL | Rationale |
|---|---|---|---|
| **Weather Snapshot** | `weather:{lat.toFixed(4)},{lon.toFixed(4)},{timezone}` | 5 minutes | Balances meteorological freshness with API rate preservation |
| **Geocoding Search** | `geo:{query.toLowerCase().trim()}` | 24 hours | City names and coordinates change very infrequently |
| **Reverse Geocoding** | `revgeo:{lat.toFixed(3)},{lon.toFixed(3)}` | 24 hours | Administrative boundaries are static |

### 10.2 Cache Implementation Details

- **Store**: Node.js in-memory Map with expiration timestamps.
- **Key Normalization**: Coordinate rounding (4 decimal places ~ 11m precision) prevents cache misses on floating-point precision fluctuations.
- **Eviction**: Expired entries are evicted lazily on access or through an automatic periodic sweep.
- **Zero External Infrastructure**: Self-contained in Node.js runtime—no Redis or external dependencies required for Phase 2.
