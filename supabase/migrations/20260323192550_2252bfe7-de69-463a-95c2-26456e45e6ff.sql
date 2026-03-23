
-- RPC: Transition a meal plan to "under_professional_review" status (safe, non-destructive)
CREATE OR REPLACE FUNCTION public.transition_plan_to_review(
  _plan_id uuid,
  _nutritionist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
BEGIN
  SELECT id, plan_status, patient_id INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Only transition from draft-like states
  IF _plan.plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan already in state: ' || _plan.plan_status);
  END IF;

  UPDATE meal_plans
  SET plan_status = 'under_professional_review', updated_at = now()
  WHERE id = _plan_id;

  -- Log to timeline
  INSERT INTO patient_timeline (patient_id, event_type, title, description, created_by)
  SELECT _plan.patient_id, 'plan_review', 'Plano em revisão profissional',
         'O plano alimentar foi movido para revisão pelo nutricionista.',
         _nutritionist_id
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_timeline' AND table_schema = 'public');

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'new_status', 'under_professional_review');
END;
$$;

-- RPC: Save/approve a plan (mark as "approved" by nutritionist)
CREATE OR REPLACE FUNCTION public.save_plan_as_approved(
  _plan_id uuid,
  _nutritionist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
BEGIN
  SELECT id, plan_status, patient_id INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Allow transition from review/draft states to approved
  IF _plan.plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve from state: ' || _plan.plan_status);
  END IF;

  UPDATE meal_plans
  SET plan_status = 'approved', updated_at = now()
  WHERE id = _plan_id;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'new_status', 'approved');
END;
$$;
