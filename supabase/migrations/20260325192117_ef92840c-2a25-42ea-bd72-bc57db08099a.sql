
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fit_intelligence_access_mode text DEFAULT 'unlimited',
ADD COLUMN IF NOT EXISTS fit_intelligence_expires_at timestamptz DEFAULT NULL;
