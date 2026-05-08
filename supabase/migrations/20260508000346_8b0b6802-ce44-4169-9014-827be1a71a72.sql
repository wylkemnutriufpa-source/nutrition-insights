-- Add central fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS current_height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS activity_level TEXT,
ADD COLUMN IF NOT EXISTS restrictions TEXT[],
ADD COLUMN IF NOT EXISTS preferences TEXT[];

-- Update existing data if possible (copy from current_weight if exists)
UPDATE public.profiles 
SET current_weight_kg = current_weight 
WHERE current_weight_kg IS NULL AND current_weight IS NOT NULL;

-- Enable Realtime for profiles to support sync
-- (Usually managed in Supabase dashboard but we can ensure the publication includes it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    -- This might fail if the publication doesn't exist yet, which is fine
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
