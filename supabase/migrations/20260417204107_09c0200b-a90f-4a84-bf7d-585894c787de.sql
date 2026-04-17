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
  v_user_id uuid;
BEGIN
  -- Resolver user_id: o _patient_id pode vir como profiles.id OU auth.users.id
  SELECT p.user_id, ut.tenant_id, t.owner_user_id
    INTO v_user_id, v_tenant_id, v_nutri_id
  FROM public.profiles p
  LEFT JOIN public.user_tenants ut ON ut.user_id = p.user_id
  LEFT JOIN public.tenants t ON t.id = ut.tenant_id
  WHERE p.id = _patient_id OR p.user_id = _patient_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'no_profile');
  END IF;

  IF v_tenant_id IS NULL OR v_nutri_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'no_tenant_or_owner', 'user_id', v_user_id);
  END IF;

  -- Vínculo nutricionista (usar v_user_id)
  IF NOT EXISTS(SELECT 1 FROM public.nutritionist_patients WHERE patient_id = v_user_id) THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, tenant_id)
    VALUES (v_nutri_id, v_user_id, 'active', v_tenant_id)
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_nutritionist_link');
  END IF;

  -- Pipeline (usar v_user_id)
  IF NOT EXISTS(SELECT 1 FROM public.onboarding_pipelines WHERE patient_id = v_user_id) THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    VALUES (v_user_id, v_nutri_id, 'pending_anamnesis')
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_pipeline');
  END IF;

  -- Lifecycle (usar v_user_id)
  IF NOT EXISTS(SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = v_user_id) THEN
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
    VALUES (v_user_id, 'onboarding_started'::patient_lifecycle_status)
    ON CONFLICT DO NOTHING;
    v_actions := v_actions || jsonb_build_array('created_lifecycle');
  END IF;

  RETURN jsonb_build_object('status', 'fixed', 'user_id', v_user_id, 'actions', v_actions);
END;
$function$;

-- Re-rodar backfill agora corretamente
DO $$
DECLARE
  v_patient RECORD;
  v_result jsonb;
  v_fixed int := 0;
  v_err int := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT p.id, p.user_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'patient'
    WHERE NOT EXISTS (SELECT 1 FROM public.patient_lifecycle_states pls WHERE pls.patient_id = p.user_id)
       OR NOT EXISTS (SELECT 1 FROM public.onboarding_pipelines op WHERE op.patient_id = p.user_id)
       OR NOT EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = p.user_id)
  LOOP
    BEGIN
      v_result := public.fix_patient_integrity_v2(v_patient.id);
      IF v_result->>'status' = 'fixed' THEN
        v_fixed := v_fixed + 1;
      ELSE
        v_err := v_err + 1;
      END IF;
      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context)
      VALUES (v_patient.user_id, COALESCE(v_result->>'status','error'), jsonb_build_array('orphan_patient'), v_result, 'mass_backfill_v3_2026_04_17');
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context, error_message)
      VALUES (v_patient.user_id, 'error', jsonb_build_array('orphan_patient'), '[]'::jsonb, 'mass_backfill_v3_2026_04_17', SQLERRM);
    END;
  END LOOP;
  RAISE NOTICE 'V3 backfill: % fixed, % errors', v_fixed, v_err;
END $$;