CREATE OR REPLACE FUNCTION public.calculate_plan_totals(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
   v_calories NUMERIC := 0;
   v_protein  NUMERIC := 0;
   v_carbs    NUMERIC := 0;
   v_fat      NUMERIC := 0;
   v_count    INTEGER := 0;
   v_status   TEXT := 'ok';
 BEGIN
   IF p_plan_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'plan_id_required');
   END IF;

   -- Calculate average daily totals
   WITH day_stats AS (
     SELECT
       day_of_week,
       COALESCE(SUM(calories_target), 0) as daily_kcal,
       COALESCE(SUM(protein_target), 0) as daily_prot,
       COALESCE(SUM(carbs_target), 0) as daily_carb,
       COALESCE(SUM(fat_target), 0) as daily_fat
     FROM public.meal_plan_items
     WHERE meal_plan_id = p_plan_id
       AND is_primary = true
     GROUP BY day_of_week
   )
   SELECT
     COALESCE(AVG(daily_kcal), 0),
     COALESCE(AVG(daily_prot), 0),
     COALESCE(AVG(daily_carb), 0),
     COALESCE(AVG(daily_fat), 0)
   INTO v_calories, v_protein, v_carbs, v_fat
   FROM day_stats;

   -- Total count of primary items
   SELECT COUNT(*)
   INTO v_count
   FROM public.meal_plan_items
   WHERE meal_plan_id = p_plan_id
     AND is_primary = true;

   -- Mark as incomplete if empty
   IF v_count = 0 OR (v_calories = 0 AND v_protein = 0 AND v_carbs = 0 AND v_fat = 0) THEN
     v_status := 'incomplete';
   END IF;

   UPDATE public.meal_plans
   SET
     total_calories = v_calories,
     total_protein  = v_protein,
     total_carbs    = v_carbs,
     total_fat      = v_fat,
     totals_status  = v_status,
     updated_at     = NOW()
   WHERE id = p_plan_id;

   RETURN jsonb_build_object(
     'success', true,
     'plan_id', p_plan_id,
     'totals_status', v_status,
     'item_count', v_count,
     'total_calories', v_calories,
     'total_protein', v_protein,
     'total_carbs', v_carbs,
     'total_fat', v_fat
   );
 EXCEPTION WHEN OTHERS THEN
   UPDATE public.meal_plans
   SET totals_status = 'incomplete', updated_at = NOW()
   WHERE id = p_plan_id;
   RETURN jsonb_build_object(
     'success', false,
     'plan_id', p_plan_id,
     'totals_status', 'incomplete',
     'error', SQLERRM
   );
 END;
 $function$;