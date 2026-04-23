-- Refine functions with secure search_path
ALTER FUNCTION public.fn_sync_meal_plan_item_targets() SET search_path = public;
ALTER FUNCTION public.fn_propagate_meal_target_changes() SET search_path = public;

-- Drop and recreate policy with proper check
DROP POLICY IF EXISTS "Nutritionists can manage meal targets v2" ON public.meal_plan_meal_targets;

CREATE POLICY "Nutritionists can manage meal targets v3"
    ON public.meal_plan_meal_targets
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT nutritionist_id 
            FROM public.meal_plans 
            WHERE id = meal_plan_id
        )
    );

-- Also fix any other permissive policies if needed, but for now focus on the ones I added.
