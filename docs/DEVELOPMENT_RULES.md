# WeatherGPT 2.0 — Development Rules

Concise engineering rules for all contributors. These rules are non-negotiable.

## Code Quality

1. **No `any`.** Use proper types. If a type is genuinely unknown, use `unknown` and narrow it.
2. **No `@ts-ignore` or `@ts-nocheck`.** Fix the underlying type issue.
3. **No giant components.** Prefer small, focused components with clear responsibilities.
4. **No duplicate business logic.** One implementation per concern.

## Architecture Boundaries

5. **No direct provider calls from UI components.** Components consume data through hooks → API routes → services → provider adapters.
6. **No secrets in client code.** API keys, tokens, and credentials stay server-side only.
7. **No LLM use for deterministic calculations.** Distance, time, unit conversion, severity scoring, deduplication — these are code, not prompts.
8. **No AI-generated weather facts.** AI explains, summarizes, and recommends. It does not invent temperatures, rainfall, alerts, or news events.

## Data Integrity

9. **All external data must be validated.** Use Zod at every external boundary. External API responses are never trusted directly.
10. **No synchronous live-news ingestion during user requests.** News processing happens asynchronously. User-facing requests read from a pre-processed cache.

## Testing

11. **No feature without tests where practical.** Write tests for normalization, validation, and business logic before visual polish.
12. **No merging into main with failing tests.** CI must pass.

## Process

13. **No feature outside the current phase.** Follow the phased build plan in `docs/MASTER_SPEC.md`.
14. **Architecture decisions documented under `docs/`.** Significant choices get written down.
