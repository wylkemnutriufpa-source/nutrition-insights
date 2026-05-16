ALTER TABLE public.v3_diet_templates ADD COLUMN IF NOT EXISTS plan_snapshot JSONB;

COMMENT ON COLUMN public.v3_diet_templates.plan_snapshot IS 'Stores a static snapshot of the meal plan (meals and items) to avoid procedural generation.';