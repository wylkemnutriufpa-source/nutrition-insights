-- WS2: Server-authoritative RPCs for remaining critical mutations

-- RPC: Deactivate a meal plan safely
CREATE OR REPLACE FUNCTION public.deactivate_meal_plan(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
BEGIN
  SELECT id, patient_id, is_active, plan_status, nutritionist_id
  INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF NOT _plan.is_active THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already inactive');
  END IF;

  UPDATE meal_plans
  SET is_active = false, updated_at = now()
  WHERE id = _plan_id;

  INSERT INTO patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_plan.patient_id, _nutritionist_id, 'plan_deactivated', 'Plano desativado', 'Plano alimentar foi desativado pelo profissional.');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Approve and publish a plan atomically (for onboarding approval queue)
CREATE OR REPLACE FUNCTION public.approve_and_publish_plan(
  _plan_id uuid,
  _nutritionist_id uuid,
  _start_date date DEFAULT CURRENT_DATE,
  _duration_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _end_date date;
BEGIN
  SELECT id, patient_id, nutritionist_id, plan_status, is_active
  INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  _end_date := _start_date + (_duration_days * interval '1 day');

  UPDATE meal_plans
  SET is_active = false, updated_at = now()
  WHERE patient_id = _plan.patient_id
    AND id != _plan_id
    AND is_active = true;

  UPDATE meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      start_date = _start_date,
      end_date = _end_date,
      updated_at = now()
  WHERE id = _plan_id;

  UPDATE nutritionist_patients
  SET journey_status = 'plan_delivered',
      updated_at = now()
  WHERE patient_id = _plan.patient_id
    AND nutritionist_id = _nutritionist_id
    AND journey_status IN ('onboarding_completed', 'awaiting_onboarding_release', 'onboarding_active');

  INSERT INTO patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_plan.patient_id, _nutritionist_id, 'plan_approved_published', 'Plano aprovado e publicado', 'Plano alimentar aprovado e publicado para o paciente.');

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _plan.patient_id);
END;
$$;

-- RPC: Reject a plan safely
CREATE OR REPLACE FUNCTION public.reject_meal_plan(
  _plan_id uuid,
  _nutritionist_id uuid,
  _reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
BEGIN
  SELECT id, patient_id, nutritionist_id, plan_status
  INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF _plan.plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reject plan in status: ' || COALESCE(_plan.plan_status, 'unknown'));
  END IF;

  UPDATE meal_plans
  SET plan_status = 'rejected', is_active = false, updated_at = now()
  WHERE id = _plan_id;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id);
END;
$$;
