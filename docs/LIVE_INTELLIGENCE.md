# Live Weather Intelligence Foundation Architecture

## Overview
The **Live Weather Intelligence** pipeline provides a trusted, deterministic backend data foundation for ingesting, validating, deduplicating, geocoding, and clustering live disaster and meteorological news into unified `WeatherEvent` models.

---

## 1. End-to-End Pipeline

```text
External Source (RSS / Atom / Feed API)
  ↓
Feed Provider Adapter (RssFeedProvider implements NewsProvider)
  ↓
Raw Feed Validation (rawFeedItemSchema)
  ↓
Text & URL Sanitization (strip HTML, tracking params)
  ↓
Source Tier & Metadata Classification (Tier 1 / Tier 2 / Tier 3)
  ↓
Normalized NewsArticle Contract
  ↓
Deterministic Deduplicator (Canonical URL & Token Jaccard Similarity)
  ↓
Geographic & Hazard Normalizer (Gazetteer & 19-Category Regex Rulebook)
  ↓
Deterministic Event Clusterer (Multi-signal Category, Geo & Time Window Grouping)
  ↓
Normalized WeatherEvent Contract (with linked Source Articles & Confidence)
  ↓
Event & Article Repositories (InMemory in Dev / Postgres-ready Interface)
  ↓
REST API (/api/events, /api/events/[id], /api/events/sync)
```

---

## 2. Source Strategy & Trust Tiers

Every ingested information source is assigned a Trust Tier metadata tag:

- **Tier 1 (Official Authorities)**:
  - Meteorological, hydrological, geological, and disaster-management agencies.
  - Examples: *India Meteorological Department (IMD)*, *GDACS*, *Central Water Commission (CWC)*, *NOAA / NWS*, *ReliefWeb (UN OCHA)*, *USGS*, *ECMWF*.
- **Tier 2 (Established Media & Wires)**:
  - Major international and national news wire agencies and verified newspapers.
  - Examples: *Reuters*, *Associated Press (AP)*, *Press Trust of India (PTI)*, *BBC News*, *The Hindu*, *Times of India*.
- **Tier 3 (Other Sources)**:
  - Local news portals, community feeds, and blogs.

> [!NOTE]
> Tier 3 sources are preserved with explicit metadata. They are never automatically discarded, but contribute lower initial baseline confidence than Tier 1 official advisories.

---

## 3. Data Contracts

### `NewsArticle` Contract
```typescript
export interface NewsArticle {
  id: string;                      // Deterministic hash of canonical URL + date
  title: string;                   // Sanitized plain text title
  url: string;                     // Canonical sanitized URL (tracking params stripped)
  source: {
    name: string;
    url?: string;
    category: "official" | "government" | "wire" | "news" | "other";
    tier: 1 | 2 | 3;
  };
  publishedAt: ISOTimestamp;       // Publication timestamp
  fetchedAt: ISOTimestamp;         // System retrieval timestamp
  summary?: string;                // Sanitized summary
  content?: string;                // Sanitized body content
  language?: string;               // e.g. "en"
  sourceTier: 1 | 2 | 3;
  provenance: DataProvenance;
}
```

### `WeatherEvent` Contract
```typescript
export interface WeatherEvent {
  id: string;                      // Deterministic ID (e.g. evt_hash)
  slug: string;                    // URL-friendly identifier
  title: string;                   // Lead event title
  category: EventCategory;         // One of 19 standard categories
  hazard: EventCategory;
  severity: "low" | "moderate" | "high" | "extreme";
  status: "monitoring" | "active" | "resolved" | "archived";
  description: string;
  summary?: string;
  location: EventLocation;         // Primary geographic location
  locations: EventLocation[];      // All explicitly mentioned locations
  affectedRegions: EventRegion[];  // Normalized affected regions
  firstSeenAt: ISOTimestamp;
  lastUpdatedAt: ISOTimestamp;
  confidence: number;              // 0.0 to 1.0 based on source tiers and confirmation
  sourceArticleIds: string[];      // References to underlying NewsArticles
  sources: EventSource[];          // Deduplicated source citation list
  impacts: RegionalImpact[];
  provenance: DataProvenance[];
}
```

---

## 4. Controlled Hazard Categories (19)

Deterministic pattern matching assigns events to one of 19 standard categories:
- `flood`, `flash_flood`, `cyclone`, `tropical_storm`, `severe_storm`, `heavy_rain`, `thunderstorm`, `lightning`, `heatwave`, `cold_wave`, `drought`, `wildfire`, `landslide`, `avalanche`, `dust_storm`, `earthquake`, `tsunami`, `volcanic`, `other`.

---

## 5. Deduplication & Clustering

1. **Deduplication**:
   - Canonical URL matching (tracking query parameters stripped).
   - Word token Jaccard similarity (>0.80) within 24-hour publication window.
2. **Event Clustering**:
   - Matches articles sharing:
     - Exact hazard category.
     - Explicit geographic entity overlap.
     - Publication window proximity (<= 48 hours).
     - Title/topic keyword overlap.
   - **Conservative Principle**: False merging is avoided. If criteria are not fully met, articles remain as separate events.

---

## 6. Geographic Metadata & Boundary Rules

- **Explicit Location Extraction**: Uses deterministic gazetteer lookup for countries, Indian states, global regions, and major cities.
- **Strict Prohibition**: Never infers downstream impact or cross-border hydrological claims (e.g. does not infer Indian flood impact from a Nepal event). Such modeling belongs strictly to the future Impact Engine.

---

## 7. Storage / Repository Layer

All persistence is abstracted behind interfaces:
- `EventRepository`: `save`, `saveMany`, `findById`, `findBySlug`, `findAll(filter)`, `delete`.
- `ArticleRepository`: `save`, `saveMany`, `findById`, `findByUrl`, `findAll(filter)`.

Development utilizes `InMemoryEventRepository` and `InMemoryArticleRepository`. Production databases can be swapped in by implementing these interfaces without altering business services.

---

## 8. Security & Sanitization

- All external content is treated as **Untrusted Data**.
- HTML tags, scripts, and control characters are stripped.
- Raw external text is never executed as code or interpreted as system instructions.
