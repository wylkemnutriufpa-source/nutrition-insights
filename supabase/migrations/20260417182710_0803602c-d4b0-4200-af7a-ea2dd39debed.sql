-- Modo Emergência v1.0.2 — colunas corretas do audit log: issue_type, action_taken
CREATE OR REPLACE FUNCTION public.fix_patient_integrity(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions jsonb := '[]'::jsonb;
  v_pipeline RECORD;
  v_lifecycle_now text;
  v_target_state text;
  v_has_active_plan boolean;
  v_anamnesis_status text;
  v_norm jsonb;
BEGIN
  BEGIN
    v_norm := public.normalize_patient_data(_patient_id);
    v_actions := v_actions || jsonb_build_object('step', 'normalize_base', 'result', v_norm);
  EXCEPTION WHEN OTHERS THEN
    v_actions := v_actions || jsonb_build_object('step', 'normalize_base', 'error', SQLERRM);
  END;

  SELECT * INTO v_pipeline FROM public.onboarding_pipelines WHERE patient_id = _patient_id LIMIT 1;
  SELECT lifecycle_state::text INTO v_lifecycle_now FROM public.patient_lifecycle_states WHERE patient_id = _patient_id;
  SELECT EXISTS(SELECT 1 FROM public.meal_plans WHERE patient_id = _patient_id AND is_active = true) INTO v_has_active_plan;
  SELECT status INTO v_anamnesis_status FROM public.patient_anamnesis WHERE user_id = _patient_id ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF v_has_active_plan THEN
    v_target_state := NULL;
  ELSIF v_pipeline.patient_id IS NOT NULL
        AND v_pipeline.status = 'pending_anamnesis'
        AND COALESCE(v_pipeline.anamnesis_completed, false) = false THEN
    v_target_state := 'onboarding_started';
  ELSIF v_pipeline.patient_id IS NOT NULL
        AND COALESCE(v_pipeline.anamnesis_completed, false) = true
        AND COALESCE(v_pipeline.body_data_completed, false) = true
        AND COALESCE(v_pipeline.preferences_completed, false) = true
        AND COALESCE(v_pipeline.plan_generated, false) = false THEN
    v_target_state := 'onboarding_ready_for_plan';
  ELSIF v_pipeline.patient_id IS NOT NULL
        AND COALESCE(v_pipeline.plan_generated, false) = true
        AND COALESCE(v_pipeline.plan_approved, false) = false THEN
    v_target_state := 'plan_pending_production';
  END IF;

  IF v_target_state IS NOT NULL AND v_target_state IS DISTINCT FROM v_lifecycle_now THEN
    UPDATE public.patient_lifecycle_states
       SET lifecycle_state = v_target_state::patient_lifecycle_status,
           updated_at = now()
     WHERE patient_id = _patient_id;

    v_actions := v_actions || jsonb_build_object(
      'step', 'realign_lifecycle', 'from', v_lifecycle_now, 'to', v_target_state
    );

    INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, details, status)
    VALUES (
      _patient_id,
      'lifecycle_misaligned',
      'realign_lifecycle',
      jsonb_build_object('from', v_lifecycle_now, 'to', v_target_state, 'pipeline_status', v_pipeline.status),
      'fixed'
    );
  ELSE
    v_actions := v_actions || jsonb_build_object('step', 'realign_lifecycle', 'result', 'already_aligned');
  END IF;

  RETURN jsonb_build_object(
    'patient_id', _patient_id,
    'has_active_plan', v_has_active_plan,
    'pipeline_status', v_pipeline.status,
    'anamnesis_status', v_anamnesis_status,
    'lifecycle_before', v_lifecycle_now,
    'lifecycle_after', COALESCE(v_target_state, v_lifecycle_now),
    'actions', v_actions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fix_patient_integrity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fix_patient_integrity(uuid) TO authenticated;

-- Aplicar aos 6 pacientes investigados
SELECT public.fix_patient_integrity('42afc613-e9ce-4408-9b3e-9da8c9f3e9ca');
SELECT public.fix_patient_integrity('91c85db4-2a00-4b32-b190-b0b63a73a1cb');
SELECT public.fix_patient_integrity('9930c2ab-0d82-455f-92cc-74ca28de8c02');
SELECT public.fix_patient_integrity('d83fe021-8519-49e3-a651-c9192e7a25d0');
SELECT public.fix_patient_integrity('187282cb-bde8-4a04-bbed-f984892c3c1e');
SELECT public.fix_patient_integrity('5eec3042-f69d-453f-884a-f8d9335e0556');