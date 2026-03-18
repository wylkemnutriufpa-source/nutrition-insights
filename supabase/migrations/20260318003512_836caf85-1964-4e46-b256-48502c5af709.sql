
-- ============================================================
-- PATIENT LIFECYCLE STATE MACHINE — Core Architecture
-- ============================================================

-- 1. Enum for canonical lifecycle states
CREATE TYPE public.patient_lifecycle_status AS ENUM (
  'onboarding_started',
  'onboarding_ready_for_plan',
  'plan_pending_production',
  'plan_delivered',
  'active_followup',
  'clinical_attention',
  'retention_risk',
  'maintenance_mode',
  'paused',
  'closed'
);

-- 2. Canonical state table (one row per patient)
CREATE TABLE public.patient_lifecycle_states (
  patient_id uuid PRIMARY KEY,
  lifecycle_state public.patient_lifecycle_status NOT NULL DEFAULT 'onboarding_started',
  has_active_plan boolean NOT NULL DEFAULT false,
  has_pending_onboarding boolean NOT NULL DEFAULT false,
  has_clinical_alert boolean NOT NULL DEFAULT false,
  has_retention_risk boolean NOT NULL DEFAULT false,
  last_checkin_at timestamptz,
  last_plan_delivery_at timestamptz,
  adherence_score numeric DEFAULT 0,
  risk_score numeric DEFAULT 0,
  next_recommended_action text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_lifecycle_states ENABLE ROW LEVEL SECURITY;

-- Patients can read own state
CREATE POLICY "patients_read_own_lifecycle" ON public.patient_lifecycle_states
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Nutritionists can read their patients' states
CREATE POLICY "nutritionists_read_patient_lifecycle" ON public.patient_lifecycle_states
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_lifecycle_states.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Audit log for state transitions
CREATE TABLE public.patient_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  previous_state text,
  new_state text NOT NULL,
  trigger_event text NOT NULL,
  trigger_source text DEFAULT 'system',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.patient_lifecycle_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutritionists_read_lifecycle_audit" ON public.patient_lifecycle_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_lifecycle_audit.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Index for fast lookups
CREATE INDEX idx_lifecycle_audit_patient ON public.patient_lifecycle_audit(patient_id, created_at DESC);
CREATE INDEX idx_lifecycle_state_state ON public.patient_lifecycle_states(lifecycle_state);

-- 4. Core RPC: resolve_patient_lifecycle_state
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _has_active_plan boolean := false;
  _has_pending_onboarding boolean := false;
  _has_clinical_alert boolean := false;
  _has_retention_risk boolean := false;
  _last_checkin timestamptz;
  _last_plan_delivery timestamptz;
  _adherence numeric := 0;
  _risk numeric := 0;
  _state text := 'onboarding_started';
  _plan_id uuid;
  _plan_title text;
  _days_inactive integer := 0;
  _onboarding_status text;
  _next_action text;
BEGIN
  -- 1. Check for active/published meal plan
  SELECT id, title, updated_at INTO _plan_id, _plan_title, _last_plan_delivery
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status IN ('published_to_patient', 'approved')
  ORDER BY updated_at DESC
  LIMIT 1;

  _has_active_plan := _plan_id IS NOT NULL;

  -- 2. Check onboarding pipeline
  SELECT status INTO _onboarding_status
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  _has_pending_onboarding := _onboarding_status IS NOT NULL;

  -- 3. Check clinical alerts
  SELECT EXISTS(
    SELECT 1 FROM public.clinical_alerts
    WHERE patient_id = _patient_id
      AND is_active = true
      AND severity IN ('critical', 'high')
  ) INTO _has_clinical_alert;

  -- 4. Check last check-in
  SELECT MAX(created_at) INTO _last_checkin
  FROM public.patient_checkins
  WHERE patient_id = _patient_id;

  IF _last_checkin IS NOT NULL THEN
    _days_inactive := EXTRACT(DAY FROM now() - _last_checkin)::integer;
  END IF;

  -- 5. Get adherence & risk from daily snapshots
  SELECT adherence_score, clinical_risk_score
  INTO _adherence, _risk
  FROM public.clinical_daily_snapshots
  WHERE patient_id = _patient_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  _adherence := COALESCE(_adherence, 0);
  _risk := COALESCE(_risk, 0);

  -- 6. Check engagement signals for retention risk
  SELECT EXISTS(
    SELECT 1 FROM public.engagement_signals
    WHERE patient_id = _patient_id
      AND is_resolved = false
      AND severity IN ('critical', 'high')
      AND signal_type IN ('dropout_risk', 'low_engagement', 'streak_break')
  ) INTO _has_retention_risk;

  -- ============================================
  -- STATE MACHINE RESOLUTION (priority order)
  -- ============================================

  -- Priority 1: Closed/Paused (manual overrides)
  -- Check if patient has been manually paused or closed
  SELECT lifecycle_state::text INTO _state
  FROM public.patient_lifecycle_states
  WHERE patient_id = _patient_id
    AND lifecycle_state IN ('closed', 'paused');
  
  IF _state IN ('closed', 'paused') THEN
    -- Keep manual override
    _next_action := CASE _state
      WHEN 'closed' THEN 'Caso encerrado'
      WHEN 'paused' THEN 'Acompanhamento pausado'
    END;
  ELSE
    -- Priority 2: Clinical attention
    IF _has_clinical_alert AND _risk >= 30 THEN
      _state := 'clinical_attention';
      _next_action := 'Avaliar alertas clínicos ativos';

    -- Priority 3: Retention risk
    ELSIF _has_retention_risk OR _days_inactive > 7 THEN
      _state := 'retention_risk';
      _next_action := 'Ação de reengajamento necessária';

    -- Priority 4: Active followup (has plan + recent activity)
    ELSIF _has_active_plan AND _days_inactive <= 3 THEN
      _state := 'active_followup';
      _next_action := 'Monitorar evolução';

    -- Priority 5: Maintenance mode (has plan, stable, low risk)
    ELSIF _has_active_plan AND _adherence >= 80 AND _risk < 10 AND _days_inactive <= 7 THEN
      _state := 'maintenance_mode';
      _next_action := 'Acompanhamento estável';

    -- Priority 6: Plan delivered (has plan)
    ELSIF _has_active_plan THEN
      _state := 'plan_delivered';
      _next_action := 'Plano entregue - acompanhar';

    -- Priority 7: Plan pending production
    ELSIF _has_pending_onboarding AND _onboarding_status IN ('pending_approval', 'pending_plan_generation') THEN
      _state := 'plan_pending_production';
      _next_action := 'Aprovar ou gerar plano alimentar';

    -- Priority 8: Onboarding ready for plan
    ELSIF _has_pending_onboarding AND _onboarding_status IN ('anamnesis_completed', 'data_collected') THEN
      _state := 'onboarding_ready_for_plan';
      _next_action := 'Dados completos - gerar plano';

    -- Priority 9: Onboarding started
    ELSIF _has_pending_onboarding THEN
      _state := 'onboarding_started';
      _next_action := 'Aguardando paciente completar dados';

    -- Default: no plan
    ELSE
      _state := 'onboarding_started';
      _next_action := 'Iniciar coleta de dados';
    END IF;
  END IF;

  -- Build result
  _result := jsonb_build_object(
    'patient_id', _patient_id,
    'lifecycle_state', _state,
    'has_active_plan', _has_active_plan,
    'has_pending_onboarding', _has_pending_onboarding,
    'has_clinical_alert', _has_clinical_alert,
    'has_retention_risk', _has_retention_risk,
    'last_checkin_at', _last_checkin,
    'last_plan_delivery_at', _last_plan_delivery,
    'adherence_score', _adherence,
    'risk_score', _risk,
    'days_inactive', _days_inactive,
    'plan_id', _plan_id,
    'plan_title', _plan_title,
    'next_recommended_action', _next_action,
    'onboarding_status', _onboarding_status
  );

  -- Upsert the canonical state table
  INSERT INTO public.patient_lifecycle_states (
    patient_id, lifecycle_state, has_active_plan, has_pending_onboarding,
    has_clinical_alert, has_retention_risk, last_checkin_at,
    last_plan_delivery_at, adherence_score, risk_score,
    next_recommended_action, updated_at, computed_at
  ) VALUES (
    _patient_id, _state::patient_lifecycle_status, _has_active_plan, _has_pending_onboarding,
    _has_clinical_alert, _has_retention_risk, _last_checkin,
    _last_plan_delivery, _adherence, _risk,
    _next_action, now(), now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    lifecycle_state = EXCLUDED.lifecycle_state,
    has_active_plan = EXCLUDED.has_active_plan,
    has_pending_onboarding = EXCLUDED.has_pending_onboarding,
    has_clinical_alert = EXCLUDED.has_clinical_alert,
    has_retention_risk = EXCLUDED.has_retention_risk,
    last_checkin_at = EXCLUDED.last_checkin_at,
    last_plan_delivery_at = EXCLUDED.last_plan_delivery_at,
    adherence_score = EXCLUDED.adherence_score,
    risk_score = EXCLUDED.risk_score,
    next_recommended_action = EXCLUDED.next_recommended_action,
    updated_at = now(),
    computed_at = now();

  RETURN _result;
END;
$$;

-- 5. Trigger function to log state transitions
CREATE OR REPLACE FUNCTION public.log_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state THEN
    INSERT INTO public.patient_lifecycle_audit (
      patient_id, previous_state, new_state, trigger_event, trigger_source, metadata
    ) VALUES (
      NEW.patient_id,
      OLD.lifecycle_state::text,
      NEW.lifecycle_state::text,
      'state_change',
      'lifecycle_resolver',
      jsonb_build_object(
        'has_active_plan', NEW.has_active_plan,
        'risk_score', NEW.risk_score,
        'adherence_score', NEW.adherence_score
      )
    );

    -- Inject timeline event
    INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata)
    VALUES (
      NEW.patient_id,
      'lifecycle_transition',
      CASE NEW.lifecycle_state::text
        WHEN 'onboarding_started' THEN 'Onboarding iniciado'
        WHEN 'onboarding_ready_for_plan' THEN 'Dados completos para plano'
        WHEN 'plan_pending_production' THEN 'Plano em produção'
        WHEN 'plan_delivered' THEN 'Plano alimentar entregue'
        WHEN 'active_followup' THEN 'Acompanhamento ativo'
        WHEN 'clinical_attention' THEN 'Atenção clínica necessária'
        WHEN 'retention_risk' THEN 'Risco de abandono detectado'
        WHEN 'maintenance_mode' THEN 'Modo manutenção ativado'
        WHEN 'paused' THEN 'Acompanhamento pausado'
        WHEN 'closed' THEN 'Caso encerrado'
        ELSE 'Transição de estado'
      END,
      format('Estado alterado de %s para %s', OLD.lifecycle_state::text, NEW.lifecycle_state::text),
      jsonb_build_object(
        'from', OLD.lifecycle_state::text,
        'to', NEW.lifecycle_state::text,
        'risk_score', NEW.risk_score,
        'adherence_score', NEW.adherence_score
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lifecycle_transition
  AFTER UPDATE ON public.patient_lifecycle_states
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lifecycle_transition();

-- 6. Helper: manually set lifecycle state (for pause/close)
CREATE OR REPLACE FUNCTION public.set_patient_lifecycle_state(
  _patient_id uuid,
  _new_state text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_state text;
BEGIN
  SELECT lifecycle_state::text INTO _old_state
  FROM public.patient_lifecycle_states
  WHERE patient_id = _patient_id;

  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, updated_at)
  VALUES (_patient_id, _new_state::patient_lifecycle_status, now())
  ON CONFLICT (patient_id) DO UPDATE SET
    lifecycle_state = _new_state::patient_lifecycle_status,
    updated_at = now();

  INSERT INTO public.patient_lifecycle_audit (
    patient_id, previous_state, new_state, trigger_event, trigger_source, metadata, created_by
  ) VALUES (
    _patient_id, _old_state, _new_state, 'manual_override', 'professional',
    jsonb_build_object('reason', _reason),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'previous', _old_state, 'current', _new_state);
END;
$$;

-- 7. Legacy cleanup: seed lifecycle states for all existing patients
INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_active_plan, updated_at)
SELECT
  np.patient_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.patient_id = np.patient_id AND mp.is_active = true
      AND mp.plan_status IN ('published_to_patient', 'approved')
    ) THEN 'plan_delivered'::patient_lifecycle_status
    WHEN EXISTS (
      SELECT 1 FROM public.onboarding_pipelines op
      WHERE op.patient_id = np.patient_id
      AND op.status IN ('pending_approval', 'pending_plan_generation')
    ) THEN 'plan_pending_production'::patient_lifecycle_status
    WHEN EXISTS (
      SELECT 1 FROM public.onboarding_pipelines op
      WHERE op.patient_id = np.patient_id
      AND op.status = 'pending_anamnesis'
    ) THEN 'onboarding_started'::patient_lifecycle_status
    ELSE 'onboarding_started'::patient_lifecycle_status
  END,
  EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.patient_id = np.patient_id AND mp.is_active = true
    AND mp.plan_status IN ('published_to_patient', 'approved')
  ),
  now()
FROM (SELECT DISTINCT patient_id FROM public.nutritionist_patients WHERE status = 'active') np
ON CONFLICT (patient_id) DO NOTHING;

-- 8. Also fix legacy: supersede onboarding for patients with active plans
UPDATE public.onboarding_pipelines op
SET status = 'superseded_by_active_plan'
WHERE status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
AND EXISTS (
  SELECT 1 FROM public.meal_plans mp
  WHERE mp.patient_id = op.patient_id
  AND mp.is_active = true
  AND mp.plan_status IN ('published_to_patient', 'approved')
);

-- Enable realtime for lifecycle states
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_lifecycle_states;
