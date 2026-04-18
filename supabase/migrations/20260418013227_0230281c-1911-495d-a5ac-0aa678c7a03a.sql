-- =====================================================================
-- FitJourney — Runtime Patient Guard v1.0.0
-- Cria as duas RPCs faltantes que o frontend (useEnsurePatientReady) chama:
--   1) run_patient_realtime_fix(_patient_id) — versão "leve" da auditoria,
--      aplica os mesmos fixes para 1 paciente, com cache de 5min.
--   2) ensure_patient_ready(_patient_id) — validação final, retorna ok|fixed|error.
--
-- Compatível com a auditoria diária existente (run_daily_patient_audit) e
-- registra os fixes no patient_audit_results com source='runtime'.
-- =====================================================================

-- 1) Garantir que a coluna 'source' aceita 'runtime'/'manual' além de 'cron'
--    (a coluna já existe; nada a alterar no schema)

-- 2) Função realtime de fix por paciente
CREATE OR REPLACE FUNCTION public.run_patient_realtime_fix(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_fixed INT := 0;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_link RECORD;
  v_pipeline RECORD;
  v_consents INT;
  v_recent_fix RECORD;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'fixed', 0, 'issues', ARRAY['null_patient_id']);
  END IF;

  -- Cache: se houve fix runtime nos últimos 5 minutos, retorna cacheado
  SELECT * INTO v_recent_fix
  FROM public.patient_audit_results
  WHERE patient_id = _patient_id
    AND source = 'runtime'
    AND created_at > now() - interval '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'fixed', 0,
      'issues', ARRAY['cached'],
      'cache', true
    );
  END IF;

  -- 1) Vínculo nutritionist_patients inativo com jornada ativa → reativa
  SELECT np.*, op.status AS pipeline_status, op.release_status
  INTO v_link
  FROM public.nutritionist_patients np
  LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
  WHERE np.patient_id = _patient_id
  ORDER BY np.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_link.status = 'inactive'
       AND v_link.journey_status NOT IN ('invited','archived','cancelled') THEN
      UPDATE public.nutritionist_patients
        SET status = 'active'
      WHERE id = v_link.id;

      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
      VALUES (v_run_id, _patient_id, v_link.nutritionist_id,
        'inactive_link_with_active_journey', 'high', 'auto_fixed',
        'Vínculo reativado em runtime',
        jsonb_build_object('previous_status','inactive','journey_status', v_link.journey_status),
        'runtime');

      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'link_reactivated');
    END IF;

    -- 2) Pipeline ausente em paciente com jornada de onboarding
    IF v_link.pipeline_status IS NULL
       AND v_link.journey_status IN ('onboarding_active','onboarding_completed') THEN
      INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
      VALUES (_patient_id, v_link.nutritionist_id, 'pending_anamnesis', 'released')
      ON CONFLICT (patient_id) DO NOTHING;

      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
      VALUES (v_run_id, _patient_id, v_link.nutritionist_id,
        'missing_onboarding_pipeline', 'critical', 'auto_fixed',
        'Pipeline criado em runtime',
        jsonb_build_object('journey_status', v_link.journey_status),
        'runtime');

      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'pipeline_created');
    END IF;

    -- 3) Pipeline existe mas não está released
    IF v_link.pipeline_status IN ('pending_anamnesis','collecting_data')
       AND COALESCE(v_link.release_status,'') <> 'released' THEN
      UPDATE public.onboarding_pipelines
        SET release_status = 'released', updated_at = now()
      WHERE patient_id = _patient_id;

      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
      VALUES (v_run_id, _patient_id, v_link.nutritionist_id,
        'pipeline_not_released', 'high', 'auto_fixed',
        'Pipeline liberado em runtime',
        jsonb_build_object('pipeline_status', v_link.pipeline_status),
        'runtime');

      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'pipeline_released');
    END IF;

    -- 4) Consentimento clínico ausente em paciente com jornada
    SELECT COUNT(*) INTO v_consents
    FROM public.clinical_consents
    WHERE patient_id = _patient_id AND revoked_at IS NULL;

    IF v_consents = 0
       AND v_link.journey_status IN ('onboarding_active','onboarding_completed','plan_published','active_followup','active') THEN
      INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, accepted_at)
      VALUES (_patient_id, 'v1.0-runtime', now());

      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
      VALUES (v_run_id, _patient_id, v_link.nutritionist_id,
        'missing_clinical_consent', 'critical', 'auto_fixed',
        'Consentimento criado em runtime',
        jsonb_build_object('journey_status', v_link.journey_status),
        'runtime');

      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'consent_created');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fixed', v_fixed,
    'issues', v_issues,
    'run_id', v_run_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Nunca quebrar o front: log silencioso
  BEGIN
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, finding_type, severity, action_taken, description, details, source)
    VALUES (v_run_id, _patient_id, 'runtime_exception', 'high', 'failed',
      'Exceção em run_patient_realtime_fix: ' || SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE),
      'runtime');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'success', false,
    'fixed', 0,
    'issues', ARRAY['exception:' || SQLERRM]
  );
END;
$function$;

