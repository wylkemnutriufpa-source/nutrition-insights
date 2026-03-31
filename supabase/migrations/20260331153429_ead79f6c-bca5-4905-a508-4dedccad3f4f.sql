
-- ITEM 1+2: Add item count validation to all plan transition RPCs

-- publish_meal_plan: add items check
CREATE OR REPLACE FUNCTION public.publish_meal_plan(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan record;
  _patient_id uuid;
  _tenant_id uuid;
  _item_count integer;
BEGIN
  SELECT id, patient_id, plan_status, is_active, nutritionist_id, overall_validation_status, overall_score, last_validated_at
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF _plan IS NULL THEN RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist'; END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan'; END IF;

  -- NEW: Validate plan has items
  SELECT count(*) INTO _item_count FROM public.meal_plan_items WHERE meal_plan_id = _plan_id;
  IF _item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PLAN', 'message', 'Não é possível publicar um plano sem refeições. Adicione itens ao plano primeiro.');
  END IF;

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

-- save_plan_as_approved: add items check
CREATE OR REPLACE FUNCTION public.save_plan_as_approved(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan record;
  _item_count integer;
BEGIN
  SELECT id, plan_status, patient_id INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF _plan.plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve from state: ' || _plan.plan_status);
  END IF;

  -- NEW: Validate plan has items
  SELECT count(*) INTO _item_count FROM public.meal_plan_items WHERE meal_plan_id = _plan_id;
  IF _item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PLAN', 'message', 'Não é possível aprovar um plano sem refeições.');
  END IF;

  UPDATE meal_plans
  SET plan_status = 'approved', updated_at = now()
  WHERE id = _plan_id;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'new_status', 'approved');
END;
$$;

-- approve_and_publish_plan: add items check
CREATE OR REPLACE FUNCTION public.approve_and_publish_plan(
  _plan_id uuid,
  _nutritionist_id uuid,
  _start_date date DEFAULT CURRENT_DATE,
  _duration_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- NEW: Validate plan has items
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

-- ITEM 3: Add tenant triggers for critical tables without them

-- behavioral_profile
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_behavioral_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for behavioral_profile patient %', NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_behavioral_profile BEFORE INSERT ON behavioral_profile FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_behavioral_profile();

-- body_analyses
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_body_analyses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.assessor_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.assessor_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for body_analyses';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_body_analyses BEFORE INSERT ON body_analyses FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_body_analyses();

-- body_assessment_photos
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_body_assessment_photos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for body_assessment_photos';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_body_assessment_photos BEFORE INSERT ON body_assessment_photos FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_body_assessment_photos();

-- booking_payments
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_booking_payments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_booking_payments BEFORE INSERT ON booking_payments FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_booking_payments();

-- cardio_prescriptions
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_cardio_prescriptions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.personal_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.personal_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for cardio_prescriptions';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_cardio_prescriptions BEFORE INSERT ON cardio_prescriptions FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_cardio_prescriptions();

-- clinical_action_recommendations
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_clinical_action_recommendations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for clinical_action_recommendations';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_clinical_action_recommendations BEFORE INSERT ON clinical_action_recommendations FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_clinical_action_recommendations();

-- checklist_daily_summary
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_checklist_daily_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_checklist_daily_summary BEFORE INSERT ON checklist_daily_summary FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_checklist_daily_summary();

-- nutrition_protocols
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_nutrition_protocols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.created_by IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.created_by);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for nutrition_protocols';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_nutrition_protocols BEFORE INSERT ON nutrition_protocols FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_nutrition_protocols();

-- patient_appointments
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_patient_appointments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for patient_appointments';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_patient_appointments BEFORE INSERT ON patient_appointments FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_patient_appointments();

-- patient_protocols
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_patient_protocols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.assigned_by IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.assigned_by);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for patient_protocols';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_patient_protocols BEFORE INSERT ON patient_protocols FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_patient_protocols();

-- professional_profiles
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_professional_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_tenant_professional_profiles BEFORE INSERT ON professional_profiles FOR EACH ROW EXECUTE FUNCTION auto_resolve_tenant_professional_profiles();
