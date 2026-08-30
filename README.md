# WeatherGPT 2.0

**Weather intelligence that turns forecasts and live events into decisions.**

WeatherGPT 2.0 is a clean rebuild designed around four principles:

1. Weather facts come from trusted weather/data providers — never from an LLM.
2. One normalized weather engine powers the entire product.
3. AI explains, compares, personalizes, and recommends; it does not fabricate live facts.
4. Live Weather Intelligence combines verified weather-related news, event context, forecast signals, and location-specific impact analysis.

## Current Phase

**Phase 1 — Foundation** (active)

The engineering foundation is in place: project structure, type contracts, validation schemas, service abstractions, reusable UI primitives, testing infrastructure, and CI. No features are implemented yet.

See `docs/MASTER_SPEC.md` for the full build phase roadmap.

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
