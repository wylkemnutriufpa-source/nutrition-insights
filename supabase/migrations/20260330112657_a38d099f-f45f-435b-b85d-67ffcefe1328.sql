
-- Add item-level state tracking flags to meal_plan_items
ALTER TABLE public.meal_plan_items 
  ADD COLUMN IF NOT EXISTS item_origin TEXT NOT NULL DEFAULT 'template',
  ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_auto_corrected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_metadata JSONB DEFAULT NULL;

-- Add plan-level pipeline tracking to meal_plans
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pipeline_completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS personalization_applied BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.meal_plan_items.item_origin IS 'Origin: template, personalized, auto_corrected, manual';
COMMENT ON COLUMN public.meal_plan_items.is_manually_edited IS 'True if professional manually edited this item';
COMMENT ON COLUMN public.meal_plan_items.is_locked IS 'True if item should not be recalculated by engines';
COMMENT ON COLUMN public.meal_plan_items.was_auto_corrected IS 'True if AutoFix engine modified this item';
COMMENT ON COLUMN public.meal_plan_items.edit_metadata IS 'JSON with edit history: {edited_by, edited_at, previous_values}';
