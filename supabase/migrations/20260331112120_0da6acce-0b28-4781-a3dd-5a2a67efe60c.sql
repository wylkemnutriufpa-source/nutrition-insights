CREATE OR REPLACE FUNCTION public.confirm_patient_payment(_patient_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _np record;
  _current_status text;
  _tenant_id uuid;
BEGIN
  SELECT np.id, np.journey_status, COALESCE(np.tenant_id, ut.tenant_id) AS tenant_id
  INTO _np
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut
    ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active relationship not found');
  END IF;

  _current_status := _np.journey_status;
  _tenant_id := _np.tenant_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'awaiting_consent'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (
      _nutritionist_id,
      _tenant_id,
      'confirm_payment',
      'patient',
      _patient_id::text,
      jsonb_build_object('previous_status', _current_status, 'new_status', 'awaiting_consent')
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', 'awaiting_consent');
END;
$$;

CREATE OR REPLACE FUNCTION public.release_patient_onboarding(_patient_id uuid, _nutritionist_id uuid, _release_config jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _current_status text;
  _pipeline_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT np.id, np.journey_status, COALESCE(np.tenant_id, ut.tenant_id)
  INTO _link_id, _current_status, _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut
    ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo não encontrado entre paciente e profissional');
  END IF;

  IF _current_status IN ('active_followup', 'plan_published', 'clinical_followup_active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente já está em acompanhamento ativo');
  END IF;

  INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, device_info)
  VALUES (_patient_id, 'v1.0-professional-release', 'Released by professional')
  ON CONFLICT DO NOTHING;

  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE id = _link_id AND journey_status != 'onboarding_active';

  SELECT id INTO _pipeline_id
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
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
      patient_id, nutritionist_id, status, release_status,
      released_by, released_at, release_config
    ) VALUES (
      _patient_id, _nutritionist_id, 'pending_anamnesis', 'released',
      _nutritionist_id, now(), _release_config
    )
    RETURNING id INTO _pipeline_id;
  END IF;

  IF _current_status != 'onboarding_active' AND _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route, tenant_id)
    VALUES (
      _patient_id,
      'Onboarding liberado!',
      'Seu profissional liberou o onboarding. Você já pode começar a preencher seus dados clínicos.',
      'onboarding_released',
      'onboarding',
      '/onboarding',
      _tenant_id
    );
  END IF;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (
      _nutritionist_id,
      _tenant_id,
      'release_onboarding',
      'patient',
      _patient_id::text,
      jsonb_build_object('previous_status', _current_status, 'new_status', 'onboarding_active', 'pipeline_id', _pipeline_id)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'pipeline_id', _pipeline_id, 'journey_status', 'onboarding_active');
END;
$$;