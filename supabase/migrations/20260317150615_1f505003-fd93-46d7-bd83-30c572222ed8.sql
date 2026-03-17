
-- Add controlled generation fields to body_projection_snapshots
ALTER TABLE public.body_projection_snapshots
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES public.body_assessment_photos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS generation_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS current_metrics_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS projected_metrics_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_visual_url text,
  ADD COLUMN IF NOT EXISTS projected_visual_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Set defaults for existing rows
UPDATE public.body_projection_snapshots
SET current_metrics_json = COALESCE(current_body_json, '{}'::jsonb),
    projected_metrics_json = COALESCE(projected_body_json, '{}'::jsonb),
    valid_until = created_at + interval '30 days',
    locked_until = created_at + interval '30 days'
WHERE current_metrics_json = '{}'::jsonb;

-- Create index for cooldown lookups
CREATE INDEX IF NOT EXISTS idx_body_proj_patient_created 
  ON public.body_projection_snapshots(patient_id, created_at DESC);

-- Create index for active projections
CREATE INDEX IF NOT EXISTS idx_body_proj_patient_valid 
  ON public.body_projection_snapshots(patient_id, valid_until DESC);
