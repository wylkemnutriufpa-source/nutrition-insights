
SET session_replication_role = 'replica';

UPDATE meal_plan_items
SET description = REGEXP_REPLACE(
  REGEXP_REPLACE(description, ' — NaNg', '', 'g'),
  'NaNg', '', 'g'
)
WHERE description LIKE '%NaN%';

SET session_replication_role = 'origin';

-- Also update the integrity trigger to catch NaNg pattern
CREATE OR REPLACE FUNCTION public.fn_validate_meal_plan_item_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.calories_target IS NOT NULL AND NEW.calories_target <= 0 THEN
    NEW.calories_target := NULL;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    SELECT mp.tenant_id INTO NEW.tenant_id
    FROM meal_plans mp WHERE mp.id = NEW.meal_plan_id;
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'meal_plan_item requires tenant_id';
    END IF;
  END IF;

  IF NEW.description IS NOT NULL THEN
    NEW.description := REGEXP_REPLACE(NEW.description, ' — (undefined|NaN)g', '', 'g');
    NEW.description := REGEXP_REPLACE(NEW.description, '(undefined|NaN)g', '', 'g');
    NEW.description := REGEXP_REPLACE(NEW.description, '\b(undefined|NaN)\b', '', 'gi');
  END IF;

  RETURN NEW;
END;
$$;
