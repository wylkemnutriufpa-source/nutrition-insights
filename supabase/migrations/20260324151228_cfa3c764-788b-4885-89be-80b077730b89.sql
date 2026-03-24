-- FitJourney: enforce official patient lifecycle and cleanup Mission Control compatibility

-- 1) Clarify official CRM journey lifecycle
COMMENT ON COLUMN public.nutritionist_patients.journey_status IS
'Official patient access lifecycle: invited -> awaiting_payment -> awaiting_consent -> onboarding_active -> onboarding_completed -> draft_ready_for_review -> plan_published -> active_followup -> archived. This field is the authoritative commercial/access workflow state.';

-- 2) Confirm payment must move only to awaiting_consent
CREATE OR REPLACE FUNCTION public.confirm_patient_payment(
  _patient_id uuid,
  _nutritionist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _current_status text;
BEGIN
  SELECT id, journey_status
  INTO _link_id, _current_status
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo não encontrado');
  END IF;

  IF COALESCE(_current_status, 'invited') NOT IN ('invited', 'lead_created', 'awaiting_payment', 'awaiting_onboarding_release') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente não está aguardando pagamento. Status atual: ' || COALESCE(_current_status, 'null'));
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'awaiting_consent'
  WHERE id = _link_id;

  INSERT INTO public.payments (user_id, amount, status, payment_method, description)
  VALUES (_patient_id, 0, 'paid', 'manual_confirmation', 'Pagamento confirmado manualmente pelo profissional')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type, target_route)
  VALUES (
    _patient_id,
    'Pagamento confirmado',
    'Seu pagamento foi confirmado. Antes de iniciar, aceite o consentimento clínico para liberar seu acesso.',
    'system',
    '/consent-required'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'confirm_payment',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', 'awaiting_consent')
  );

  RETURN jsonb_build_object('success', true, 'new_status', 'awaiting_consent');
END;
$$;

-- 3) Releasing onboarding now requires consent and creates/updates a single active pipeline
CREATE OR REPLACE FUNCTION public.release_patient_onboarding(
  _patient_id uuid,
  _nutritionist_id uuid,
  _release_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _current_status text;
  _has_consent boolean;
  _pipeline_id uuid;
BEGIN
  SELECT id, journey_status
  INTO _link_id, _current_status
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_LINK: No active link between patient and nutritionist';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clinical_consents cc
    WHERE cc.patient_id = _patient_id
      AND cc.revoked_at IS NULL
    LIMIT 1
  ) INTO _has_consent;

  IF NOT _has_consent THEN
    RAISE EXCEPTION 'CONSENT_REQUIRED: Patient must accept consent before onboarding release';
  END IF;

  IF _current_status = 'active_followup' OR _current_status = 'plan_published' THEN
    RAISE EXCEPTION 'INVALID_STATE: Active patients cannot restart onboarding unless a dedicated restart flow is used';
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE id = _link_id;

  SELECT id
  INTO _pipeline_id
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status NOT IN ('completed', 'archived', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _pipeline_id IS NOT NULL THEN
    UPDATE public.onboarding_pipelines
    SET release_status = 'released',
        released_by = _nutritionist_id,
        released_at = now(),
        release_config = COALESCE(release_config, '{}'::jsonb) || COALESCE(_release_config, '{}'::jsonb),
        updated_at = now()
    WHERE id = _pipeline_id;
  ELSE
    INSERT INTO public.onboarding_pipelines (
      patient_id,
      nutritionist_id,
      status,
      release_status,
      released_by,
      released_at,
      release_config
    ) VALUES (
      _patient_id,
      _nutritionist_id,
      'pending_anamnesis',
      'released',
      _nutritionist_id,
      now(),
      _release_config
    )
    RETURNING id INTO _pipeline_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    _patient_id,
    'Consentimento confirmado',
    'Seu consentimento foi validado. Agora você já pode iniciar o onboarding clínico.',
    'onboarding_released',
    'onboarding',
    '/onboarding'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'release_onboarding',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', 'onboarding_active', 'pipeline_id', _pipeline_id)
  );

  RETURN jsonb_build_object('success', true, 'pipeline_id', _pipeline_id, 'journey_status', 'onboarding_active');
END;
$$;

