
-- ============================================================
-- BLOCK 1: RPC + Trigger for meal plan totals auto-recalculation
-- ============================================================

-- RPC: Recalculate totals for a single meal plan
CREATE OR REPLACE FUNCTION public.recalculate_meal_plan_totals(plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _calories numeric;
  _protein numeric;
  _carbs numeric;
  _fat numeric;
BEGIN
  SELECT
    COALESCE(SUM(calories_target), 0),
    COALESCE(SUM(protein_target), 0),
    COALESCE(SUM(carbs_target), 0),
    COALESCE(SUM(fat_target), 0)
  INTO _calories, _protein, _carbs, _fat
  FROM meal_plan_items
  WHERE meal_plan_id = plan_id;

  UPDATE meal_plans
  SET
    total_target_calories = _calories,
    total_target_protein = _protein,
    total_target_carbs = _carbs,
    total_target_fat = _fat
  WHERE id = plan_id;
END;
$$;

-- Trigger function: auto-recalculate on item changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_meal_plan_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _plan_id := OLD.meal_plan_id;
  ELSE
    _plan_id := NEW.meal_plan_id;
  END IF;

  PERFORM recalculate_meal_plan_totals(_plan_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_recalculate_meal_plan_totals ON meal_plan_items;
CREATE TRIGGER trg_recalculate_meal_plan_totals
AFTER INSERT OR UPDATE OR DELETE ON meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_meal_plan_totals();

-- ============================================================
-- BLOCK 4.2: Auto-activate onboarding function
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_activate_onboarding_for_paid_patients()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int := 0;
  _rec record;
BEGIN
  FOR _rec IN
    SELECT np.id, np.patient_id, np.nutritionist_id
    FROM nutritionist_patients np
    WHERE np.status = 'active'
      AND np.journey_status IN ('awaiting_payment', 'awaiting_onboarding_release', 'lead_created')
      AND (
        -- Has active subscription
        EXISTS (
          SELECT 1 FROM patient_subscriptions ps
          WHERE ps.patient_id = np.patient_id
            AND ps.status = 'active'
        )
        OR
        -- Has paid booking
        EXISTS (
          SELECT 1 FROM booking_payments bp
          WHERE bp.nutritionist_id = np.nutritionist_id
            AND bp.customer_email = (SELECT email FROM profiles WHERE id = np.patient_id)
            AND bp.status = 'paid'
        )
        OR
        -- Has published meal plan (professional already working)
        EXISTS (
          SELECT 1 FROM meal_plans mp
          WHERE mp.patient_id = np.patient_id
            AND mp.status = 'published'
        )
      )
  LOOP
    UPDATE nutritionist_patients
    SET journey_status = 'onboarding_active'
    WHERE id = _rec.id;

    -- Create onboarding pipeline if not exists
    INSERT INTO onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
    VALUES (_rec.patient_id, _rec.nutritionist_id, 'in_progress', 'released')
    ON CONFLICT DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('activated_count', _count);
END;
$$;

-- ============================================================
-- BLOCK 4.3: Add onboarding_step_completed to onboarding_pipelines
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_pipelines'
      AND column_name = 'onboarding_step_completed'
  ) THEN
    ALTER TABLE public.onboarding_pipelines
    ADD COLUMN onboarding_step_completed jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
