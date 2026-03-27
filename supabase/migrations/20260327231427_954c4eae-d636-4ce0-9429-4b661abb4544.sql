
-- ═══════════════════════════════════════════════════
-- Phase 3: Add synonyms column + meal_analysis_cache
-- ═══════════════════════════════════════════════════

-- 1. Add synonyms column to ifj_food_database for better matching
ALTER TABLE public.ifj_food_database
  ADD COLUMN IF NOT EXISTS synonyms text[] DEFAULT '{}';

-- 2. Create meal analysis cache table
CREATE TABLE IF NOT EXISTS public.meal_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description_hash text NOT NULL,
  description_original text NOT NULL,
  has_image boolean DEFAULT false,
  analysis_result jsonb NOT NULL,
  source text DEFAULT 'ai_fallback',
  hit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_cache_hash ON public.meal_analysis_cache(description_hash);
CREATE INDEX IF NOT EXISTS idx_meal_cache_expires ON public.meal_analysis_cache(expires_at);

-- RLS
ALTER TABLE public.meal_analysis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meal_analysis_cache" ON public.meal_analysis_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service insert meal_analysis_cache" ON public.meal_analysis_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service update meal_analysis_cache" ON public.meal_analysis_cache FOR UPDATE TO service_role USING (true);

-- 3. Add index on synonyms for GIN search
CREATE INDEX IF NOT EXISTS idx_ifj_food_database_synonyms ON public.ifj_food_database USING GIN (synonyms);
