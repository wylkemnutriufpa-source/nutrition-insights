-- Add columns to profiles for editor preference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_editor_version TEXT DEFAULT 'v2',
ADD COLUMN IF NOT EXISTS last_editor_version_used TEXT;

-- Comments for clarity
COMMENT ON COLUMN public.profiles.preferred_editor_version IS 'User global preference for diet editor (v2 or v3)';
COMMENT ON COLUMN public.profiles.last_editor_version_used IS 'Tracks the last editor version used for this specific patient profile';
