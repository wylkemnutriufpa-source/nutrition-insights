
-- PHASE 1: Fix functions only (no data changes yet)

-- Fix status transition trigger
CREATE OR REPLACE FUNCTION validate_meal_plan_status_transition()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.plan_status = NEW.plan_status THEN RETURN NEW; END IF;

  IF NEW.plan_status = 'published_to_patient' AND OLD.plan_status NOT IN ('approved', 'published') THEN
    RAISE EXCEPTION 'Cannot publish plan without approval. Current status: %', OLD.plan_status;
  END IF;

  IF OLD.plan_status IN ('published_to_patient', 'published') AND NEW.plan_status IN ('draft', 'draft_auto_generated') THEN
    RAISE EXCEPTION 'Cannot revert published plan to draft. Archive it instead.';
  END IF;

  IF OLD.plan_status IN ('archived', 'expired') AND NEW.plan_status NOT IN ('archived', 'expired') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.plan_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix guard trigger
CREATE OR REPLACE FUNCTION fn_guard_plan_status_consistency()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan_status IN ('draft', 'draft_auto_generated', 'under_professional_review', 'rejected') AND NEW.is_active = true THEN
    RAISE EXCEPTION 'PLAN_STATUS_INCONSISTENCY: Plan with status "%" should not be is_active = true', NEW.plan_status;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix publish_meal_plan RPC
CREATE OR REPLACE FUNCTION publish_meal_plan(_plan_id uuid, _nutritionist_id uuid)
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
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF _plan IS NULL THEN RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist'; END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan'; END IF;

  SELECT count(*) INTO _item_count FROM public.meal_plan_items WHERE meal_plan_id = _plan_id;
  IF _item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PLAN', 'message', 'Não é possível publicar um plano sem refeições.');
  END IF;

  IF _plan.overall_validation_status IS NULL OR _plan.overall_validation_status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION_REQUIRED', 'message', 'O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado.');
  END IF;

  _patient_id := _plan.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  UPDATE public.meal_plans SET is_active = false WHERE patient_id = _patient_id AND id != _plan_id AND is_active = true;
  UPDATE public.meal_plans SET plan_status = 'published_to_patient', is_active = true WHERE id = _plan_id;

  UPDATE public.nutritionist_patients SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id AND nutritionist_id = _nutritionist_id AND status = 'active'
    AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (_patient_id, 'Novo plano alimentar', 'Seu plano alimentar foi atualizado pelo seu profissional.', 'plan_published', 'meal_plan', _plan_id::text, '/my-diet', _tenant_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id);
END;
$$;
