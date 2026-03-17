
-- =====================================================
-- CANONICAL PLAN STATUS RESOLVER + AUTO-RESOLVE TRIGGER
-- =====================================================

-- 1. Canonical function: resolves the single source of truth for patient plan status
CREATE OR REPLACE FUNCTION public.resolve_patient_plan_status(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _published_plan record;
  _approved_plan record;
  _draft_plan record;
  _pending_plan record;
  _onboarding record;
  _status text;
  _plan_id uuid;
  _delivery_source text;
BEGIN
  -- Priority 1: Active + published plan (SOVEREIGN STATUS)
  SELECT id, title, plan_status, generation_source, updated_at
  INTO _published_plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'published_to_patient'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _published_plan.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_delivered',
      'plan_id', _published_plan.id,
      'plan_title', _published_plan.title,
      'delivery_source', COALESCE(_published_plan.generation_source, 'manual_editor'),
      'last_updated', _published_plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- Priority 2: Approved but not yet published
  SELECT id, title, plan_status, generation_source
  INTO _approved_plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'approved'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _approved_plan.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_approved_pending_publish',
      'plan_id', _approved_plan.id,
      'plan_title', _approved_plan.title,
      'delivery_source', COALESCE(_approved_plan.generation_source, 'manual_editor'),
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- Priority 3: Under professional review
  SELECT id, title, plan_status, generation_source
  INTO _draft_plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'under_professional_review'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _draft_plan.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_under_review',
      'plan_id', _draft_plan.id,
      'plan_title', _draft_plan.title,
      'delivery_source', COALESCE(_draft_plan.generation_source, 'onboarding'),
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- Priority 4: Draft/auto-generated (pending generation/approval)
  SELECT id, title, plan_status, generation_source
  INTO _pending_plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'draft_auto_generated'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _pending_plan.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_pending_approval',
      'plan_id', _pending_plan.id,
      'plan_title', _pending_plan.title,
      'delivery_source', COALESCE(_pending_plan.generation_source, 'onboarding'),
      'show_onboarding', true,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- Priority 5: Check onboarding pipeline status
  SELECT id, status, plan_generated, plan_approved
  INTO _onboarding
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _onboarding.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'onboarding_in_progress',
      'onboarding_id', _onboarding.id,
      'onboarding_status', _onboarding.status,
      'show_onboarding', true,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- Priority 6: No plan at all
  RETURN jsonb_build_object(
    'status', 'no_plan',
    'show_onboarding', false,
    'show_no_plan', true,
    'show_waiting_approval', false
  );
END;
$$;

-- 2. Trigger: When meal_plan becomes published_to_patient, auto-resolve onboarding
CREATE OR REPLACE FUNCTION public.auto_resolve_onboarding_on_plan_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when plan_status changes TO 'published_to_patient'
  IF NEW.plan_status = 'published_to_patient'
     AND (OLD.plan_status IS DISTINCT FROM 'published_to_patient') THEN

    -- Mark all pending onboarding pipelines for this patient as superseded
    UPDATE public.onboarding_pipelines
    SET status = 'superseded_by_published_plan',
        updated_at = now()
    WHERE patient_id = NEW.patient_id
      AND status NOT IN ('completed', 'superseded_by_published_plan');

    -- Log the event in patient timeline
    INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
    VALUES (
      NEW.patient_id,
      'plan_delivered',
      'Plano alimentar entregue',
      'Seu plano alimentar está pronto e disponível no seu painel.',
      jsonb_build_object(
        'plan_id', NEW.id,
        'plan_title', NEW.title,
        'delivery_source', COALESCE(NEW.generation_source, 'manual_editor'),
        'previous_onboarding_resolved', true
      ),
      COALESCE(NEW.nutritionist_id, auth.uid())
    );

    -- Create notification for patient
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.patient_id,
      '🎉 Plano alimentar pronto!',
      'Seu plano alimentar personalizado já está disponível no seu painel. Acesse agora!',
      'plan_ready'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_auto_resolve_onboarding_on_publish ON public.meal_plans;
CREATE TRIGGER trg_auto_resolve_onboarding_on_publish
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_resolve_onboarding_on_plan_publish();

-- Also fire on INSERT with published status (direct publish from editor)
DROP TRIGGER IF EXISTS trg_auto_resolve_onboarding_on_insert_publish ON public.meal_plans;
CREATE TRIGGER trg_auto_resolve_onboarding_on_insert_publish
  AFTER INSERT ON public.meal_plans
  FOR EACH ROW
  WHEN (NEW.plan_status = 'published_to_patient')
  EXECUTE FUNCTION public.auto_resolve_onboarding_on_plan_publish();
