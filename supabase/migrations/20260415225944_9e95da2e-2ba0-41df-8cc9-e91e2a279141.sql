
SET session_replication_role = 'replica';

-- Clean remaining NaN in descriptions
UPDATE meal_plan_items
SET description = REGEXP_REPLACE(description, '\bNaN\b', '', 'gi')
WHERE description ~ 'NaN';

-- Fix calories_target = 0 → NULL
UPDATE meal_plan_items
SET calories_target = NULL
WHERE calories_target = 0;

SET session_replication_role = 'origin';

-- Fix anamnesis trigger to use correct column name
CREATE OR REPLACE FUNCTION public.fn_validate_anamnesis_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.computed_tmb IS NULL OR NEW.computed_tmb <= 0 THEN
      RAISE WARNING 'anamnesis completed but computed_tmb missing — reverting to pending_review';
      NEW.status := 'pending_review';
    END IF;
    IF NEW.computed_kcal_target IS NULL OR NEW.computed_kcal_target <= 0 THEN
      RAISE WARNING 'anamnesis completed but computed_kcal_target missing — reverting to pending_review';
      NEW.status := 'pending_review';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
