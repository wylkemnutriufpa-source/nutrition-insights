CREATE OR REPLACE FUNCTION public.update_meal_plan_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
 DECLARE
   target_plan_id UUID;
   v_plan_mode TEXT;
   v_calories NUMERIC := 0;
   v_protein  NUMERIC := 0;
   v_carbs    NUMERIC := 0;
   v_fat      NUMERIC := 0;
   v_count    INTEGER := 0;
   v_day_count INTEGER := 1;
   v_status   TEXT := 'ok';
 BEGIN
   IF (TG_OP = 'DELETE') THEN
     target_plan_id := OLD.meal_plan_id;
   ELSE
     target_plan_id := NEW.meal_plan_id;
   END IF;

   -- Get plan mode to check if we need to average
   SELECT plan_mode INTO v_plan_mode FROM public.meal_plans WHERE id = target_plan_id;

   SELECT
     COALESCE(SUM(calories_target), 0),
     COALESCE(SUM(protein_target), 0),
     COALESCE(SUM(carbs_target), 0),
     COALESCE(SUM(fat_target), 0),
     COUNT(*),
     COALESCE(NULLIF(COUNT(DISTINCT day_of_week), 0), 1)
   INTO v_calories, v_protein, v_carbs, v_fat, v_count, v_day_count
   FROM public.meal_plan_items
   WHERE meal_plan_id = target_plan_id
     AND is_primary = true;

   -- For weekly plans, we show the daily average
   IF v_plan_mode = 'weekly' THEN
     v_calories := v_calories / v_day_count;
     v_protein  := v_protein / v_day_count;
     v_carbs    := v_carbs / v_day_count;
     v_fat      := v_fat / v_day_count;
   END IF;

   IF v_count = 0 OR (v_calories = 0 AND v_protein = 0 AND v_carbs = 0 AND v_fat = 0) THEN
     v_status := 'incomplete';
   END IF;

   UPDATE public.meal_plans
   SET
     total_calories = ROUND(v_calories),
     total_protein  = ROUND(v_protein, 1),
     total_carbs    = ROUND(v_carbs, 1),
     total_fat      = ROUND(v_fat, 1),
     totals_status  = v_status,
     updated_at     = NOW()
   WHERE id = target_plan_id;

   RETURN NULL;
 END;
 $function$;