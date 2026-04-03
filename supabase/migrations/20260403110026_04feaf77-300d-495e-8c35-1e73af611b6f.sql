
-- Fix: recalculate_meal_plan_totals must store DAILY AVERAGE, not weekly sum
CREATE OR REPLACE FUNCTION public.recalculate_meal_plan_totals(plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _calories numeric;
  _protein numeric;
  _carbs numeric;
  _fat numeric;
  _day_count integer;
BEGIN
  -- Calculate per-day totals first, then average across days
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
    total_target_fat = ROUND(_fat)
  WHERE id = plan_id;
END;
$function$;

-- Normalize all existing plans that have items
WITH day_averages AS (
  SELECT
    meal_plan_id,
    ROUND(AVG(day_calories)) AS avg_cal,
    ROUND(AVG(day_protein)) AS avg_pro,
    ROUND(AVG(day_carbs)) AS avg_carb,
    ROUND(AVG(day_fat)) AS avg_fat
  FROM (
    SELECT
      meal_plan_id,
      day_of_week,
      SUM(COALESCE(calories_target, 0)) AS day_calories,
      SUM(COALESCE(protein_target, 0)) AS day_protein,
      SUM(COALESCE(carbs_target, 0)) AS day_carbs,
      SUM(COALESCE(fat_target, 0)) AS day_fat
    FROM meal_plan_items
    GROUP BY meal_plan_id, day_of_week
  ) per_day
  GROUP BY meal_plan_id
)
UPDATE meal_plans mp
SET
  total_target_calories = da.avg_cal,
  total_target_protein = da.avg_pro,
  total_target_carbs = da.avg_carb,
  total_target_fat = da.avg_fat
FROM day_averages da
WHERE da.meal_plan_id = mp.id
  AND (
    mp.total_target_calories IS DISTINCT FROM da.avg_cal
    OR mp.total_target_protein IS DISTINCT FROM da.avg_pro
    OR mp.total_target_carbs IS DISTINCT FROM da.avg_carb
    OR mp.total_target_fat IS DISTINCT FROM da.avg_fat
  );
