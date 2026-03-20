
-- Add onboarding release control columns to onboarding_pipelines
ALTER TABLE public.onboarding_pipelines 
  ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'awaiting_release'
    CHECK (release_status IN ('awaiting_release', 'released', 'blocked')),
  ADD COLUMN IF NOT EXISTS released_by uuid,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS clinical_flags jsonb DEFAULT '[]'::jsonb;

-- Add index for release status queries
CREATE INDEX IF NOT EXISTS idx_onboarding_pipelines_release_status 
  ON public.onboarding_pipelines (release_status, patient_id);

-- Update existing pipelines: mark completed/superseded ones as 'released' retroactively
UPDATE public.onboarding_pipelines 
SET release_status = 'released', released_at = created_at
WHERE status IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan');

-- Mark active in-progress pipelines as released (backward compat for existing patients)
UPDATE public.onboarding_pipelines 
SET release_status = 'released', released_at = created_at
WHERE status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'pending_approval', 'pending_plan_generation')
AND release_status = 'awaiting_release';
