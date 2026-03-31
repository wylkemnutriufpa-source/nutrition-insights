-- =====================================================
-- FIX: All RPCs and triggers that INSERT into tenant_id NOT NULL tables
-- without providing tenant_id. Pattern: resolve from nutritionist_patients or user_tenants.
-- =====================================================

-- 1. accept_patient_consent
CREATE OR REPLACE FUNCTION public.accept_patient_consent(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _pipeline_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT np.*, COALESCE(np.tenant_id, ut.tenant_id) AS resolved_tenant
  INTO _link
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.status = 'active'
  ORDER BY np.created_at DESC LIMIT 1;

  IF _link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo profissional não encontrado');
  END IF;
  _tenant_id := _link.resolved_tenant;

  IF _link.journey_status NOT IN ('awaiting_consent', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', true, 'new_status', _link.journey_status);
  END IF;

  UPDATE public.nutritionist_patients SET journey_status = 'onboarding_active' WHERE id = _link.id;

  SELECT id INTO _pipeline_id
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id AND nutritionist_id = _link.nutritionist_id
    AND status NOT IN ('completed', 'archived', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC LIMIT 1;

  IF _pipeline_id IS NULL THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status, released_by, released_at, release_config)
    VALUES (_patient_id, _link.nutritionist_id, 'pending_anamnesis', 'released', _link.nutritionist_id, now(), '{}'::jsonb)
    RETURNING id INTO _pipeline_id;
  END IF;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route, tenant_id)
    VALUES (_link.nutritionist_id, 'Paciente iniciou onboarding', 'O paciente aceitou o consentimento e já pode preencher o onboarding.', 'patient_registered', 'onboarding', '/patients/' || _patient_id::text, _tenant_id);

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_patient_id, _tenant_id, 'accept_consent', 'clinical_consents', _patient_id::text, jsonb_build_object('new_status', 'onboarding_active', 'pipeline_id', _pipeline_id));
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', 'onboarding_active', 'pipeline_id', _pipeline_id);
END;
$$;

-- 2. approve_and_publish_plan
CREATE OR REPLACE FUNCTION public.approve_and_publish_plan(_plan_id uuid, _nutritionist_id uuid, _start_date date DEFAULT CURRENT_DATE, _duration_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _end_date date;
  _tenant_id uuid;
BEGIN
  SELECT id, patient_id, nutritionist_id, plan_status, is_active, overall_validation_status, overall_score, last_validated_at
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Plan not found'); END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION_REQUIRED', 'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado.');
  END IF;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _plan.patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  _end_date := _start_date + (_duration_days * interval '1 day');

  UPDATE public.meal_plans SET is_active = false, updated_at = now() WHERE patient_id = _plan.patient_id AND id != _plan_id AND is_active = true;
  UPDATE public.meal_plans SET plan_status = 'published_to_patient', is_active = true, start_date = _start_date, end_date = _end_date, updated_at = now() WHERE id = _plan_id;

  UPDATE public.nutritionist_patients SET journey_status = 'plan_published'
  WHERE patient_id = _plan.patient_id AND nutritionist_id = _nutritionist_id AND status = 'active' AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  UPDATE public.nutritionist_patients SET journey_status = 'active_followup'
  WHERE patient_id = _plan.patient_id AND nutritionist_id = _nutritionist_id AND status = 'active' AND journey_status = 'plan_published';

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_plan.patient_id, _nutritionist_id, 'plan_approved_published', 'Plano aprovado e publicado', 'Plano alimentar aprovado e publicado para o paciente.');

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (_plan.patient_id, 'Plano publicado', 'Seu profissional publicou seu plano alimentar. Agora seu acompanhamento está ativo.', 'plan_published', 'meal_plan', _plan_id::text, '/my-diet', _tenant_id);

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_nutritionist_id, _tenant_id, 'approve_and_publish_plan', 'meal_plan', _plan_id::text, jsonb_build_object('patient_id', _plan.patient_id, 'new_status', 'active_followup'));
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _plan.patient_id, 'journey_status', 'active_followup');
END;
$$;

