
-- ============================================================
-- HARDENING: Data Integrity Validation Triggers
-- ============================================================

-- 1. meal_plan_items: block invalid macros and descriptions
CREATE OR REPLACE FUNCTION public.fn_validate_meal_plan_item_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Enforce non-zero calories (allow NULL for flexibility, but not 0)
  IF NEW.calories_target IS NOT NULL AND NEW.calories_target <= 0 THEN
    RAISE WARNING 'meal_plan_item calories_target was %, correcting to NULL', NEW.calories_target;
    NEW.calories_target := NULL;
  END IF;

  -- Enforce non-null tenant_id
  IF NEW.tenant_id IS NULL THEN
    -- Try to inherit from parent meal_plan
    SELECT mp.tenant_id INTO NEW.tenant_id
    FROM meal_plans mp WHERE mp.id = NEW.meal_plan_id;
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'meal_plan_item requires tenant_id (could not inherit from meal_plan)';
    END IF;
  END IF;

  -- Sanitize description: remove "undefined", "NaN" artifacts
  IF NEW.description IS NOT NULL THEN
    NEW.description := REGEXP_REPLACE(NEW.description, ' — undefinedg', '', 'g');
    NEW.description := REGEXP_REPLACE(NEW.description, ' — NaNg', '', 'g');
    NEW.description := REGEXP_REPLACE(NEW.description, 'undefinedg', '', 'g');
    NEW.description := REGEXP_REPLACE(NEW.description, '\bundefined\b', '', 'gi');
    NEW.description := REGEXP_REPLACE(NEW.description, '\bNaN\b', '', 'gi');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_meal_plan_item_integrity ON meal_plan_items;
CREATE TRIGGER trg_validate_meal_plan_item_integrity
  BEFORE INSERT OR UPDATE ON meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_meal_plan_item_integrity();

-- 2. patient_anamnesis: block "completed" without computed values
CREATE OR REPLACE FUNCTION public.fn_validate_anamnesis_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.computed_tmb IS NULL OR NEW.computed_tmb <= 0 THEN
      RAISE WARNING 'anamnesis marked completed but computed_tmb is NULL/0 — blocking status change';
      NEW.status := 'pending_review';
    END IF;
    IF NEW.calories_target IS NULL OR NEW.calories_target <= 0 THEN
      RAISE WARNING 'anamnesis marked completed but calories_target is NULL/0 — blocking status change';
      NEW.status := 'pending_review';
    END IF;
    IF NEW.protein_target IS NULL OR NEW.protein_target <= 0 THEN
      RAISE WARNING 'anamnesis marked completed but protein_target is NULL/0 — blocking status change';
      NEW.status := 'pending_review';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_anamnesis_completion ON patient_anamnesis;
CREATE TRIGGER trg_validate_anamnesis_completion
  BEFORE INSERT OR UPDATE ON patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_anamnesis_completion();
