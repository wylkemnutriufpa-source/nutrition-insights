
CREATE OR REPLACE FUNCTION public.activate_meal_plan(_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_nutritionist_id uuid;
BEGIN
  -- Get plan's patient and nutritionist
  SELECT patient_id, nutritionist_id INTO v_patient_id, v_nutritionist_id
  FROM meal_plans WHERE id = _plan_id;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  -- Archive currently published plans (instead of just deactivating)
  UPDATE meal_plans
  SET is_active = false, plan_status = 'archived', updated_at = now()
  WHERE patient_id = v_patient_id
    AND nutritionist_id = v_nutritionist_id
    AND is_active = true
    AND plan_status = 'published_to_patient'
    AND id != _plan_id;

  -- Deactivate other non-published active plans
  UPDATE meal_plans
  SET is_active = false, updated_at = now()
  WHERE patient_id = v_patient_id
    AND nutritionist_id = v_nutritionist_id
    AND is_active = true
    AND plan_status NOT IN ('published_to_patient')
    AND id != _plan_id;

  -- Activate the target plan
  UPDATE meal_plans
  SET is_active = true, updated_at = now()
  WHERE id = _plan_id;

  -- Invalidate lifecycle cache
  UPDATE patient_lifecycle_states
  SET computed_at = '2000-01-01'::timestamptz
  WHERE patient_id = v_patient_id;
END;
$$;
