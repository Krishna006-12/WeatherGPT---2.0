# WeatherGPT 2.0 — Deployment & Operational Smoke-Test Checklist

This checklist guides pre-deployment validation, environment variable configuration, and post-deployment smoke testing across Staging and Pilot environments.

---

## 1. Pre-Deployment Quality Gates

Run all automated checks locally before triggering a deployment:

```bash
# 1. Type Safety Gate (must exit 0 with 0 errors)
npm run typecheck

# 2. Code Quality & Lint Gate (must exit 0 with 0 warnings/errors)
npm run lint

# 3. Unit Test Suite (all 85 test files / 600+ tests must pass)
npm test

# 4. Production Build Verification (must generate all 30 routes cleanly)
npm run build
```

---

## 2. Environment Variables Configuration

Configure the following secrets in your Vercel / Hosting Provider Project Settings:

| Environment Variable | Required | Staging Setting | Pilot Production Setting | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://staging.weathergpt.app` | `https://pilot.weathergpt.app` | Host canonical URL |
| `NEXT_PUBLIC_ENVIRONMENT`| Yes | `staging` | `pilot` | Environment flag |
| `GEMINI_API_KEY` | Yes | `AIzaSy...[StagingKey]` | `AIzaSy...[PilotKey]` | AI Briefs, Copilot, Voice |
| `NEXT_PUBLIC_PILOT_TELEMETRY_ENABLED` | Yes | `true` | `true` | Live evaluation telemetry |
| `OPEN_METEO_BASE_URL` | Optional | `https://api.open-meteo.com/v1` | `https://api.open-meteo.com/v1` | Meteorological endpoint |
| `DATABASE_URL` | Optional | (Optional Postgres connection) | (Optional Postgres connection) | Remote persistence |

---

## 3. Post-Deployment Smoke-Test Checklist

Execute this verification sequence immediately following each deployment:

### Phase 1: Core Navigation & Telemetry Smoke Tests
- [ ] **Root Redirect**: Accessing `/` successfully redirects to `/dashboard`.
- [ ] **Dashboard Loading**: Main dashboard renders with current temperature, 7-day forecast, and air quality cards.
- [ ] **Weather Search**: Search for `"Ludhiana"` and `"Puri"` — coordinates resolve and snapshot updates immediately.
- [ ] **Multi-Language Switch**: Toggle language to **Punjabi (ਪੰਜਾਬੀ)** and **Hindi (हिन्दी)** — UI headers and labels translate with 0 untranslated placeholders.

### Phase 2: Role Decision Support Smoke Tests
- [ ] **Farmer Decision Card**: Switch to the `Farmer` persona:
  - Verify foliar spray window renders drift velocity thresholds.
  - Verify crop irrigation status updates based on precipitation sum.
- [ ] **Disaster Manager Decision Card**: Switch to `Disaster Command` persona:
  - Verify EOC activation status renders with full barometric traceability.
  - Verify siren/evacuation actions reference verified active alert criteria.

### Phase 3: Operational Telemetry & Evaluation Smoke Tests
- [ ] **Live Telemetry Recording**:
  - Open `/evaluation` in browser.
  - Confirm `"Live Pilot Data Only"` is active by default.
  - Verify that total sessions, $p50$ latency, and $p95$ latency reflect live queries.
  - Verify that the SLA status badge shows **Healthy** ($p95 < 1,200\text{ms}$).
- [ ] **CSV Data Export**:
  - Click **Latency CSV** button — file downloads as `weathergpt_evaluation_latency_YYYY-MM-DD.csv`.
  - Open CSV and verify headers: `Trace ID`, `Endpoint`, `Latency (ms)`, `Status Code`, `Task Completion`, `Persona`, `Language`, `Cache Hit`, `Source`, `Timestamp`.
  - Verify that the `Source` column displays `live`.
- [ ] **Degraded-Mode Fallback Verification**:
  - Simulate offline network in browser DevTools.
  - Refresh dashboard — confirm the page serves the cached forecast marked with:
    `"Data may be stale, last updated [time]"`.
  - Confirm zero blank or unhandled crash screens.
- [ ] **Zero-PII Privacy Audit**:
  - Inspect exported CSV and JSON payloads:
  - Confirm zero personal names, email addresses, phone numbers, or sub-kilometer GPS coordinates.
