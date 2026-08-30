# WeatherGPT 2.0 — Master Product Specification

## 1. Vision

WeatherGPT 2.0 is an AI-assisted weather intelligence platform focused on converting weather data and live weather-related events into clear, personalized decisions.

The product must answer four questions well:

1. What is happening?
2. What is likely to happen next?
3. How confident are we?
4. What does this mean for me?

## 2. MVP scope

The first production-quality MVP includes:

- Current weather
- Hourly forecast
- 7-day forecast
- Location search and geolocation
- Grounded AI chat with streaming responses
- AI Weather Brief on the dashboard
- Live Weather Intelligence events
- Verified news/source attribution
- India-impact analysis for relevant regional events
- User-location relevance analysis
- Severe-weather alerts
- Explicit uncertainty/confidence labels

Not in the first MVP:

- Full agriculture intelligence
- Voice assistant
- Long-term memory
- Advanced offline/PWA behavior
- Full climate analytics
- Complex multi-provider LLM failover
- Heavy animated/WebGL weather scenes

These are later phases.

## 3. Product pillars

### 3.1 Weather

Weather data is the factual foundation. Every UI surface and AI response must use one normalized weather contract.

### 3.2 AI

AI is an interpretation layer, not a source of live meteorological truth.

Allowed AI jobs:

- Explain weather
- Summarize
- Compare
- Translate
- Personalize
- Recommend actions
- Explain uncertainty
- Interpret live events using supplied verified evidence

Forbidden AI jobs:

- Invent temperatures
- Invent rainfall probabilities
- Invent alerts
- Invent news events
- Invent sources
- Present unsupported predictions as confirmed facts

### 3.3 Live Weather Intelligence

Live Weather Intelligence is event-based rather than article-based.

Raw articles and official updates are collected, deduplicated, clustered into events, checked for weather relevance, and converted into a structured event object.

Each event may contain:

- What happened
- Where it happened
- Hazard type
- Severity
- Timeline
- Verified sources
- Confidence
- Weather signals
- India relevance
- User-location relevance
- Current vs potential impact
- AI explanation

### 3.4 Decision intelligence

The end result should be actionable.

Examples:

- Best time to travel
- Whether rain risk is increasing
- Whether an external flood/cyclone event is relevant to the user's region
- Whether an alert is confirmed, model-derived, or only being monitored

## 4. Live Weather Intelligence UX

Do not build a generic scrolling news feed.

Primary UI should show event cards such as:

- Nepal Flood Crisis — High severity — India: Monitoring
- Arabian Sea Cyclonic System — Elevated — Maharashtra/Gujarat relevance
- Bihar River Watch — Elevated — Updated 12 min ago

Each event opens an Event Intelligence page containing:

1. Situation summary
2. Current status
3. Timeline
4. Affected areas
5. India impact
6. User-location impact
7. Weather/forecast signals
8. Confidence and uncertainty
9. Sources
10. Ask WeatherGPT about this event

## 5. Impact model

Impact must not be a free-form LLM guess.

Use structured states:

- confirmed
- likely
- possible
- monitoring
- unlikely
- unknown

And severity:

- low
- moderate
- high
- extreme

Example:

- Bihar: possible / high potential impact
- Eastern Uttar Pradesh: monitoring / moderate
- Kanpur: unlikely / low

The AI may explain these states but should not override the structured decision engine without new evidence.

## 6. Source policy

Every live-event factual claim must trace back to collected evidence.

Preferred source classes:

1. Official meteorological/disaster-management authorities
2. Government agencies
3. Reputable wire services
4. Established news organizations
5. Other sources only as supporting evidence

The UI should expose:

- Source name
- Publication/update time
- Event last-verified time
- Confidence level

Conflicting reports should be represented as uncertainty, not silently merged into a false single fact.

## 7. AI interaction

AI chat supports:

- General weather questions
- Forecast questions
- Event questions
- Location-impact questions
- Follow-up context

Example:

User: `Kya Nepal flood ka Kanpur par effect hoga?`

Pipeline:

1. Resolve event
2. Resolve user location
3. Fetch event evidence
4. Fetch relevant weather/hazard context
5. Read structured impact state
6. Build grounded context
7. Generate answer
8. Attach source references and uncertainty

## 8. UX direction

Target feel:

- Premium
- Calm
- Information-dense without looking like an admin dashboard
- Atmospheric but performant
- Strong typography and hierarchy
- Minimal glass effects
- Smooth motion where useful

Reference direction:

Apple Weather × Linear × modern AI assistant

Avoid excessive cards, glow, gradients, and decorative animation.

## 9. Engineering rules inherited from V1 mistakes

1. No monolithic application file.
2. No duplicate client/server weather engines.
3. No duplicate AI pipelines.
4. No direct frontend calls to multiple weather providers.
5. No feature without a typed contract.
6. No live fact without provenance.
7. No merging into main with failing tests.
8. No giant global stylesheet.
9. No adding several fallback providers before the primary path is stable.
10. No PWA/service-worker complexity until the core app is stable.

## 10. Build phases

### Phase 0 — Specification

- Product spec
- Architecture
- Contracts
- Design direction
- Review with Gemini Pro

### Phase 1 — Foundation

- Next.js + TypeScript project
- Styling/design system
- Validation
- Query/data layer
- Testing foundation
- CI

### Phase 2 — Weather core

- Geolocation/search
- Unified weather API
- Current weather
- Hourly forecast
- Daily forecast
- Caching and error states

### Phase 3 — Live Weather Intelligence

- Source ingestion abstraction
- Event normalization
- Deduplication/clustering
- Event API
- Event cards/page
- Impact states
- Provenance

### Phase 4 — AI

- Context builder
- Grounded chat
- Streaming
- AI Weather Brief
- Event Q&A
- Output validation

### Phase 5 — Alerts and risk

- Alert normalization
- Risk scoring
- Personalized relevance

### Phase 6+ — Advanced intelligence

- Multi-model NWP confidence
- Agriculture
- Travel/school activities
- Voice
- Memory
- PWA/offline
- Climate intelligence

## 11. Success criteria for first MVP

The MVP is successful when a user can:

1. Open the app and immediately understand current local weather.
2. Inspect hourly and daily conditions quickly.
3. Ask a weather question and receive a grounded answer with consistent numbers.
4. See important live weather events instead of random news articles.
5. Open an event and understand what happened, what is known, and what remains uncertain.
6. Ask whether the event affects India or their city and receive a source-grounded answer.
7. See clear source attribution and update timestamps.
8. Use the app smoothly on mobile and desktop.
