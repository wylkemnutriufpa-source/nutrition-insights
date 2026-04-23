-- Fix search_path for common triggers
ALTER FUNCTION public.update_meal_plan_totals() SET search_path = public;
ALTER FUNCTION public.fn_validate_meal_plan_item_integrity() SET search_path = public;

-- Ensure meal_plan_meal_targets has a robust policy
DROP POLICY IF EXISTS "Nutritionists can manage meal targets v3" ON public.meal_plan_meal_targets;
CREATE POLICY "Nutritionists can manage own meal targets"
    ON public.meal_plan_meal_targets
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE id = meal_plan_meal_targets.meal_plan_id 
            AND nutritionist_id = auth.uid()
        )
    );
