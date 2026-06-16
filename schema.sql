-- Database Schema (Supabase / PostgreSQL)

-- 1. Table Definition
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_market_moving BOOLEAN DEFAULT false,
    rationale TEXT,
    severity_score SMALLINT CHECK (severity_score BETWEEN 1 AND 10),
    asset_class VARCHAR(50),
    bullish_assets TEXT[],
    bearish_assets TEXT[],
    analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'analyzed', 'failed')),
    analysis_attempts INTEGER DEFAULT 0,
    last_analysis_error TEXT,
    first_order_impact TEXT,
    second_order_effect TEXT,
    hidden_vulnerability TEXT,
    raw_content TEXT
);

-- 2. Database Performance Optimizations
-- High-speed query indexing for mobile feeds ordered by time and severity
CREATE INDEX IF NOT EXISTS idx_events_market_moving_date ON events(is_market_moving, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(analysis_status);

-- 3. Row Level Security Policies
-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous and authenticated users) to read events
CREATE POLICY "Allow public read access" ON events
    FOR SELECT
    TO public
    USING (true);
