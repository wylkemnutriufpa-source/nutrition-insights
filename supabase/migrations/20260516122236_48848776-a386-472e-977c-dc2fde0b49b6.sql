CREATE OR REPLACE FUNCTION public.publish_meal_plan(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
     INSERT INTO public.system_error_logs (error_code, error_message, metadata)
     VALUES ('EMPTY_PLAN_PUBLISH', 'Attempted to publish empty relational plan; snapshot may still be present', jsonb_build_object('plan_id', _plan_id));
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

  UPDATE public.meal_plans
  SET is_active = false,
      plan_status = CASE WHEN plan_status IN ('published', 'published_to_patient') THEN 'archived' ELSE plan_status END,
      updated_at = now()
  WHERE patient_id = _patient_id
    AND is_active = true
    AND id != _plan_id;

  UPDATE public.meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      is_sharing_enabled = true,
      sharing_expires_at = COALESCE(sharing_expires_at, now() + interval '90 days'),
      overall_validation_status = 'aprovado',
      updated_at = now()
  WHERE id = _plan_id;

  UPDATE public.profiles
  SET onboarding_completed = true,
      patient_state = 'active_plan',
      updated_at = now()
  WHERE user_id = _patient_id;

  UPDATE public.patient_lifecycle_states
  SET computed_at = '2000-01-01'::timestamptz
  WHERE patient_id = _patient_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (
      _patient_id,
      'Novo plano alimentar',
      'Seu plano alimentar foi atualizado pelo seu profissional.',
      'plan_published',
      'meal_plan',
      _plan_id::text,
      '/patient-meal-plan',
      _tenant_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id, 'status', 'published_to_patient');
END;
$function$;