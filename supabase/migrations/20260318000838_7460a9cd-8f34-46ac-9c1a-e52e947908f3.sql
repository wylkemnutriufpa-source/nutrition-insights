
-- ============================================================
-- GLOBAL PLAN STATUS STANDARDIZATION
-- Expand trigger to cover ALL sovereign statuses, not just published_to_patient
-- Add guard trigger on onboarding_pipelines to prevent reopen with active plan
-- ============================================================

-- 1. Expanded trigger: handle_plan_activation covers approved, published, active
CREATE OR REPLACE FUNCTION public.auto_resolve_onboarding_on_plan_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sovereign_statuses text[] := ARRAY['published_to_patient', 'approved', 'active'];
  _is_sovereign boolean;
  _was_sovereign boolean;
BEGIN
  _is_sovereign := NEW.plan_status = ANY(_sovereign_statuses) AND NEW.is_active = true;
  
  -- For UPDATE: only fire when transitioning INTO a sovereign status
  IF TG_OP = 'UPDATE' THEN
    _was_sovereign := OLD.plan_status = ANY(_sovereign_statuses) AND OLD.is_active = true;
    IF _was_sovereign OR NOT _is_sovereign THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- For INSERT: only fire if already sovereign
  IF TG_OP = 'INSERT' AND NOT _is_sovereign THEN
    RETURN NEW;
  END IF;

  -- Mark all pending onboarding pipelines as superseded
  UPDATE public.onboarding_pipelines
  SET status = 'superseded_by_published_plan',
      updated_at = now()
  WHERE patient_id = NEW.patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan');

  -- Log timeline event
  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    NEW.patient_id,
    'plan_delivered',
    'Plano alimentar entregue',
    'Seu plano alimentar está pronto e disponível no seu painel.',
    jsonb_build_object(
      'plan_id', NEW.id,
      'plan_title', NEW.title,
      'plan_status', NEW.plan_status,
      'delivery_source', COALESCE(NEW.generation_source, 'manual_editor'),
      'previous_onboarding_resolved', true
    ),
    COALESCE(NEW.nutritionist_id, auth.uid())
  );

  -- Push notification to patient
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  VALUES (
    NEW.patient_id,
    '🎉 Plano alimentar pronto!',
    'Seu plano alimentar personalizado já está disponível no seu painel. Acesse agora!',
    'plan_ready',
    'high'
  );

  RETURN NEW;
END;
$$;

-- Re-attach triggers to cover all statuses
DROP TRIGGER IF EXISTS trg_auto_resolve_onboarding_on_publish ON public.meal_plans;
CREATE TRIGGER trg_auto_resolve_onboarding_on_publish
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_resolve_onboarding_on_plan_publish();

DROP TRIGGER IF EXISTS trg_auto_resolve_onboarding_on_insert_publish ON public.meal_plans;
CREATE TRIGGER trg_auto_resolve_onboarding_on_insert_publish
  AFTER INSERT ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_resolve_onboarding_on_plan_publish();

-- 2. Guard trigger: prevent onboarding from reopening if active plan exists
CREATE OR REPLACE FUNCTION public.guard_onboarding_reopen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_active_plan boolean;
BEGIN
  -- Only guard when status is being changed TO a pending/active state
  IF NEW.status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'in_progress') THEN
    -- Check if patient already has a sovereign plan
    SELECT EXISTS(
      SELECT 1 FROM public.meal_plans
      WHERE patient_id = NEW.patient_id
        AND is_active = true
        AND plan_status IN ('published_to_patient', 'approved', 'active')
    ) INTO _has_active_plan;

    IF _has_active_plan THEN
      -- Force status to superseded instead of allowing reopen
      NEW.status := 'superseded_by_published_plan';
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_onboarding_reopen ON public.onboarding_pipelines;
CREATE TRIGGER trg_guard_onboarding_reopen
  BEFORE UPDATE ON public.onboarding_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_onboarding_reopen();

-- 3. Update resolve_patient_plan_status to also check 'active' and 'approved' statuses
CREATE OR REPLACE FUNCTION public.resolve_patient_plan_status(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan record;
  _onboarding record;
  _result jsonb;
BEGIN
  -- Priority 1: Check for sovereign plan (published/approved/active)
  SELECT id, title, plan_status, generation_source, updated_at
  INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status IN ('published_to_patient', 'approved', 'active')
  ORDER BY 
    CASE plan_status 
      WHEN 'published_to_patient' THEN 1 
      WHEN 'approved' THEN 2 
      WHEN 'active' THEN 3 
    END,
    updated_at DESC
  LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', CASE 
        WHEN _plan.plan_status = 'published_to_patient' THEN 'plan_delivered'
        WHEN _plan.plan_status = 'approved' THEN 'plan_approved_pending_publish'
        ELSE 'plan_delivered'
      END,
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'delivery_source', _plan.generation_source,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- Priority 2: Check for plan under review
  SELECT id, title, updated_at INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id AND is_active = true AND plan_status = 'under_professional_review'
  ORDER BY updated_at DESC LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_under_review',
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- Priority 3: Check for draft/auto-generated plan pending approval
  SELECT id, title, updated_at INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id AND is_active = true AND plan_status IN ('draft', 'draft_auto_generated')
  ORDER BY updated_at DESC LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_pending_approval',
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- Priority 4: Check for active onboarding
  SELECT id, status, updated_at INTO _onboarding
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan')
  ORDER BY created_at DESC LIMIT 1;

  IF _onboarding IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'onboarding_in_progress',
      'onboarding_id', _onboarding.id,
      'onboarding_status', _onboarding.status,
      'last_updated', _onboarding.updated_at,
      'show_onboarding', true,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- Priority 5: No plan at all
  RETURN jsonb_build_object(
    'status', 'no_plan',
    'show_onboarding', false,
    'show_no_plan', true,
    'show_waiting_approval', false
  );
END;
$$;

-- 4. One-time cleanup: resolve any legacy conflicts
UPDATE public.onboarding_pipelines op
SET status = 'superseded_by_published_plan', updated_at = now()
WHERE op.status NOT IN ('completed', 'superseded_by_published_plan')
  AND EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.patient_id = op.patient_id
      AND mp.is_active = true
      AND mp.plan_status IN ('published_to_patient', 'approved', 'active')
  );
