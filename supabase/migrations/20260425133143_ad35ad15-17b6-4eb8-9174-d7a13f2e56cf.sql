-- Remove the single-day restriction that was blocking multi-day plans
ALTER TABLE public.meal_plan_items DROP CONSTRAINT IF EXISTS meal_plan_items_day_zero_only;
