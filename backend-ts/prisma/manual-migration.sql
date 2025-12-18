-- Manual SQL migration for Content Intelligence System
-- Run this in Supabase SQL Editor if Prisma push fails

-- Create trends table
CREATE TABLE IF NOT EXISTS trends (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) UNIQUE NOT NULL,
    title TEXT,
    text TEXT NOT NULL,
    url TEXT,
    author VARCHAR(255),
    timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE
);

-- Create scored_trends table
CREATE TABLE IF NOT EXISTS scored_trends (
    id SERIAL PRIMARY KEY,
    trend_id INTEGER UNIQUE NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    relevance_score DOUBLE PRECISION NOT NULL,
    virality_score DOUBLE PRECISION DEFAULT 0,
    macro_impact_score DOUBLE PRECISION DEFAULT 0,
    risk_level VARCHAR(50) NOT NULL,
    keyword_matches TEXT[] NOT NULL,
    sensitive_flags TEXT[] DEFAULT '{}',
    risk_reason TEXT,
    passed_filter BOOLEAN NOT NULL,
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create content_drafts table
CREATE TABLE IF NOT EXISTS content_drafts (
    id SERIAL PRIMARY KEY,
    trend_id INTEGER NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    hashtags TEXT[] NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trends_source_id ON trends(source_id);
CREATE INDEX IF NOT EXISTS idx_trends_processed ON trends(processed);
CREATE INDEX IF NOT EXISTS idx_trends_timestamp ON trends(timestamp);
CREATE INDEX IF NOT EXISTS idx_scored_trends_trend_id ON scored_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_scored_trends_passed_filter ON scored_trends(passed_filter);
CREATE INDEX IF NOT EXISTS idx_scored_trends_relevance_score ON scored_trends(relevance_score);
CREATE INDEX IF NOT EXISTS idx_content_drafts_trend_id ON content_drafts(trend_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('trends', 'scored_trends', 'content_drafts')
ORDER BY table_name;
