-- 1. Endurecer fix_patient_integrity: criar lifecycle/pipeline/vinculo se não existirem
CREATE OR REPLACE FUNCTION public.fix_patient_integrity_v2(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actions jsonb := '[]'::jsonb;
  v_tenant_id uuid;
  v_nutri_id uuid;
  v_has_lifecycle boolean;
  v_has_pipeline boolean;
  v_has_link boolean;
BEGIN
  -- Descobrir tenant e nutricionista (dono do tenant)
  SELECT ut.tenant_id, t.owner_user_id
    INTO v_tenant_id, v_nutri_id
  FROM public.profiles p
  JOIN public.user_tenants ut ON ut.user_id = p.user_id
  JOIN public.tenants t ON t.id = ut.tenant_id
  WHERE p.id = _patient_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'no_tenant');
  END IF;

  -- Garantir vínculo com nutricionista
  SELECT EXISTS(SELECT 1 FROM public.nutritionist_patients WHERE patient_id = _patient_id) INTO v_has_link;
  IF NOT v_has_link AND v_nutri_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, tenant_id)
    VALUES (v_nutri_id, _patient_id, 'active', v_tenant_id)
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_nutritionist_link');
  END IF;

  -- Garantir pipeline
  SELECT EXISTS(SELECT 1 FROM public.onboarding_pipelines WHERE patient_id = _patient_id) INTO v_has_pipeline;
  IF NOT v_has_pipeline AND v_nutri_id IS NOT NULL THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    VALUES (_patient_id, v_nutri_id, 'pending_anamnesis')
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_pipeline');
  END IF;

  -- Garantir lifecycle
  SELECT EXISTS(SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = _patient_id) INTO v_has_lifecycle;
  IF NOT v_has_lifecycle THEN
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
    VALUES (_patient_id, 'onboarding_started'::patient_lifecycle_status)
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_lifecycle');
  END IF;

  -- Reaproveitar a função original para realinhar estado se já existirem registros
  BEGIN
    PERFORM public.fix_patient_integrity(_patient_id);
    v_actions := v_actions || jsonb_build_array('realigned_via_v1');
  EXCEPTION WHEN OTHERS THEN
    v_actions := v_actions || jsonb_build_array('v1_realign_skipped');
  END;

  RETURN jsonb_build_object('status', 'fixed', 'actions', v_actions);
END;
$function$;

-- 2. Aplicar imediatamente em todos os pacientes inconsistentes
DO $$
DECLARE
  v_patient RECORD;
  v_result jsonb;
  v_fixed int := 0;
  v_err int := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'patient'
    WHERE NOT EXISTS (SELECT 1 FROM public.patient_lifecycle_states pls WHERE pls.patient_id = p.id)
       OR NOT EXISTS (SELECT 1 FROM public.onboarding_pipelines op WHERE op.patient_id = p.id)
       OR NOT EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = p.id)
  LOOP
    BEGIN
      v_result := public.fix_patient_integrity_v2(v_patient.id);
      v_fixed := v_fixed + 1;
      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context)
      VALUES (v_patient.id, 'fixed', jsonb_build_array('orphan_patient'), v_result, 'mass_backfill_v2_2026_04_17');
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context, error_message)
      VALUES (v_patient.id, 'error', jsonb_build_array('orphan_patient'), '[]'::jsonb, 'mass_backfill_v2_2026_04_17', SQLERRM);
    END;
  END LOOP;
  RAISE NOTICE 'V2 backfill: % fixed, % errors', v_fixed, v_err;
END $$;