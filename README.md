# WeatherGPT 2.0

**Weather intelligence that turns forecasts and live events into decisions.**

WeatherGPT 2.0 is a clean rebuild designed around four principles:

1. Weather facts come from trusted weather/data providers — never from an LLM.
2. One normalized weather engine powers the entire product.
3. AI explains, compares, personalizes, and recommends; it does not fabricate live facts.
4. Live Weather Intelligence combines verified weather-related news, event context, forecast signals, and location-specific impact analysis.

## Shipped Intelligence Capabilities

WeatherGPT 2.0 has progressed from architectural foundation to a production-grade meteorological and disaster intelligence platform:

1. **Deterministic Risk Intelligence Engine** (`src/services/risk/`):
   - 6 zero-hallucination evaluators: Heat, Heavy Rain, Thunderstorm, Wind, UV Index, and Hydrological Flood Risk.
   - Strict Zod schemas with evidence basis, confidence rating, and limitation transparency.
2. **Multi-Model NWP Consensus Engine** (`src/services/nwp/`):
   - Integrates global numerical weather prediction models (ECMWF, GFS, ICON).
   - Computes ensemble mean, median, spread, standard deviation, model divergence, and 0–100% agreement index.
3. **Agriculture Intelligence Engine** (`src/services/agriculture/`):
   - Deterministic crop weather risk assessment, activity feasibility (irrigation, spraying, harvesting), and seasonal guidance based on agronomic thresholds.
4. **Live Weather Intelligence & Disaster Engine** (`src/services/impact/`, `src/services/news/`):
   - Live ingest from GDACS (cyclones, floods) and USGS (earthquakes) with Haversine distance, proximity tiers, and hydrological correlation.
5. **Grounded AI Tool Orchestrator** (`src/services/ai/`):
   - 11 internal deterministic tools (weather, forecast, risk, consensus, activity, agriculture, voice, events, impact).
   - Strict XML-bounded prompt sanitization preventing prompt injection, plus anti-hallucination source citations.
6. **Voice Assistant & Speech Intelligence** (`src/services/voice/`):
   - Natural speech normalization (°C → degrees Celsius, km/h → kilometers per hour), duration estimation, Web Speech API controls, and multi-lingual language detection (`en-US`, `hi-IN`).
7. **Apple-Caliber Antigravity Motion System** (`src/lib/motion/`):
   - 60 FPS zero-gravity physics, Lissajous multi-harmonic drift with element-seeded PRNG, exponential momentum decay ($v(t) = v_0 \cdot e^{-t/\tau}$), and adaptive device tier scaling.
8. **Automated Verification**:
   - 50+ unit and integration test suites running under Vitest, plus Playwright E2E suites.

See `docs/MASTER_SPEC.md` and feature-specific architecture guides in `docs/` for specifications.

## Architecture Principles

- **One weather service.** Frontend never calls weather providers directly.
- **Provider abstraction.** Weather, news, and AI providers sit behind adapter interfaces.
- **Zod at the boundary.** All external data is validated before entering the application.
- **Server/client separation.** Secrets stay server-side. No API keys in client bundles.
- **AI isolation.** LLM calls live in services, never in React components.
- **Deterministic logic.** Calculations (distance, severity, deduplication) are code, not prompts.
- **Small components.** No monolithic page components.

See `docs/ARCHITECTURE.md` for the full architecture document.

## Local Setup

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/Krishna006-12/WeatherGPT---2.0.git
cd WeatherGPT---2.0

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

No real API keys are required for Phase 1.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |

## Environment Setup

Copy `.env.example` to `.env.local`:

```
# Weather provider (Phase 2)
WEATHER_API_KEY=

# News provider (Phase 3)
NEWS_API_KEY=

# AI provider (Phase 4)
AI_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

API keys are optional in Phase 1. They become required when their respective services are activated.

## Testing

### Unit Tests (Vitest)

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
```

### E2E Tests (Playwright)

```bash
npm run test:e2e       # Run Playwright tests
```

E2E tests will be added in later phases.

## Documentation

- `docs/MASTER_SPEC.md` — Product specification
- `docs/ARCHITECTURE.md` — Architecture design
- `docs/DEVELOPMENT_RULES.md` — Engineering rules

## V1 Reference

WeatherGPT 1.0 is a reference/learning archive. WeatherGPT 2.0 is a clean rebuild and does not copy V1 architecture.
