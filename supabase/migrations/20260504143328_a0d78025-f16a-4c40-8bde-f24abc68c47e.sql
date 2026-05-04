-- Update RPC to filter by is_primary = true
CREATE OR REPLACE FUNCTION public.calculate_plan_totals(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

   SELECT
     COALESCE(SUM(calories_target), 0),
     COALESCE(SUM(protein_target), 0),
     COALESCE(SUM(carbs_target), 0),
     COALESCE(SUM(fat_target), 0),
     COUNT(*)
   INTO v_calories, v_protein, v_carbs, v_fat, v_count
   FROM public.meal_plan_items
   WHERE meal_plan_id = p_plan_id
     AND is_primary = true; -- ONLY primary items

   -- Plano sem itens OU totais zerados → marca como incompleto, mas NÃO falha
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

-- Update trigger function to filter by is_primary = true
CREATE OR REPLACE FUNCTION public.update_meal_plan_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 DECLARE
   target_plan_id UUID;
   v_calories NUMERIC := 0;
   v_protein  NUMERIC := 0;
   v_carbs    NUMERIC := 0;
   v_fat      NUMERIC := 0;
   v_count    INTEGER := 0;
   v_status   TEXT := 'ok';
 BEGIN
   IF (TG_OP = 'DELETE') THEN
     target_plan_id := OLD.meal_plan_id;
   ELSE
     target_plan_id := NEW.meal_plan_id;
   END IF;

   SELECT
     COALESCE(SUM(calories_target), 0),
     COALESCE(SUM(protein_target), 0),
     COALESCE(SUM(carbs_target), 0),
     COALESCE(SUM(fat_target), 0),
     COUNT(*)
   INTO v_calories, v_protein, v_carbs, v_fat, v_count
   FROM public.meal_plan_items
   WHERE meal_plan_id = target_plan_id
     AND is_primary = true; -- ONLY primary items

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
   WHERE id = target_plan_id;

   RETURN NULL;
 END;
 $function$;
