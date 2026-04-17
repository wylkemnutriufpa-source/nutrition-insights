DO $$
DECLARE
  v_patient RECORD;
  v_result jsonb;
  v_fixed_count int := 0;
  v_error_count int := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT p.id, p.full_name
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'patient'
    WHERE NOT EXISTS (SELECT 1 FROM public.patient_lifecycle_states pls WHERE pls.patient_id = p.id)
       OR NOT EXISTS (SELECT 1 FROM public.onboarding_pipelines op WHERE op.patient_id = p.id)
  LOOP
    BEGIN
      v_result := public.fix_patient_integrity(v_patient.id);
      v_fixed_count := v_fixed_count + 1;

      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context)
      VALUES (
        v_patient.id,
        'fixed',
        jsonb_build_array('missing_lifecycle_or_pipeline'),
        v_result,
        'mass_backfill_2026_04_17'
      );
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context, error_message)
      VALUES (
        v_patient.id,
        'error',
        jsonb_build_array('fix_failed'),
        '[]'::jsonb,
        'mass_backfill_2026_04_17',
        SQLERRM
      );
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % fixed, % errors', v_fixed_count, v_error_count;
END $$;