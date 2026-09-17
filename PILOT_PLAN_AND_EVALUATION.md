# Pilot Plan & Evaluation Report — WeatherGPT 2.0

> **Note on scope**: A full multi-week field pilot with real farmers and disaster-management officers requires real elapsed time and cannot be completed within a single-day deadline. This document is written honestly on that basis: it describes (a) the pilot design as it would run, and (b) an evaluation based on internal/simulated testing conducted today, clearly labeled as such — not presented as completed field data. If your locally-built Phase 7 instrumentation and a longer-running pilot exist by the time you submit, use that instead; this is the fallback if it doesn't make it in.

## 1. Stakeholder groups (pilot design)

| Group | Description | Language | What "success" means for them |
|---|---|---|---|
| General public / smallholder farmers | Users needing daily forecast + crop-relevant advisories | English + regional language (e.g. Hindi) | Faster, clearer answers than checking a bulletin/portal; actionable crop guidance |
| District disaster management contacts | Users needing severe-weather alerts and coordination support | English + regional language | Timely, trustworthy alerts with visible confidence, no missed severe events |

## 2. Success metrics (tied to the original problem statement)
- **Forecast accuracy**: compare app-shown forecast against observed conditions (temperature/precipitation), reported as Mean Absolute Error
- **Task completion rate**: % of queries answered directly vs. requiring fallback/degraded mode
- **Alert dissemination speed**: time from a severe-weather condition being detected in source data to it appearing as an in-app alert
- **Information-seeking time reduction**: time to get an answer via WeatherGPT vs. via existing portals/bulletins (baseline comparison)

## 3. Today's internal evaluation (simulated, not a completed field pilot)

**Method**: internal test sessions run against the live weather (Open-Meteo) and context (GDACS/USGS/official advisory) integrations, across a handful of real locations, covering both personas and both languages, on [DATE]. This is a smoke-test-scale evaluation, not a statistically powered field study — say so explicitly wherever these numbers are cited.

**What to fill in from your own test run today** (do not fabricate numbers — run the app and record what actually happens):
- Number of test queries run: ___
- Direct-answer rate: ___%
- Any degraded-mode/fallback triggers observed: ___
- Any errors or crashes observed: ___
- Response latency, roughly (open dev tools / server logs): ___
- Alert correctly fired for at least one real active advisory (yes/no): ___

## 4. Honest limitations section (include this in your report — it strengthens credibility, not weakens it)
- No multi-week field data was collected; this is a same-day internal verification of a working system, not a validated pilot outcome.
- Forecast accuracy (MAE) has not been measured against real observed outcomes over time — this requires the multi-day comparison Phase 7's instrumentation is designed to support once run over a real window.
- Sample size for any usability feedback is internal/informal, not the named 35-farmer / 15-officer cohort described in the original pilot design.

## 5. Next steps if given more time
1. Run the app with real users from both stakeholder groups for at least 1–2 weeks.
2. Let the evaluation-metrics instrumentation (latency, completion rate, forecast-vs-observed MAE) accumulate real data.
3. Regenerate this report from that live data instead of the simulated section above.