-- 3. complete_patient_onboarding
CREATE OR REPLACE FUNCTION public.complete_patient_onboarding(_patient_id uuid, _nutritionist_id uuid, _pipeline_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT np.id, COALESCE(np.tenant_id, ut.tenant_id)
  INTO _link_id, _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active' AND np.journey_status = 'onboarding_active'
  LIMIT 1;

  IF _link_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Paciente não está em onboarding ativo'); END IF;

  UPDATE public.onboarding_pipelines SET status = 'completed', updated_at = now()
  WHERE id = _pipeline_id AND patient_id = _patient_id AND nutritionist_id = _nutritionist_id AND anamnesis_completed = true AND body_data_completed = true AND preferences_completed = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pipeline incompleto ou inválido'); END IF;

  UPDATE public.nutritionist_patients SET journey_status = 'draft_ready_for_review' WHERE id = _link_id;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route, tenant_id)
    VALUES (_nutritionist_id, 'Onboarding concluído', 'Paciente concluiu todas as etapas obrigatórias e está aguardando revisão do plano.', 'warning', 'onboarding', '/patients/' || _patient_id::text || '?tab=onboarding', _tenant_id);

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_patient_id, _tenant_id, 'complete_onboarding', 'onboarding_pipeline', _pipeline_id::text, jsonb_build_object('new_status', 'draft_ready_for_review'));
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', 'draft_ready_for_review');
END;
$$;

-- 4. complete_patient_onboarding_by_patient
CREATE OR REPLACE FUNCTION public.complete_patient_onboarding_by_patient(_patient_id uuid, _pipeline_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _tenant_id uuid;
BEGIN
  SELECT np.id, np.nutritionist_id, COALESCE(np.tenant_id, ut.tenant_id) AS resolved_tenant
  INTO _link
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.status = 'active' AND np.journey_status = 'onboarding_active'
  ORDER BY np.created_at DESC LIMIT 1;

  IF _link IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Paciente não está em onboarding ativo'); END IF;
  _tenant_id := _link.resolved_tenant;

  UPDATE public.onboarding_pipelines SET status = 'completed', updated_at = now()
  WHERE id = _pipeline_id AND patient_id = _patient_id AND anamnesis_completed = true AND body_data_completed = true AND preferences_completed = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pipeline incompleto - preencha anamnese, dados corporais e preferências'); END IF;

  UPDATE public.nutritionist_patients SET journey_status = 'draft_ready_for_review' WHERE id = _link.id;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, target_route, tenant_id)
    VALUES (_link.nutritionist_id, 'Onboarding concluído ✅', 'Paciente concluiu todas as etapas. Plano aguardando sua revisão.', 'warning', '/patients/' || _patient_id::text || '?tab=onboarding', _tenant_id);

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_patient_id, _tenant_id, 'complete_onboarding', 'onboarding_pipeline', _pipeline_id::text, '{"new_status":"draft_ready_for_review"}'::jsonb);
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', 'draft_ready_for_review');
END;
$$;

-- 5. publish_meal_plan
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
BEGIN
  SELECT id, patient_id, plan_status, is_active, nutritionist_id, overall_validation_status, overall_score, last_validated_at
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF _plan IS NULL THEN RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist'; END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan'; END IF;
  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION_REQUIRED', 'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado. Execute a auditoria primeiro.');
  END IF;

  _patient_id := _plan.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  UPDATE public.meal_plans SET is_active = false WHERE patient_id = _patient_id AND id != _plan_id AND is_active = true;
  UPDATE public.meal_plans SET plan_status = 'published', is_active = true WHERE id = _plan_id;

  UPDATE public.nutritionist_patients SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id AND nutritionist_id = _nutritionist_id AND status = 'active' AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (_patient_id, 'Novo plano alimentar', 'Seu plano alimentar foi atualizado pelo seu profissional.', 'plan_published', 'meal_plan', _plan_id::text, '/my-diet', _tenant_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id);
END;
$$;

-- 6. transition_journey_status
CREATE OR REPLACE FUNCTION public.transition_journey_status(_patient_id uuid, _nutritionist_id uuid, _new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
  _valid_transitions jsonb;
  _tenant_id uuid;
BEGIN
  SELECT np.journey_status, COALESCE(np.tenant_id, ut.tenant_id)
  INTO _current_status, _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  IF _current_status IS NULL THEN RAISE EXCEPTION 'NO_ACTIVE_LINK: Patient not linked to nutritionist'; END IF;

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

  UPDATE public.nutritionist_patients SET journey_status = _new_status
  WHERE patient_id = _patient_id AND nutritionist_id = _nutritionist_id AND status = 'active';

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_nutritionist_id, _tenant_id, 'transition_journey_status', 'patient', _patient_id::text, jsonb_build_object('previous_status', _current_status, 'new_status', _new_status));
  END IF;

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', _new_status);
END;
$$;

