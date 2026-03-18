-- ═══════════════════════════════════════════════════════════
-- PROTOCOL SOVEREIGNTY — Manual interventions cannot kill protocols
-- ═══════════════════════════════════════════════════════════

-- 1. Add manual intervention tracking to patient_protocols
ALTER TABLE public.patient_protocols
  ADD COLUMN IF NOT EXISTS manual_intervention_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_manual_intervention_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_manual_intervention_by uuid,
  ADD COLUMN IF NOT EXISTS manual_adjustments_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_protocol_evaluation_at timestamptz,
  ADD COLUMN IF NOT EXISTS protocol_next_action_at timestamptz;

-- Add constraint for manual_intervention_status values
ALTER TABLE public.patient_protocols
  ADD CONSTRAINT chk_manual_intervention_status 
  CHECK (manual_intervention_status IN ('none', 'adjusted_within_protocol', 'overridden_temporarily', 'custom_manual_layer'));

-- 2. Protocol intervention audit log
CREATE TABLE IF NOT EXISTS public.protocol_intervention_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_protocol_id uuid NOT NULL REFERENCES public.patient_protocols(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  intervention_type text NOT NULL,  -- manual_plan_edit, manual_meal_change, manual_calorie_adjust, manual_macro_adjust, manual_goal_change, protocol_pause, protocol_cancel, protocol_resume
  description text,
  changes_applied jsonb DEFAULT '{}',
  protocol_status_before text NOT NULL,
  protocol_status_after text NOT NULL,
  protocol_kept_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'professional_dashboard',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.protocol_intervention_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see own patient protocol logs"
  ON public.protocol_intervention_log FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

CREATE POLICY "Professionals can insert protocol logs"
  ON public.protocol_intervention_log FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

CREATE INDEX idx_protocol_intervention_patient ON public.protocol_intervention_log (patient_id, created_at DESC);
CREATE INDEX idx_protocol_intervention_protocol ON public.protocol_intervention_log (patient_protocol_id, created_at DESC);

-- 3. Trigger: protect protocol_status from being changed by meal_plan edits
-- When a meal_plan is updated/created, if there's an active protocol, mark it as having manual adjustments
-- but DO NOT change the protocol status
CREATE OR REPLACE FUNCTION public.protect_protocol_on_plan_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_protocol record;
BEGIN
  -- Find active protocol for this patient
  SELECT * INTO _active_protocol
  FROM public.patient_protocols
  WHERE patient_id = NEW.patient_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no active protocol, nothing to protect
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Mark protocol as having manual adjustments (but keep it ACTIVE)
  UPDATE public.patient_protocols
  SET manual_intervention_status = 'adjusted_within_protocol',
      last_manual_intervention_at = now(),
      last_manual_intervention_by = auth.uid(),
      manual_adjustments_count = manual_adjustments_count + 1,
      updated_at = now()
  WHERE id = _active_protocol.id;

  -- Log the intervention
  INSERT INTO public.protocol_intervention_log (
    patient_protocol_id, patient_id, performed_by,
    intervention_type, description, changes_applied,
    protocol_status_before, protocol_status_after, protocol_kept_active
  ) VALUES (
    _active_protocol.id, NEW.patient_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'manual_plan_create'
      WHEN OLD.plan_status != NEW.plan_status THEN 'manual_status_change'
      ELSE 'manual_plan_edit'
    END,
    'Plano alimentar editado manualmente. Protocolo mantido ativo.',
    jsonb_build_object(
      'plan_id', NEW.id,
      'plan_status', NEW.plan_status,
      'operation', TG_OP
    ),
    'active', 'active', true
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_protocol_on_plan_edit ON public.meal_plans;
CREATE TRIGGER trg_protect_protocol_on_plan_edit
  AFTER INSERT OR UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_protocol_on_plan_edit();

-- 4. Trigger: BLOCK implicit protocol deactivation
-- Only explicit actions (pause/cancel/complete) can change protocol_status from active
CREATE OR REPLACE FUNCTION public.enforce_explicit_protocol_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If status is changing FROM active to something else
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    -- Only allow explicit transitions (pause, cancel, complete)
    IF NEW.status NOT IN ('paused', 'cancelled', 'completed') THEN
      RAISE EXCEPTION 'Protocol status can only transition from active to paused, cancelled, or completed. Got: %', NEW.status;
    END IF;

    -- Log the explicit transition
    INSERT INTO public.protocol_intervention_log (
      patient_protocol_id, patient_id, performed_by,
      intervention_type, description,
      protocol_status_before, protocol_status_after, protocol_kept_active
    ) VALUES (
      NEW.id, NEW.patient_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'protocol_' || NEW.status::text,
      'Protocolo alterado explicitamente para: ' || NEW.status::text,
      OLD.status::text, NEW.status::text, false
    );
  END IF;

  -- If resuming from paused
  IF OLD.status = 'paused' AND NEW.status = 'active' THEN
    INSERT INTO public.protocol_intervention_log (
      patient_protocol_id, patient_id, performed_by,
      intervention_type, description,
      protocol_status_before, protocol_status_after, protocol_kept_active
    ) VALUES (
      NEW.id, NEW.patient_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'protocol_resume',
      'Protocolo retomado.',
      'paused', 'active', true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_protocol_transition ON public.patient_protocols;
CREATE TRIGGER trg_enforce_protocol_transition
  BEFORE UPDATE ON public.patient_protocols
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enforce_explicit_protocol_transition();

-- 5. Timeline integration for protocol events
CREATE OR REPLACE FUNCTION public.log_protocol_timeline_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.protocol_kept_active THEN
    INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
    VALUES (
      NEW.patient_id,
      'protocol_manual_adjustment',
      'Ajuste manual no protocolo',
      NEW.description,
      jsonb_build_object('intervention_type', NEW.intervention_type, 'protocol_kept_active', true),
      NEW.performed_by
    );
  ELSE
    INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
    VALUES (
      NEW.patient_id,
      'protocol_status_change',
      CASE NEW.intervention_type
        WHEN 'protocol_paused' THEN 'Protocolo pausado'
        WHEN 'protocol_cancelled' THEN 'Protocolo cancelado'
        WHEN 'protocol_completed' THEN 'Protocolo concluído'
        ELSE 'Status do protocolo alterado'
      END,
      NEW.description,
      jsonb_build_object('intervention_type', NEW.intervention_type, 'status_before', NEW.protocol_status_before, 'status_after', NEW.protocol_status_after),
      NEW.performed_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protocol_intervention_timeline ON public.protocol_intervention_log;
CREATE TRIGGER trg_protocol_intervention_timeline
  AFTER INSERT ON public.protocol_intervention_log
  FOR EACH ROW
  EXECUTE FUNCTION public.log_protocol_timeline_event()