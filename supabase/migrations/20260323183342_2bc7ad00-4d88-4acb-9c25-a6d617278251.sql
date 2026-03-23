
-- ========================================
-- WORKSTREAM 1: LIFECYCLE UNIFICATION
-- Define clear roles: journey_status = CRM, lifecycle_state = clinical
-- ========================================

-- Add comments to clarify field responsibilities
COMMENT ON COLUMN public.nutritionist_patients.journey_status IS 
  'CRM/commercial progression only: lead_created, awaiting_payment, awaiting_onboarding_release, onboarding_active, onboarding_completed, clinical_followup_active, inactive, reactivated. NOT used for clinical decisions.';

-- ========================================
-- WORKSTREAM 2: SERVER-AUTHORITATIVE TRANSITIONS
-- RPCs for critical state changes
-- ========================================

-- RPC: Release onboarding (replaces frontend direct updates)
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
  _pipeline_id uuid;
  _result jsonb;
BEGIN
  -- Validate link exists and is active
  SELECT id INTO _link_id
  FROM nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  IF _link_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_LINK: No active link between patient and nutritionist';
  END IF;

  -- Update journey_status (CRM)
  UPDATE nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE id = _link_id;

  -- Update or create onboarding pipeline
  SELECT id INTO _pipeline_id
  FROM onboarding_pipelines
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _pipeline_id IS NOT NULL THEN
    UPDATE onboarding_pipelines
    SET release_status = 'released',
        released_by = _nutritionist_id,
        released_at = now(),
        release_config = _release_config
    WHERE id = _pipeline_id;
  ELSE
    INSERT INTO onboarding_pipelines (
      patient_id, nutritionist_id, status, release_status, 
      released_by, released_at, release_config
    ) VALUES (
      _patient_id, _nutritionist_id, 'pending_anamnesis', 'released',
      _nutritionist_id, now(), _release_config
    )
    RETURNING id INTO _pipeline_id;
  END IF;

  -- Create notification for patient
  INSERT INTO notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    _patient_id,
    'Onboarding liberado!',
    'Seu profissional liberou seu acesso ao onboarding. Comece agora!',
    'onboarding_released',
    'onboarding',
    '/onboarding'
  );

  _result := jsonb_build_object(
    'success', true,
    'pipeline_id', _pipeline_id,
    'journey_status', 'onboarding_active'
  );

  RETURN _result;
END;
$$;

-- RPC: Update journey status with validation
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
  -- Get current status
  SELECT journey_status INTO _current_status
  FROM nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_LINK: Patient not linked to nutritionist';
  END IF;

  -- Define valid transitions
  _valid_transitions := '{
    "lead_created": ["awaiting_payment", "awaiting_onboarding_release", "onboarding_active"],
    "awaiting_payment": ["awaiting_onboarding_release", "onboarding_active", "lead_created"],
    "awaiting_onboarding_release": ["onboarding_active", "lead_created"],
    "onboarding_active": ["onboarding_completed", "clinical_followup_active"],
    "onboarding_completed": ["clinical_followup_active"],
    "clinical_followup_active": ["inactive", "reactivated"],
    "inactive": ["reactivated", "lead_created"],
    "reactivated": ["clinical_followup_active", "onboarding_active"],
    "active": ["onboarding_active", "clinical_followup_active", "inactive"]
  }'::jsonb;

  -- Validate transition
  IF NOT (_valid_transitions->_current_status) ? _new_status THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot move from % to %', _current_status, _new_status;
  END IF;

  -- Execute transition
  UPDATE nutritionist_patients
  SET journey_status = _new_status
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'previous_status', _current_status,
    'new_status', _new_status
  );
END;
$$;

-- RPC: Publish meal plan (server-authoritative)
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
  -- Validate plan ownership and state
  SELECT id, patient_id, plan_status, is_active, nutritionist_id
  INTO _plan
  FROM meal_plans
  WHERE id = _plan_id;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist';
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan';
  END IF;

  IF _plan.plan_status = 'published' AND _plan.is_active = true THEN
    RETURN jsonb_build_object('success', true, 'message', 'Plan already published and active');
  END IF;

  _patient_id := _plan.patient_id;

  -- Deactivate all other plans for this patient
  UPDATE meal_plans
  SET is_active = false
  WHERE patient_id = _patient_id
    AND id != _plan_id
    AND is_active = true;

  -- Activate and publish this plan (single source of truth)
  UPDATE meal_plans
  SET plan_status = 'published',
      is_active = true
  WHERE id = _plan_id;

  -- Update journey status if still in early stages
  UPDATE nutritionist_patients
  SET journey_status = 'clinical_followup_active'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
    AND journey_status IN ('onboarding_active', 'onboarding_completed');

  -- Notify patient
  INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, target_route)
  VALUES (
    _patient_id,
    'Novo plano alimentar disponível!',
    'Seu profissional publicou um novo plano alimentar. Confira agora!',
    'plan_published',
    'meal_plan',
    _plan_id::text,
    '/meals'
  );

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', _plan_id,
    'patient_id', _patient_id,
    'plan_status', 'published',
    'is_active', true
  );