-- 7. sync_protocol_checklist
CREATE OR REPLACE FUNCTION public.sync_protocol_checklist(_patient_protocol_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pp record;
  _task record;
  _count integer := 0;
  _tenant_id uuid;
BEGIN
  SELECT * INTO _pp FROM public.patient_protocols WHERE id = _patient_protocol_id AND status = 'active';
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _pp.patient_id AND np.status = 'active'
  LIMIT 1;

  IF _tenant_id IS NULL THEN
    SELECT ut.tenant_id INTO _tenant_id FROM public.user_tenants ut WHERE ut.user_id = _pp.patient_id LIMIT 1;
  END IF;

  FOR _task IN SELECT * FROM public.protocol_tasks WHERE protocol_id = _pp.protocol_id
  LOOP
    INSERT INTO public.checklist_tasks (patient_id, protocol_task_id, patient_protocol_id, title, description, icon, category, date, tenant_id)
    VALUES (_pp.patient_id, _task.id, _patient_protocol_id, _task.title, _task.description, _task.icon, _task.category, _date, _tenant_id)
    ON CONFLICT (patient_id, protocol_task_id, date) DO NOTHING;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 8-15. TRIGGER FUNCTIONS — resolve tenant_id from context tables

CREATE OR REPLACE FUNCTION public.fn_notify_plan_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name text;
  v_nutri_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT full_name INTO v_patient_name FROM public.profiles WHERE user_id = NEW.patient_id;
  v_nutri_id := NEW.nutritionist_id;
  IF v_nutri_id IS NULL THEN SELECT nutritionist_id INTO v_nutri_id FROM public.onboarding_pipelines WHERE patient_id = NEW.patient_id ORDER BY created_at DESC LIMIT 1; END IF;
  IF v_nutri_id IS NULL THEN SELECT nutritionist_id INTO v_nutri_id FROM public.nutritionist_patients WHERE patient_id = NEW.patient_id LIMIT 1; END IF;

  IF v_nutri_id IS NOT NULL THEN
    SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO v_tenant_id
    FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
    WHERE np.patient_id = NEW.patient_id AND np.nutritionist_id = v_nutri_id AND np.status = 'active' LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
      VALUES (v_nutri_id, '📋 Solicitação de plano', COALESCE(v_patient_name, 'Paciente') || ' solicitou ativação ou ajuste de plano alimentar.', 'message', '/patients/' || NEW.patient_id::text, v_tenant_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_checkin_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_name text;
  _tenant_id uuid;
BEGIN
  IF NEW.nutritionist_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;
  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = NEW.patient_id AND np.nutritionist_id = NEW.nutritionist_id AND np.status = 'active' LIMIT 1;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
    VALUES (NEW.nutritionist_id, 'Novo check-in recebido', _patient_name || ' enviou um check-in. Revise os dados.', 'message', '/patients', _tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_clinical_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_name text;
  _tenant_id uuid;
BEGIN
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;
  _tenant_id := NEW.tenant_id;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
    VALUES (NEW.nutritionist_id, '⚠️ Alerta clínico: ' || NEW.title, _patient_name || ' — ' || NEW.description, 'alert', '/patients', _tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_meal_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user uuid;
  _patient_name text;
  _title text;
  _message text;
  _type text := 'info';
  _tenant_id uuid;
BEGIN
  IF OLD IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = NEW.patient_id AND np.nutritionist_id = NEW.nutritionist_id AND np.status = 'active' LIMIT 1;

  IF NEW.plan_status = 'pending_approval' AND OLD.plan_status != 'pending_approval' THEN
    _target_user := NEW.nutritionist_id; _title := 'Plano aguardando aprovação'; _message := 'Plano de ' || _patient_name || ' está pronto para revisão.'; _type := 'appointment';
  ELSIF NEW.plan_status = 'approved' AND OLD.plan_status != 'approved' THEN
    _target_user := NEW.nutritionist_id; _title := 'Plano aprovado'; _message := 'Plano de ' || _patient_name || ' foi aprovado. Pronto para publicar.'; _type := 'progress';
  ELSIF NEW.plan_status = 'published_to_patient' AND OLD.plan_status != 'published_to_patient' THEN
    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
      VALUES (NEW.patient_id, 'Novo plano alimentar!', 'Seu nutricionista publicou seu plano personalizado. Confira agora!', 'progress', '/meal-plan', _tenant_id);
    END IF;
    _target_user := NEW.nutritionist_id; _title := 'Plano entregue'; _message := 'Plano de ' || _patient_name || ' foi publicado com sucesso.'; _type := 'progress';
  ELSE
    RETURN NEW;
  END IF;

  IF _target_user IS NOT NULL AND _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
    VALUES (_target_user, _title, _message, _type, '/patients', _tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_plan_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  IF NEW.plan_status = 'published' AND (OLD.plan_status IS DISTINCT FROM 'published') THEN
    SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
    FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
    WHERE np.patient_id = NEW.patient_id AND np.status = 'active' LIMIT 1;

    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
      VALUES (NEW.patient_id, 'Plano alimentar atualizado! 🥗', 'Seu profissional publicou um novo plano alimentar para você.', 'plan_published', 'meal_plan', NEW.id, '/my-diet', _tenant_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_onboarding_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
  _title text;
  _message text;
  _type text := 'info';
  _tenant_id uuid;
BEGIN
  _nutri_id := NEW.nutritionist_id;
  IF _nutri_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;

  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    _title := 'Onboarding concluído'; _message := _patient_name || ' completou o onboarding e está pronto para o plano.'; _type := 'progress';
  ELSIF NEW.status = 'pending_body_data' AND (OLD IS NULL OR OLD.status = 'pending_anamnesis') THEN
    _title := 'Anamnese preenchida'; _message := _patient_name || ' preencheu a anamnese. Falta dados corporais.'; _type := 'info';
  ELSIF NEW.status = 'pending_preferences' AND (OLD IS NULL OR OLD.status != 'pending_preferences') THEN
    _title := 'Dados corporais enviados'; _message := _patient_name || ' enviou dados corporais. Faltam preferências.'; _type := 'info';
  ELSE
    RETURN NEW;
  END IF;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = NEW.patient_id AND np.nutritionist_id = _nutri_id AND np.status = 'active' LIMIT 1;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
    VALUES (_nutri_id, _title, _message, _type, '/patients', _tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_patient_onboarding_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nutri_name text;
  _tenant_id uuid;
BEGIN
  IF NEW.journey_status = 'onboarding_active' AND (OLD.journey_status IS DISTINCT FROM 'onboarding_active') THEN
    SELECT COALESCE(full_name, 'Seu nutricionista') INTO _nutri_name FROM public.profiles WHERE user_id = NEW.nutritionist_id;
    _tenant_id := COALESCE(NEW.tenant_id, (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = NEW.nutritionist_id LIMIT 1));

    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
      VALUES (NEW.patient_id, 'Onboarding liberado! 🎉', _nutri_name || ' liberou seu onboarding. Preencha sua anamnese para iniciar.', 'onboarding_released', 'onboarding', NEW.patient_id, '/anamnesis', _tenant_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_protocol_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
  _tenant_id uuid;
BEGIN
  IF OLD IS NULL OR OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('paused', 'active', 'cancelled') THEN RETURN NEW; END IF;

  SELECT np.nutritionist_id, COALESCE(np.tenant_id, ut.tenant_id)
  INTO _nutri_id, _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = NEW.patient_id AND np.status = 'active' LIMIT 1;

  IF _nutri_id IS NULL OR _tenant_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
  VALUES (_nutri_id,
    CASE NEW.status WHEN 'paused' THEN 'Protocolo pausado' WHEN 'cancelled' THEN 'Protocolo cancelado' ELSE 'Protocolo retomado' END,
    'Protocolo de ' || _patient_name || ' foi ' || CASE NEW.status WHEN 'paused' THEN 'pausado' WHEN 'cancelled' THEN 'cancelado' ELSE 'retomado' END || '.',
    CASE WHEN NEW.status = 'active' THEN 'progress' ELSE 'alert' END,
    '/protocols', _tenant_id);
  RETURN NEW;
END;
$$;