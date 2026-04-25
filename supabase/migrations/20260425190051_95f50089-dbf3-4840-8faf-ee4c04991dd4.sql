-- Habilitar triggers desabilitados
ALTER TABLE public.meal_plan_items ENABLE TRIGGER sync_meal_plan_totals_trigger;
ALTER TABLE public.meal_plan_items ENABLE TRIGGER trg_recalculate_meal_plan_totals;

-- Unificar lógica de recalculo de totais para atualizar ambas as colunas
CREATE OR REPLACE FUNCTION public.recalculate_meal_plan_totals(plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
   _calories numeric;
   _protein numeric;
   _carbs numeric;
   _fat numeric;
   _day_count integer;
 BEGIN
   -- Calculate per-day totals first, then average across days (Single-day is avg of 1 day)
   SELECT 
     COALESCE(AVG(day_calories), 0),
     COALESCE(AVG(day_protein), 0),
     COALESCE(AVG(day_carbs), 0),
     COALESCE(AVG(day_fat), 0),
     COUNT(*)
   INTO _calories, _protein, _carbs, _fat, _day_count
   FROM (
     SELECT 
       day_of_week,
       SUM(COALESCE(calories_target, 0)) AS day_calories,
       SUM(COALESCE(protein_target, 0)) AS day_protein,
       SUM(COALESCE(carbs_target, 0)) AS day_carbs,
       SUM(COALESCE(fat_target, 0)) AS day_fat
     FROM meal_plan_items
     WHERE meal_plan_id = plan_id
     GROUP BY day_of_week
   ) day_totals;

   UPDATE meal_plans
   SET 
     total_target_calories = ROUND(_calories),
     total_target_protein = ROUND(_protein),
     total_target_carbs = ROUND(_carbs),
     total_target_fat = ROUND(_fat),
     -- Sync with real columns used by UI
     total_calories = ROUND(_calories),
     total_protein = ROUND(_protein),
     total_carbs = ROUND(_carbs),
     total_fat = ROUND(_fat),
     totals_status = CASE WHEN _day_count > 0 THEN 'ok' ELSE 'incomplete' END,
     updated_at = now()
   WHERE id = plan_id;
 END;
 $function$;

-- Comentário explicativo sobre a restrição de dia único
COMMENT ON TABLE public.meal_plan_items IS 'Itens de planos alimentares. Restrito ao dia 0 via gatilho tr_force_day_zero_simple para modelo Single-Day.';
