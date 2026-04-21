-- Add new columns for onboarding blocking
ALTER TABLE public.patient_lifecycle_states 
ADD COLUMN IF NOT EXISTS is_onboarding_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_block_reason TEXT;

-- Update the resolve_patient_lifecycle_state function to include blocking logic
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
  -- New variables for blocking logic
  v_is_onboarding_blocked boolean := false;
  v_onboarding_block_reason text;
  v_anamnesis_completed boolean := false;
  v_body_data_completed boolean := false;
  v_preferences_completed boolean := false;
BEGIN
  SELECT status INTO v_np_status
  FROM nutritionist_patients
  WHERE patient_id = _patient_id
  LIMIT 1;

  -- Cache (5 min) - We might want to skip cache if we want "instant" blocking detection
  -- but for now let's keep it to avoid excessive computation, or reduce it.
  SELECT lifecycle_state::text INTO v_lifecycle_state
  FROM patient_lifecycle_states
  WHERE patient_id = _patient_id
    AND computed_at > now() - interval '1 minute'; -- Reduced from 5 to 1 min for better responsiveness

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
      'onboarding_status', op.status,
      'is_onboarding_blocked', COALESCE(pls.is_onboarding_blocked, false),
      'onboarding_block_reason', pls.onboarding_block_reason
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

  -- Get detailed onboarding info
  SELECT 
    status, 
    COALESCE(anamnesis_completed, false), 
    COALESCE(body_data_completed, false),
    COALESCE(preferences_completed, false)
  INTO 
    v_onboarding_status, 
    v_anamnesis_completed, 
    v_body_data_completed,
    v_preferences_completed
  FROM onboarding_pipelines
  WHERE patient_id = _patient_id
  ORDER BY created_at DESC LIMIT 1;

  v_has_pending_onboarding := v_onboarding_status IS NOT NULL 
    AND v_onboarding_status NOT IN ('completed', 'cancelled');

  -- CHECK BLOCKING LOGIC
  -- We only block if they are in onboarding and DON'T have a plan yet.
  IF v_has_pending_onboarding AND NOT v_has_active_plan THEN
    IF NOT v_anamnesis_completed THEN
      v_is_onboarding_blocked := true;
      v_onboarding_block_reason := 'Anamnese obrigatória incompleta';
    ELSIF NOT v_body_data_completed THEN
      v_is_onboarding_blocked := true;
      v_onboarding_block_reason := 'Dados antropométricos (peso/altura) obrigatórios incompletos';
    END IF;
  END IF;

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

  -- ============ HIERARQUIA ============
  IF v_lifecycle_state IS NULL THEN
    IF v_has_pending_onboarding AND NOT v_has_active_plan THEN
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
    adherence_score, risk_score, next_recommended_action, computed_at,
    is_onboarding_blocked, onboarding_block_reason
  ) VALUES (
    _patient_id, v_lifecycle_state::patient_lifecycle_status, v_has_active_plan, v_has_pending_onboarding,
    v_has_clinical_alert, v_has_retention_risk, v_last_checkin_at, v_last_plan_delivery_at,
    v_adherence_score, v_risk_score, v_next_action, now(),
    v_is_onboarding_blocked, v_onboarding_block_reason
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
    is_onboarding_blocked = EXCLUDED.is_onboarding_blocked,
    onboarding_block_reason = EXCLUDED.onboarding_block_reason,
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
    'onboarding_status', v_onboarding_status,
    'is_onboarding_blocked', v_is_onboarding_blocked,
    'onboarding_block_reason', v_onboarding_block_reason
  );
  RETURN result;
END;
$function$;