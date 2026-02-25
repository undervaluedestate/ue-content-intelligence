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

-- Admins table for RLS-controlled privileged actions
CREATE TABLE IF NOT EXISTS admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE scored_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Admins: allow authenticated users to read their own admin row
DROP POLICY IF EXISTS admins_select_self ON admins;
CREATE POLICY admins_select_self
ON admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trends: public read, admin-only insert/update
DROP POLICY IF EXISTS trends_read_all ON trends;
CREATE POLICY trends_read_all
ON trends
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS trends_admin_insert ON trends;
CREATE POLICY trends_admin_insert
ON trends
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS trends_admin_update ON trends;
CREATE POLICY trends_admin_update
ON trends
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

-- Scored trends: public read, admin-only insert/update
DROP POLICY IF EXISTS scored_trends_read_all ON scored_trends;
CREATE POLICY scored_trends_read_all
ON scored_trends
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS scored_trends_admin_insert ON scored_trends;
CREATE POLICY scored_trends_admin_insert
ON scored_trends
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS scored_trends_admin_update ON scored_trends;
CREATE POLICY scored_trends_admin_update
ON scored_trends
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

-- Content drafts:
-- - public read approved
-- - admins can read all
-- - admin-only insert/update
DROP POLICY IF EXISTS content_drafts_read_approved ON content_drafts;
CREATE POLICY content_drafts_read_approved
ON content_drafts
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS content_drafts_admin_read_all ON content_drafts;
CREATE POLICY content_drafts_admin_read_all
ON content_drafts
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS content_drafts_admin_insert ON content_drafts;
CREATE POLICY content_drafts_admin_insert
ON content_drafts
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS content_drafts_admin_update ON content_drafts;
CREATE POLICY content_drafts_admin_update
ON content_drafts
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('trends', 'scored_trends', 'content_drafts', 'admins')
ORDER BY table_name;
