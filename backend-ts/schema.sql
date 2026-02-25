-- Schema + RLS setup for Content Intelligence System (Supabase)

-- Create trends table
CREATE TABLE IF NOT EXISTS public.trends (
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
CREATE TABLE IF NOT EXISTS public.scored_trends (
    id SERIAL PRIMARY KEY,
    trend_id INTEGER UNIQUE NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.content_drafts (
    id SERIAL PRIMARY KEY,
    trend_id INTEGER NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trends_source_id ON public.trends(source_id);
CREATE INDEX IF NOT EXISTS idx_trends_processed ON public.trends(processed);
CREATE INDEX IF NOT EXISTS idx_trends_timestamp ON public.trends(timestamp);
CREATE INDEX IF NOT EXISTS idx_scored_trends_trend_id ON public.scored_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_scored_trends_passed_filter ON public.scored_trends(passed_filter);
CREATE INDEX IF NOT EXISTS idx_scored_trends_relevance_score ON public.scored_trends(relevance_score);
CREATE INDEX IF NOT EXISTS idx_content_drafts_trend_id ON public.content_drafts(trend_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON public.content_drafts(status);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scored_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- Admins: allow authenticated users to read their own admin row
DROP POLICY IF EXISTS admins_select_self ON public.admins;
CREATE POLICY admins_select_self
ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trends: public read, admin-only insert/update
DROP POLICY IF EXISTS trends_read_all ON public.trends;
CREATE POLICY trends_read_all
ON public.trends
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS trends_admin_insert ON public.trends;
CREATE POLICY trends_admin_insert
ON public.trends
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS trends_admin_update ON public.trends;
CREATE POLICY trends_admin_update
ON public.trends
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Scored trends: public read, admin-only insert/update
DROP POLICY IF EXISTS scored_trends_read_all ON public.scored_trends;
CREATE POLICY scored_trends_read_all
ON public.scored_trends
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS scored_trends_admin_insert ON public.scored_trends;
CREATE POLICY scored_trends_admin_insert
ON public.scored_trends
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS scored_trends_admin_update ON public.scored_trends;
CREATE POLICY scored_trends_admin_update
ON public.scored_trends
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Content drafts:
-- - public read approved
-- - admins can read all
-- - admin-only insert/update
DROP POLICY IF EXISTS content_drafts_read_approved ON public.content_drafts;
CREATE POLICY content_drafts_read_approved
ON public.content_drafts
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS content_drafts_admin_read_all ON public.content_drafts;
CREATE POLICY content_drafts_admin_read_all
ON public.content_drafts
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS content_drafts_admin_insert ON public.content_drafts;
CREATE POLICY content_drafts_admin_insert
ON public.content_drafts
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS content_drafts_admin_update ON public.content_drafts;
CREATE POLICY content_drafts_admin_update
ON public.content_drafts
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('trends', 'scored_trends', 'content_drafts', 'admins')
ORDER BY table_name;
