-- ========== PARTE 1: Resolver alertas falsos da Josiane ==========
UPDATE clinical_alerts
SET is_active = false,
    resolved_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_resolved', true,
      'resolution_reason', 'invalid_alert_patient_never_completed_onboarding'
    )
WHERE patient_id = '2f2d483a-140a-4f29-9d10-592a706c7117'
  AND is_active = true
  AND alert_type = 'possible_behavioral_dropout';

-- ========== PARTE 2: Limpar cache de estado da Josiane ==========
DELETE FROM patient_lifecycle_states
WHERE patient_id = '2f2d483a-140a-4f29-9d10-592a706c7117';

-- ========== PARTE 3: Limpar perfil órfão duplicado (sem auth.users) ==========
DELETE FROM profiles
WHERE id = '3cb9d9a7-c785-4b7c-a622-727fcee552e3'
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '3cb9d9a7-c785-4b7c-a622-727fcee552e3');

-- ========== PARTE 4: Corrigir hierarquia de prioridade do lifecycle ==========
-- Onboarding pendente DEVE ter prioridade sobre clinical_attention e retention_risk.
-- Não faz sentido alertar "abandono" em paciente que nunca começou.
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_lifecycle_state text;
  v_has_active_plan boolean := false;
  v_has_pending_onboarding boolean := false;
  v_has_clinical_alert boolean := false;
  v_has_retention_risk boolean := false;
  v_last_checkin_at timestamptz;
  v_last_plan_delivery_at timestamptz;
  v_adherence_score numeric := 0;
  v_risk_score numeric := 0;
  v_days_inactive integer := 0;
  v_plan_id uuid;
  v_plan_title text;
  v_next_action text;
  v_onboarding_status text;
  v_np_status text;
