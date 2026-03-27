-- Phase 4: Add indexes for observability queries and food database performance

-- Index on ai_usage_tracking for faster filtering by feature_key + date
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_feature_date 
ON public.ai_usage_tracking (feature_key, used_at DESC);

-- Index on meal_analysis_cache for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_meal_analysis_cache_expires 
ON public.meal_analysis_cache (expires_at);

-- Index on ifj_food_database for normalized name lookups
CREATE INDEX IF NOT EXISTS idx_ifj_food_db_normalized 
ON public.ifj_food_database (normalized_name) WHERE is_active = true;

-- GIN index on ifj_food_database synonyms for synonym search
CREATE INDEX IF NOT EXISTS idx_ifj_food_db_synonyms 
ON public.ifj_food_database USING gin (synonyms) WHERE is_active = true;