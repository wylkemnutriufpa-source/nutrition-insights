
-- Critical: Add missing index on meal_plan_items.meal_plan_id (656 seq_scans detected)
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal_plan_id ON public.meal_plan_items (meal_plan_id);

-- Add composite index for day_of_week queries in editor
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_day ON public.meal_plan_items (meal_plan_id, day_of_week);

-- Add index on meal_plan_items.meal_type for filtered queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_meal_type ON public.meal_plan_items (meal_plan_id, meal_type);
