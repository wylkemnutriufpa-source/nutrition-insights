-- Function to recalculate totals for a meal plan
CREATE OR REPLACE FUNCTION public.update_meal_plan_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_plan_id UUID;
BEGIN
    -- Determine which plan needs updating
    IF (TG_OP = 'DELETE') THEN
        target_plan_id := OLD.meal_plan_id;
    ELSE
        target_plan_id := NEW.meal_plan_id;
    END IF;

    -- Update the meal_plans table with aggregated totals
    UPDATE public.meal_plans
    SET 
        total_calories = (
            SELECT COALESCE(SUM(calories_target), 0) 
            FROM public.meal_plan_items 
            WHERE meal_plan_id = target_plan_id
        ),
        total_protein = (
            SELECT COALESCE(SUM(protein_target), 0) 
            FROM public.meal_plan_items 
            WHERE meal_plan_id = target_plan_id
        ),
        total_carbs = (
            SELECT COALESCE(SUM(carbs_target), 0) 
            FROM public.meal_plan_items 
            WHERE meal_plan_id = target_plan_id
        ),
        total_fat = (
            SELECT COALESCE(SUM(fat_target), 0) 
            FROM public.meal_plan_items 
            WHERE meal_plan_id = target_plan_id
        ),
        updated_at = NOW()
    WHERE id = target_plan_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after any change to items
DROP TRIGGER IF EXISTS sync_meal_plan_totals_trigger ON public.meal_plan_items;
CREATE TRIGGER sync_meal_plan_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_meal_plan_totals();

-- One-time sync for existing plans
UPDATE public.meal_plans mp
SET 
    total_calories = (SELECT COALESCE(SUM(calories_target), 0) FROM public.meal_plan_items WHERE meal_plan_id = mp.id),
    total_protein = (SELECT COALESCE(SUM(protein_target), 0) FROM public.meal_plan_items WHERE meal_plan_id = mp.id),
    total_carbs = (SELECT COALESCE(SUM(carbs_target), 0) FROM public.meal_plan_items WHERE meal_plan_id = mp.id),
    total_fat = (SELECT COALESCE(SUM(fat_target), 0) FROM public.meal_plan_items WHERE meal_plan_id = mp.id)
WHERE EXISTS (SELECT 1 FROM public.meal_plan_items WHERE meal_plan_id = mp.id);