BEGIN
  SELECT status INTO v_np_status
  FROM nutritionist_patients
  WHERE patient_id = _patient_id
  LIMIT 1;

  -- Cache (5 min)
  SELECT lifecycle_state::text INTO v_lifecycle_state
  FROM patient_lifecycle_states
  WHERE patient_id = _patient_id
    AND computed_at > now() - interval '5 minutes';

  IF v_lifecycle_state IS NOT NULL THEN
    SELECT jsonb_build_object(
      'lifecycle_state', pls.lifecycle_state::text,
      'has_active_plan', pls.has_active_plan,
      'has_pending_onboarding', pls.has_pending_onboarding,
      'has_clinical_alert', pls.has_clinical_alert,
      'has_retention_risk', pls.has_retention_risk,
      'last_checkin_at', pls.last_checkin_at,
      'last_plan_delivery_at', pls.last_plan_delivery_at,
      'adherence_score', COALESCE(pls.adherence_score, 0),
      'risk_score', COALESCE(pls.risk_score, 0),
      'days_inactive', COALESCE(EXTRACT(DAY FROM now() - pls.last_checkin_at)::int, 0),
      'plan_id', mp.id,
      'plan_title', mp.title,
      'next_recommended_action', pls.next_recommended_action,
      'onboarding_status', op.status
    ) INTO result
    FROM patient_lifecycle_states pls
    LEFT JOIN meal_plans mp ON mp.patient_id = _patient_id AND mp.is_active = true
    LEFT JOIN onboarding_pipelines op ON op.patient_id = _patient_id
    WHERE pls.patient_id = _patient_id
    ORDER BY op.created_at DESC NULLS LAST
    LIMIT 1;
    RETURN result;
  END IF;

  IF v_np_status = 'paused' THEN
    v_lifecycle_state := 'paused';
  ELSIF v_np_status = 'closed' OR v_np_status = 'inactive' THEN
    v_lifecycle_state := 'closed';
  END IF;

  SELECT id, title INTO v_plan_id, v_plan_title
  FROM meal_plans
  WHERE patient_id = _patient_id AND is_active = true
  ORDER BY created_at DESC LIMIT 1;
  v_has_active_plan := v_plan_id IS NOT NULL;

  SELECT MAX(updated_at) INTO v_last_plan_delivery_at
  FROM meal_plans
  WHERE patient_id = _patient_id AND plan_status = 'published';

  SELECT status INTO v_onboarding_status
  FROM onboarding_pipelines
  WHERE patient_id = _patient_id
  ORDER BY created_at DESC LIMIT 1;
  v_has_pending_onboarding := v_onboarding_status IS NOT NULL 
    AND v_onboarding_status NOT IN ('completed', 'cancelled');

  SELECT EXISTS(
    SELECT 1 FROM clinical_alerts
    WHERE patient_id = _patient_id AND is_active = true AND severity IN ('high', 'critical')
  ) INTO v_has_clinical_alert;

  SELECT MAX(created_at) INTO v_last_checkin_at
  FROM checklist_tasks
  WHERE patient_id = _patient_id AND completed = true;

  IF v_last_checkin_at IS NOT NULL THEN
    v_days_inactive := EXTRACT(DAY FROM now() - v_last_checkin_at)::int;
  ELSE
    v_days_inactive := 999;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM engagement_signals
    WHERE patient_id = _patient_id AND is_resolved = false AND severity IN ('high', 'critical')
  ) INTO v_has_retention_risk;

  SELECT 
    COALESCE(adherence_score, 0),
    COALESCE(clinical_risk_score, 0)
  INTO v_adherence_score, v_risk_score
  FROM clinical_daily_snapshots
  WHERE patient_id = _patient_id
  ORDER BY snapshot_date DESC LIMIT 1;

  -- ============ HIERARQUIA CORRIGIDA ============
  -- ONBOARDING PENDENTE TEM PRIORIDADE ABSOLUTA sobre clinical_attention/retention_risk
  -- (não faz sentido alertar abandono em quem nem começou)
  IF v_lifecycle_state IS NULL THEN
    IF v_has_pending_onboarding AND NOT v_has_active_plan THEN
      -- onboarding tem precedência total
      IF v_onboarding_status = 'plan_generated' THEN
        v_lifecycle_state := 'plan_pending_production';
        v_next_action := 'Revisar e aprovar plano gerado';
      ELSIF v_onboarding_status IN ('body_data_completed', 'preferences_completed', 'anamnesis_completed') THEN
        v_lifecycle_state := 'onboarding_ready_for_plan';
        v_next_action := 'Gerar plano alimentar';
      ELSE
        v_lifecycle_state := 'onboarding_started';
        v_next_action := 'Aguardar paciente completar onboarding';
      END IF;
    ELSIF v_has_clinical_alert THEN
      v_lifecycle_state := 'clinical_attention';
      v_next_action := 'Revisar alertas clínicos ativos';
    ELSIF v_has_retention_risk OR v_days_inactive > 7 THEN
      v_lifecycle_state := 'retention_risk';
      v_next_action := 'Contatar paciente — risco de abandono';
      v_has_retention_risk := true;
    ELSIF v_has_active_plan AND v_days_inactive <= 3 THEN
      v_lifecycle_state := 'active_followup';
      v_next_action := 'Monitorar evolução';
    ELSIF v_has_active_plan AND v_adherence_score >= 80 AND v_days_inactive <= 5 THEN
      v_lifecycle_state := 'maintenance_mode';
      v_next_action := 'Paciente estável — manutenção';
    ELSIF v_has_active_plan THEN
      v_lifecycle_state := 'plan_delivered';
      v_next_action := 'Acompanhar adesão ao plano';
    ELSE
      v_lifecycle_state := 'onboarding_started';
      v_next_action := 'Aguardar paciente completar onboarding';
    END IF;
  END IF;

  INSERT INTO patient_lifecycle_states (
    patient_id, lifecycle_state, has_active_plan, has_pending_onboarding,
    has_clinical_alert, has_retention_risk, last_checkin_at, last_plan_delivery_at,
    adherence_score, risk_score, next_recommended_action, computed_at
  ) VALUES (
    _patient_id, v_lifecycle_state::patient_lifecycle_status, v_has_active_plan, v_has_pending_onboarding,
    v_has_clinical_alert, v_has_retention_risk, v_last_checkin_at, v_last_plan_delivery_at,
    v_adherence_score, v_risk_score, v_next_action, now()
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
    computed_at = now(),
    updated_at = now();

  result := jsonb_build_object(
    'lifecycle_state', v_lifecycle_state,
    'has_active_plan', v_has_active_plan,
    'has_pending_onboarding', v_has_pending_onboarding,
    'has_clinical_alert', v_has_clinical_alert,
    'has_retention_risk', v_has_retention_risk,
    'last_checkin_at', v_last_checkin_at,
    'last_plan_delivery_at', v_last_plan_delivery_at,
    'adherence_score', v_adherence_score,
    'risk_score', v_risk_score,
    'days_inactive', v_days_inactive,
    'plan_id', v_plan_id,
    'plan_title', v_plan_title,
    'next_recommended_action', v_next_action,
    'onboarding_status', v_onboarding_status
  );
  RETURN result;
END;
$function$;