-- 3) Função de validação final para o front
CREATE OR REPLACE FUNCTION public.ensure_patient_ready(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_pipeline RECORD;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_actions JSONB := '[]'::jsonb;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('status','error','issues', ARRAY['null_patient_id'], 'actions', '[]'::jsonb);
  END IF;

  SELECT np.*, op.status AS pipeline_status, op.release_status
  INTO v_link
  FROM public.nutritionist_patients np
  LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
  WHERE np.patient_id = _patient_id
  ORDER BY np.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Paciente sem vínculo: pode ser auto-cadastro recente, libera com warning
    RETURN jsonb_build_object('status','ok','issues', ARRAY['no_nutritionist_link'], 'actions', '[]'::jsonb);
  END IF;

  -- Validações duras
  IF v_link.status = 'inactive' AND v_link.journey_status NOT IN ('invited','archived','cancelled') THEN
    v_issues := array_append(v_issues, 'inactive_link');
  END IF;

  IF v_link.journey_status IN ('onboarding_active','onboarding_completed') AND v_link.pipeline_status IS NULL THEN
    v_issues := array_append(v_issues, 'missing_pipeline');
  END IF;

  IF v_link.pipeline_status IN ('pending_anamnesis','collecting_data')
     AND COALESCE(v_link.release_status,'') <> 'released' THEN
    v_issues := array_append(v_issues, 'pipeline_locked');
  END IF;

  IF array_length(v_issues, 1) IS NULL THEN
    RETURN jsonb_build_object('status','ok','issues', ARRAY[]::TEXT[], 'actions', '[]'::jsonb);
  ELSE
    RETURN jsonb_build_object('status','error','issues', v_issues, 'actions', v_actions);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','error','issues', ARRAY['exception:' || SQLERRM], 'actions', '[]'::jsonb);
END;
$function$;

-- 4) Permissões: usuários autenticados podem chamar
REVOKE ALL ON FUNCTION public.run_patient_realtime_fix(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_patient_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_patient_realtime_fix(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_patient_ready(uuid) TO authenticated;

-- 5) Garantir que a auditoria diária marque suas inserções com source='cron'
--    (re-deploy da função existente apenas atualizando os INSERT para incluir source)
CREATE OR REPLACE FUNCTION public.run_daily_patient_audit()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_patient RECORD;
  v_total INT := 0;
  v_fixed INT := 0;
  v_flagged INT := 0;
  v_failed INT := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT
      np.patient_id,
      np.nutritionist_id,
      np.status AS link_status,
      np.journey_status,
      op.status AS pipeline_status,
      op.release_status,
      (SELECT COUNT(*) FROM public.clinical_consents cc 
        WHERE cc.patient_id = np.patient_id AND cc.revoked_at IS NULL) AS consent_count,
      (SELECT COUNT(*) FROM public.onboarding_pipelines op2 
        WHERE op2.patient_id = np.patient_id) AS pipeline_count
    FROM public.nutritionist_patients np
    LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
    WHERE np.journey_status IS NOT NULL
      AND np.journey_status NOT IN ('archived', 'cancelled')
  LOOP
    v_total := v_total + 1;

    BEGIN
      IF v_patient.link_status = 'inactive' 
         AND v_patient.journey_status NOT IN ('invited', 'archived') THEN
        UPDATE public.nutritionist_patients
        SET status = 'active'
        WHERE patient_id = v_patient.patient_id
          AND nutritionist_id = v_patient.nutritionist_id;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'inactive_link_with_active_journey', 'high', 'auto_fixed',
          'Vínculo nutricionista-paciente reativado automaticamente',
          jsonb_build_object('previous_status', 'inactive', 'journey_status', v_patient.journey_status),
          'cron');
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.pipeline_count = 0 
         AND v_patient.journey_status IN ('onboarding_active', 'onboarding_completed') THEN
        INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
        VALUES (v_patient.patient_id, v_patient.nutritionist_id, 'pending_anamnesis', 'released')
        ON CONFLICT (patient_id) DO NOTHING;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'missing_onboarding_pipeline', 'critical', 'auto_fixed',
          'Pipeline de onboarding criado automaticamente',
          jsonb_build_object('journey_status', v_patient.journey_status),
          'cron');
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.consent_count = 0 
         AND v_patient.journey_status IN ('onboarding_active', 'onboarding_completed', 'plan_published', 'active_followup', 'active') THEN
        INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, accepted_at)
        VALUES (v_patient.patient_id, 'v1.0-auto-audit', now());

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'missing_clinical_consent', 'critical', 'auto_fixed',
          'Consentimento clínico criado automaticamente (paciente já em jornada)',
          jsonb_build_object('journey_status', v_patient.journey_status),
          'cron');
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.pipeline_status IN ('pending_anamnesis', 'collecting_data') 
         AND COALESCE(v_patient.release_status, '') <> 'released' THEN
        UPDATE public.onboarding_pipelines
        SET release_status = 'released', updated_at = now()
        WHERE patient_id = v_patient.patient_id;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'pipeline_not_released', 'high', 'auto_fixed',
          'Pipeline liberado automaticamente para o paciente prosseguir',
          jsonb_build_object('pipeline_status', v_patient.pipeline_status),
          'cron');
        v_fixed := v_fixed + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
      VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
        'audit_exception', 'high', 'failed',
        'Erro ao auditar paciente: ' || SQLERRM,
        jsonb_build_object('sqlstate', SQLSTATE),
        'cron');
      v_failed := v_failed + 1;
    END;
  END LOOP;

  WITH inserted AS (
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details, source)
    SELECT 
      v_run_id, mp.patient_id, mp.nutritionist_id,
      'active_plan_without_items', 'critical', 'needs_attention',
      'Plano ativo entregue sem itens — paciente não vê comida',
      jsonb_build_object('plan_id', mp.id, 'plan_status', mp.plan_status, 'created_at', mp.created_at),
      'cron'
    FROM public.meal_plans mp
    WHERE mp.plan_status IN ('published', 'published_to_patient', 'active', 'approved')
      AND NOT EXISTS (SELECT 1 FROM public.meal_plan_items mpi WHERE mpi.meal_plan_id = mp.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_flagged FROM inserted;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'total_patients_audited', v_total,
    'auto_fixed', v_fixed,
    'flagged_for_attention', v_flagged,
    'failed', v_failed,
    'completed_at', now()
  );
END;
$function$;