
-- Trigger: prevent deletion of approved/published meal plans
CREATE OR REPLACE FUNCTION public.protect_approved_meal_plans()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block DELETE on approved or published plans
  IF TG_OP = 'DELETE' THEN
    IF OLD.plan_status IN ('approved', 'published_to_patient') THEN
      RAISE EXCEPTION 'Cannot delete an approved or published meal plan. Archive it instead.';
    END IF;
    RETURN OLD;
  END IF;

  -- Block UPDATE that deactivates approved/published plans
  IF TG_OP = 'UPDATE' THEN
    -- Prevent setting is_active = false on published plans
    IF OLD.plan_status = 'published_to_patient' AND OLD.is_active = true AND NEW.is_active = false THEN
      -- Only allow if plan_status is also changing to 'archived'
      IF NEW.plan_status != 'archived' THEN
        RAISE EXCEPTION 'Cannot deactivate a published meal plan without archiving it. Use plan_status = archived.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_protect_approved_meal_plans ON public.meal_plans;
CREATE TRIGGER trg_protect_approved_meal_plans
  BEFORE DELETE OR UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_approved_meal_plans();