END;
$$;

-- ========================================
-- WORKSTREAM 3: LEGACY ONBOARDING CONTAINMENT
-- Archive orphan pipelines
-- ========================================

-- RPC: Clean orphan onboarding pipelines
CREATE OR REPLACE FUNCTION public.archive_orphan_onboarding_pipelines()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _archived_count integer;
BEGIN
  -- Archive pipelines that:
  -- 1. Have no active nutritionist link
  -- 2. Are older than 90 days and not completed
  -- 3. Have release_status still 'pending' with no activity
  WITH orphans AS (
    UPDATE onboarding_pipelines op
    SET status = 'archived'
    WHERE op.status NOT IN ('completed', 'archived', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
      AND (
        -- No active link exists
        NOT EXISTS (
          SELECT 1 FROM nutritionist_patients np
          WHERE np.patient_id = op.patient_id
            AND np.nutritionist_id = op.nutritionist_id
            AND np.status = 'active'
        )
        OR (
          -- Stale: older than 90 days, not released
          op.created_at < now() - interval '90 days'
          AND op.release_status != 'released'
        )
      )
    RETURNING id
  )
  SELECT count(*) INTO _archived_count FROM orphans;

  RETURN jsonb_build_object(
    'success', true,
    'archived_count', _archived_count
  );
END;
$$;

-- ========================================
-- WORKSTREAM 5: PLAN STATE NORMALIZATION
-- Create a view that resolves plan_status + is_active into one truth
-- ========================================

CREATE OR REPLACE VIEW public.meal_plan_resolved_state AS
SELECT
  id,
  patient_id,
  nutritionist_id,
  title,
  plan_status,
  is_active,
  -- Canonical resolved state
  CASE
    WHEN is_active = true AND plan_status = 'published' THEN 'active_published'
    WHEN is_active = true AND plan_status != 'published' THEN 'active_draft'  -- inconsistent, should not happen
    WHEN is_active = false AND plan_status = 'published' THEN 'inactive_published'
    WHEN plan_status = 'draft' THEN 'draft'
    WHEN plan_status = 'draft_auto_generated' THEN 'draft_auto'
    WHEN plan_status = 'archived' THEN 'archived'
    ELSE 'unknown'
  END AS resolved_state,
  -- Flag inconsistencies
  CASE
    WHEN is_active = true AND plan_status NOT IN ('published', 'approved') THEN true
    WHEN is_active = false AND plan_status = 'published' AND EXISTS (
      SELECT 1 FROM meal_plans mp2 
      WHERE mp2.patient_id = meal_plans.patient_id 
        AND mp2.is_active = true 
        AND mp2.id != meal_plans.id
    ) THEN false  -- normal: superseded
    ELSE false
  END AS has_state_inconsistency,
  created_at,
  start_date
FROM meal_plans;

-- ========================================
-- WORKSTREAM 6: PIPELINE OBSERVABILITY
-- Persistent logging for background processes
-- ========================================

CREATE TABLE IF NOT EXISTS public.pipeline_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name text NOT NULL,
  execution_status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  patients_processed integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  warnings_count integer DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  engine_version text DEFAULT '1.0.0',
  triggered_by text DEFAULT 'cron'
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_name_started 
  ON public.pipeline_execution_logs(pipeline_name, started_at DESC);

-- Enable RLS
ALTER TABLE public.pipeline_execution_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin can read pipeline logs" ON public.pipeline_execution_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role inserts (edge functions use service role)
CREATE POLICY "Service can insert pipeline logs" ON public.pipeline_execution_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Grant for edge functions
GRANT SELECT, INSERT, UPDATE ON public.pipeline_execution_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pipeline_execution_logs TO service_role;
