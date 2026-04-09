
-- Fix publish_meal_plan: include onboarding_active and awaiting_onboarding_release in journey_status transition
CREATE OR REPLACE FUNCTION public.publish_meal_plan(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _patient_id uuid;
  _tenant_id uuid;
  _item_count integer;
BEGIN
  SELECT id, patient_id, plan_status, is_active, nutritionist_id, overall_validation_status
  INTO _plan
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist';
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan';
  END IF;

  SELECT count(*) INTO _item_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = _plan_id;

  IF _item_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPTY_PLAN',
      'message', 'Não é possível publicar um plano sem refeições.'
    );
  END IF;

  IF _plan.overall_validation_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VALIDATION_REQUIRED',
      'message', 'O plano precisa ser validado pelo Motor Clínico antes de ser publicado. Clique em "Validar" primeiro.'
    );
  END IF;

  _patient_id := _plan.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id)
  INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active'
  LIMIT 1;

  -- Archive previous active published plans
  UPDATE public.meal_plans
  SET is_active = false,
      plan_status = 'archived',
      updated_at = now()
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND is_active = true
    AND plan_status = 'published_to_patient'
    AND id != _plan_id;

  -- Deactivate any other active plans
  UPDATE public.meal_plans
  SET is_active = false,
      updated_at = now()
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND is_active = true
    AND plan_status <> 'published_to_patient'
    AND id != _plan_id;

  -- Publish the plan
  UPDATE public.meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      overall_validation_status = 'aprovado',
      updated_at = now()
  WHERE id = _plan_id;

  -- Force lifecycle recalc
  UPDATE public.patient_lifecycle_states
  SET computed_at = '2000-01-01'::timestamptz
  WHERE patient_id = _patient_id;

  -- Update journey status — now includes onboarding_active and awaiting_onboarding_release
  UPDATE public.nutritionist_patients
  SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status IN (
      'draft_ready_for_review',
      'onboarding_completed',
      'onboarding_active',
      'awaiting_onboarding_release',
      'awaiting_consent',
      'plan_published'
    );

  -- Timeline entry
  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  -- Notify patient
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (
      _patient_id,
      'Novo plano alimentar',
      'Seu plano alimentar foi atualizado pelo seu profissional.',
      'plan_published',
      'meal_plan',
      _plan_id::text,
      '/my-diet',
      _tenant_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id);
END;
$$;

-- Fix Vitor's journey_status directly since his plan is already published
UPDATE public.nutritionist_patients
SET journey_status = 'plan_published'
WHERE patient_id = '2824fe8a-b1c9-4a64-8326-26464abb9acb'
  AND status = 'active'
  AND journey_status = 'onboarding_active';
