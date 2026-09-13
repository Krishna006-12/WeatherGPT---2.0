-- ==============================================================================
-- WeatherGPT 2.0 Production DDL Schema
-- Compatible with PostgreSQL (Supabase / Neon / AWS RDS)
-- Multi-tier persistence for Users, Preferences, Locations, Alerts, Chat, and Agri
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Supports authenticated OAuth users (Google) and anonymous guest rural sessions
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    image_url TEXT,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(32) NOT NULL DEFAULT 'user', -- 'user', 'farmer', 'admin', 'analyst'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);

-- 2. USER PREFERENCES
-- Stored preferences for language, units, accessibility, and high contrast
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(8) NOT NULL DEFAULT 'en', -- 'en', 'hi', 'pa'
    temperature_unit VARCHAR(4) NOT NULL DEFAULT 'C', -- 'C', 'F'
    wind_speed_unit VARCHAR(8) NOT NULL DEFAULT 'km/h', -- 'km/h', 'mph', 'm/s'
    precipitation_unit VARCHAR(4) NOT NULL DEFAULT 'mm', -- 'mm', 'inch'
    pressure_unit VARCHAR(8) NOT NULL DEFAULT 'hPa', -- 'hPa', 'inHg'
    high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    haptic_feedback BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR(16) NOT NULL DEFAULT 'dark', -- 'dark', 'light', 'system'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SAVED LOCATIONS (Bookmarked / Pinned locations)
CREATE TABLE IF NOT EXISTS locations_saved (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    country VARCHAR(128) NOT NULL,
    region VARCHAR(128),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    display_name TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    label VARCHAR(64), -- 'Home', 'Farm', 'Office', 'Warehouse'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_saved_user ON locations_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_saved_coords ON locations_saved(latitude, longitude);

-- 4. RECENT LOCATIONS (Ring buffer of up to 12 recent searches)
CREATE TABLE IF NOT EXISTS recent_locations (
    id VARCHAR(64) PRIMARY KEY,
    user_id_or_session VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    country VARCHAR(128) NOT NULL,
    region VARCHAR(128),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    display_name TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recent_locations_session ON recent_locations(user_id_or_session, viewed_at DESC);

-- 5. ALERT SUBSCRIPTIONS (Proactive weather alerts)
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    min_severity VARCHAR(16) NOT NULL DEFAULT 'moderate', -- 'minor', 'moderate', 'severe', 'extreme'
    categories TEXT[] NOT NULL DEFAULT '{"flood", "heatwave", "storm", "cyclone", "frost"}',
    channels TEXT[] NOT NULL DEFAULT '{"in_app"}', -- 'in_app', 'web_push', 'sms'
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_subs_coords ON alert_subscriptions(latitude, longitude) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alert_subs_user ON alert_subscriptions(user_id);

-- 6. ALERT LOG (Audit trail of dispatched warnings)
CREATE TABLE IF NOT EXISTS alert_log (
    id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) REFERENCES alert_subscriptions(id) ON DELETE SET NULL,
    event_id VARCHAR(128) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    category VARCHAR(32) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    recipient_target TEXT,
    headline TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'delivered', -- 'delivered', 'failed', 'suppressed'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_log_event ON alert_log(event_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log(sent_at DESC);

-- 7. CHAT HISTORY (AI Copilot multi-turn interactions)
CREATE TABLE IF NOT EXISTS chat_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id_or_session VARCHAR(128) NOT NULL,
    role VARCHAR(16) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    location_context JSONB,
    tool_calls JSONB,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(user_id_or_session, created_at ASC);

-- 8. AGRICULTURE QUERIES HISTORY
CREATE TABLE IF NOT EXISTS agriculture_queries_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id_or_session VARCHAR(128) NOT NULL,
    crop_id VARCHAR(64) NOT NULL,
    crop_name VARCHAR(128) NOT NULL,
    growth_stage VARCHAR(64) NOT NULL,
    soil_type VARCHAR(64),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    et0_mm_day DOUBLE PRECISION,
    spray_suitability VARCHAR(32),
    irrigation_advice TEXT,
    disease_risks JSONB DEFAULT '[]'::jsonb,
    queried_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agri_history_crop ON agriculture_queries_history(crop_id);
CREATE INDEX IF NOT EXISTS idx_agri_history_session ON agriculture_queries_history(user_id_or_session, queried_at DESC);

-- 9. WEATHER EVENTS & NEWS STORAGE (Database backing for EventRepository & ArticleRepository)
CREATE TABLE IF NOT EXISTS weather_events (
    id VARCHAR(128) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    hazard VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    description TEXT,
    primary_location_name VARCHAR(255) NOT NULL,
    primary_country VARCHAR(128) NOT NULL,
    primary_region VARCHAR(128),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_updated_at TIMESTAMPTZ NOT NULL,
    raw_event_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weather_events_category ON weather_events(category);
CREATE INDEX IF NOT EXISTS idx_weather_events_severity ON weather_events(severity);
CREATE INDEX IF NOT EXISTS idx_weather_events_status ON weather_events(status);
CREATE INDEX IF NOT EXISTS idx_weather_events_coords ON weather_events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_events_updated ON weather_events(last_updated_at DESC);

CREATE TABLE IF NOT EXISTS news_articles (
    id VARCHAR(128) PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    source_name VARCHAR(255) NOT NULL,
    source_tier INT NOT NULL DEFAULT 3,
    published_at TIMESTAMPTZ NOT NULL,
    raw_article_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_articles_tier ON news_articles(source_tier);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
