# UI Design Documentation — WeatherGPT 2.0

This document satisfies problem-statement deliverable #4 ("User interface designs for web and mobile platforms"). It documents the screens and component system as actually implemented (Next.js App Router + Tailwind v4), not a separate mockup file — the working app *is* the design artifact, described here for the report.

## 1. Design system
- **Stack**: Next.js App Router, Tailwind CSS v4, `tailwind-merge` for conditional class composition, `lucide-react` for iconography.
- **Motion**: a dedicated motion system (`docs/MOTION_SYSTEM.md`, `src/components/motion/`) governs transitions/animation consistently rather than ad hoc per-screen animation.
- **Responsiveness**: Tailwind's responsive utilities are used throughout `src/components/**` and `src/app/(app)/**` — screens are built mobile-first rather than desktop-first-then-adapted, consistent with the accessibility/responsiveness requirement in the original problem statement.

## 2. Screens (route → purpose → key components)

| Route | Purpose | Key components |
|---|---|---|
| `/dashboard` | Landing overview — current conditions + active alerts at a glance | `weather/*`, `events/*` |
| `/weather` | Detailed current-conditions view | `components/weather/` |
| `/forecast` | Multi-day / hourly forecast view | `components/weather/` |
| `/chat` | Conversational query interface (the core "WeatherGPT" experience) | `components/chat/` incl. `ai-copilot-card.tsx` |
| `/copilot` | AI-assisted recommendations surface (risk, activity-suitability, model-consensus copilots) | `ai-copilot-card.tsx` + `services/ai` |
| `/risks` | Severe-weather risk view, backed by `services/risk/risk-evaluators/` | `components/risk/` |
| `/agriculture` | Farmer-persona crop advisory view | `components/agriculture/` |
| `/impact` | Impact-engine output (what a forecast means practically) | `components/impact/` |
| `/intelligence` | Live intelligence feed (GDACS/USGS/official advisories) | `components/events/` |
| `/history` | Historical weather lookup | uses `historical-weather-provider.ts` |
| `/motion` | Motion-system showcase/reference | `components/motion/` |
| `/settings` | User/persona/language preferences | `components/auth/` (if account-scoped) |

## 3. Persona-driven UI variation
Per `docs/MASTER_SPEC.md` and the Phase 5 work, the same underlying data renders differently by persona (e.g. farmer-facing agricultural advisories vs. general-public forecast summaries) and by selected language — this is UI-level personalization on top of one shared data layer, not separate codebases per persona.

## 4. Accessibility
Accessibility compliance (WCAG-aligned) was a Phase 6 target. If the accessibility audit (axe-core or manual) hasn't been run and recorded yet, that is the one open item under this deliverable — worth a quick pass today: keyboard navigation through `/chat` and alert banners, ARIA labels on interactive elements, and color contrast on severity-coded alert badges.

## 5. Mobile
No separate native mobile app exists (nor was one required — the problem statement says "web and mobile platforms," which a responsive web app satisfies). The `public/manifest.json` present in the repo indicates PWA-style installability, which is a reasonable way to describe mobile coverage in the report: a responsive, installable web app rather than two separate codebases.
