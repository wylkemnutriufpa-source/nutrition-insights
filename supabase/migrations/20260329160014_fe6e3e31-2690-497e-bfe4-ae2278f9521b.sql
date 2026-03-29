
-- Add validation score columns to meal_plans for persistent audit results
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS clinical_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS simplicity_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS adherence_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS overall_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS overall_validation_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_validated_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_engine_version text DEFAULT NULL;

-- Update publish_meal_plan to enforce validation check
CREATE OR REPLACE FUNCTION public.publish_meal_plan(
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
  _patient_id uuid;
BEGIN
  SELECT id, patient_id, plan_status, is_active, nutritionist_id,
         overall_validation_status, overall_score, last_validated_at
  INTO _plan
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist';
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan';
  END IF;

  -- HARD LOCK: plan must be validated and approved before publishing
  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'VALIDATION_REQUIRED',
      'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado. Execute a auditoria primeiro.'
    );
  END IF;

  _patient_id := _plan.patient_id;

  UPDATE public.meal_plans
  SET is_active = false
  WHERE patient_id = _patient_id
    AND id != _plan_id
    AND is_active = true;

  UPDATE public.meal_plans
  SET plan_status = 'published',
      is_active = true
  WHERE id = _plan_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
  VALUES (_patient_id, 'Novo plano alimentar', 'Seu plano alimentar foi atualizado pelo seu profissional.', 'plan_published', 'meal_plan', _plan_id::text, '/my-diet');

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id);
END;
$$;

-- Update approve_and_publish_plan to enforce validation check
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
  SELECT id, patient_id, nutritionist_id, plan_status, is_active,
         overall_validation_status, overall_score, last_validated_at
  INTO _plan
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- HARD LOCK: plan must be validated and approved before publishing
  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VALIDATION_REQUIRED',
      'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado.'
    );
  END IF;

  _end_date := _start_date + (_duration_days * interval '1 day');

  UPDATE public.meal_plans
  SET is_active = false, updated_at = now()
  WHERE patient_id = _plan.patient_id
    AND id != _plan_id
    AND is_active = true;

  UPDATE public.meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      start_date = _start_date,
      end_date = _end_date,
      updated_at = now()
  WHERE id = _plan_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'plan_published'
  WHERE patient_id = _plan.patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  UPDATE public.nutritionist_patients
  SET journey_status = 'active_followup'
  WHERE patient_id = _plan.patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status = 'plan_published';

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_plan.patient_id, _nutritionist_id, 'plan_approved_published', 'Plano aprovado e publicado', 'Plano alimentar aprovado e publicado para o paciente.');

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
  VALUES (
    _plan.patient_id,
    'Plano publicado',
    'Seu profissional publicou seu plano alimentar. Agora seu acompanhamento está ativo.',
    'plan_published',
    'meal_plan',
    _plan_id::text,
    '/my-diet'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'approve_and_publish_plan',
    'meal_plan',
    _plan_id::text,
    jsonb_build_object('patient_id', _plan.patient_id, 'new_status', 'active_followup')
  );

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _plan.patient_id, 'journey_status', 'active_followup');
END;
$$;
