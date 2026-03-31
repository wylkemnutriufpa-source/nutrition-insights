
-- FIX: approve_and_publish_plan must archive old published plans, not just deactivate them
CREATE OR REPLACE FUNCTION public.approve_and_publish_plan(
  _plan_id uuid,
  _nutritionist_id uuid,
  _start_date date DEFAULT CURRENT_DATE,
  _duration_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _end_date date;
  _tenant_id uuid;
  _item_count integer;
BEGIN
  SELECT id, patient_id, nutritionist_id, plan_status, is_active, overall_validation_status, overall_score, last_validated_at
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Plan not found'); END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;

  SELECT count(*) INTO _item_count FROM public.meal_plan_items WHERE meal_plan_id = _plan_id;
  IF _item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PLAN', 'message', 'Não é possível aprovar e publicar um plano sem refeições.');
  END IF;

  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION_REQUIRED', 'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado.');
  END IF;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _plan.patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  _end_date := _start_date + (_duration_days * interval '1 day');

  -- CRITICAL FIX: Archive published plans (set BOTH is_active=false AND plan_status='archived')
  UPDATE public.meal_plans 
  SET is_active = false, plan_status = 'archived', updated_at = now() 
  WHERE patient_id = _plan.patient_id 
    AND id != _plan_id 
    AND is_active = true 
    AND plan_status = 'published_to_patient';

  -- Deactivate non-published active plans
  UPDATE public.meal_plans 
  SET is_active = false, updated_at = now() 
  WHERE patient_id = _plan.patient_id 
    AND id != _plan_id 
    AND is_active = true 
    AND plan_status NOT IN ('published_to_patient');

  -- Activate and publish the target plan
  UPDATE public.meal_plans 
  SET plan_status = 'published_to_patient', is_active = true, start_date = _start_date, end_date = _end_date, updated_at = now() 
  WHERE id = _plan_id;

  -- Update journey status
  UPDATE public.nutritionist_patients SET journey_status = 'active_followup'
  WHERE patient_id = _plan.patient_id AND nutritionist_id = _nutritionist_id AND status = 'active'
    AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  -- Timeline entry
  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (
    _plan.patient_id,
    _nutritionist_id,
    'plan_published',
    'Plano aprovado e publicado',
    'Plano alimentar foi aprovado e publicado para o paciente.'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'plan_id', _plan_id, 
    'status', 'published_to_patient',
    'start_date', _start_date,
    'end_date', _end_date
  );
END;
$$;
