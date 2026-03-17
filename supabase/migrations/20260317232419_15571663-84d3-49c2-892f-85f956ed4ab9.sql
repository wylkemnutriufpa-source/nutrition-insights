
-- Step 1: Add search_vector to profiles (without email)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(full_name, '') || ' ' || coalesce(phone, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON public.profiles USING GIN (search_vector);