-- 4) Strict valid transitions for the official lifecycle
CREATE OR REPLACE FUNCTION public.transition_journey_status(
  _patient_id uuid,
  _nutritionist_id uuid,
  _new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
  _valid_transitions jsonb;
BEGIN
  SELECT journey_status
  INTO _current_status
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
  LIMIT 1;

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_LINK: Patient not linked to nutritionist';
  END IF;

  _valid_transitions := jsonb_build_object(
    'invited', jsonb_build_array('awaiting_payment', 'awaiting_consent', 'archived'),
    'lead_created', jsonb_build_array('awaiting_payment', 'archived'),
    'awaiting_payment', jsonb_build_array('awaiting_consent', 'archived'),
    'awaiting_onboarding_release', jsonb_build_array('awaiting_consent', 'archived'),
    'awaiting_consent', jsonb_build_array('onboarding_active', 'archived'),
    'onboarding_active', jsonb_build_array('onboarding_completed', 'archived'),
    'onboarding_completed', jsonb_build_array('draft_ready_for_review', 'archived'),
    'draft_ready_for_review', jsonb_build_array('plan_published', 'archived'),
    'plan_published', jsonb_build_array('active_followup', 'archived'),
    'active_followup', jsonb_build_array('archived'),
    'archived', jsonb_build_array('invited', 'awaiting_payment')
  );

  IF NOT COALESCE((_valid_transitions -> _current_status), '[]'::jsonb) ? _new_status THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot move from % to %', _current_status, _new_status;
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = _new_status
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'transition_journey_status',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', _new_status)
  );

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', _new_status);
END;
$$;

-- 5) Consent acceptance progression helper for patient-side transition
CREATE OR REPLACE FUNCTION public.accept_patient_consent(
  _patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _pipeline_id uuid;
BEGIN
  SELECT *
  INTO _link
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo profissional não encontrado');
  END IF;

  IF _link.journey_status NOT IN ('awaiting_consent', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', true, 'new_status', _link.journey_status);
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE id = _link.id;

  SELECT id
  INTO _pipeline_id
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND nutritionist_id = _link.nutritionist_id
    AND status NOT IN ('completed', 'archived', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _pipeline_id IS NULL THEN
    INSERT INTO public.onboarding_pipelines (
      patient_id,
      nutritionist_id,
      status,
      release_status,
      released_by,
      released_at,
      release_config
    ) VALUES (
      _patient_id,
      _link.nutritionist_id,
      'pending_anamnesis',
      'released',
      _link.nutritionist_id,
      now(),
      '{}'::jsonb
    )
    RETURNING id INTO _pipeline_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    _link.nutritionist_id,
    'Paciente iniciou onboarding',
    'O paciente aceitou o consentimento e já pode preencher o onboarding.',
    'patient_registered',
    'onboarding',
    '/patients/' || _patient_id::text
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _patient_id,
    'accept_consent',
    'clinical_consents',
    _patient_id::text,
    jsonb_build_object('new_status', 'onboarding_active', 'pipeline_id', _pipeline_id)
  );

  RETURN jsonb_build_object('success', true, 'new_status', 'onboarding_active', 'pipeline_id', _pipeline_id);
END;
$$;

-- 6) Onboarding completion must not publish/activate plan; it only moves to review state
CREATE OR REPLACE FUNCTION public.complete_patient_onboarding(
  _patient_id uuid,
  _nutritionist_id uuid,
  _pipeline_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
BEGIN
  SELECT id
  INTO _link_id
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status = 'onboarding_active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente não está em onboarding ativo');
  END IF;

  UPDATE public.onboarding_pipelines
  SET status = 'completed',
      updated_at = now()
  WHERE id = _pipeline_id
    AND patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND anamnesis_completed = true
    AND body_data_completed = true
    AND preferences_completed = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pipeline incompleto ou inválido');
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_completed'
  WHERE id = _link_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'draft_ready_for_review'
  WHERE id = _link_id;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    _nutritionist_id,
    'Onboarding concluído',
    'Paciente concluiu todas as etapas obrigatórias e está aguardando revisão do plano.',
    'warning',
    'onboarding',
    '/patients/' || _patient_id::text || '?tab=onboarding'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _patient_id,
    'complete_onboarding',
    'onboarding_pipeline',
    _pipeline_id::text,
    jsonb_build_object('new_status', 'draft_ready_for_review')
  );

  RETURN jsonb_build_object('success', true, 'new_status', 'draft_ready_for_review');
END;
$$;

-- 7) Publishing plan must move through plan_published then active_followup
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
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
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

-- 8) Publish meal plan helper must also respect official states
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
  SELECT id, patient_id, plan_status, is_active, nutritionist_id
  INTO _plan
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist';
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan';
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

  UPDATE public.nutritionist_patients
  SET journey_status = 'active_followup'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status = 'plan_published';

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
  VALUES (
    _patient_id,
    'Novo plano alimentar disponível!',
    'Seu profissional publicou um novo plano alimentar. Confira agora!',
    'plan_published',
    'meal_plan',
    _plan_id::text,
    '/my-diet'
  );

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id, 'journey_status', 'active_followup');
END;
$$;