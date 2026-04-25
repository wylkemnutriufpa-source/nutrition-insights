-- Drop outdated functions related to single-day replication/consistency
DROP FUNCTION IF EXISTS public.enforce_single_day_normalization(uuid);
DROP FUNCTION IF EXISTS public.reconcile_published_plans(integer);
DROP FUNCTION IF EXISTS public.repair_single_day_plan(uuid);
DROP FUNCTION IF EXISTS public.validate_single_day_consistency(uuid);

-- Drop trigger on meal_plan_items
DROP TRIGGER IF EXISTS trigger_validate_plan_consistency ON public.meal_plan_items;

-- Clean up any non-zero day_of_week items (force single day model)
UPDATE public.meal_plan_items SET day_of_week = 0 WHERE day_of_week <> 0;

-- Ensure day_of_week is always 0 (redundant but safe since tr_force_day_zero_simple already exists)
-- If master_item_id column exists (though not seen in recent \d), we would drop it here.
-- Based on the \d output, it is not in meal_plan_items, so we don't need to drop it.

-- Ensure clinical_rules doesn't have any 'wrong_replica_count' rules
DELETE FROM public.clinical_rules WHERE name = 'wrong_replica_count';
