
DO $$
DECLARE
  v_patient record;
  v_result jsonb;
  v_total int := 0;
  v_modified int := 0;
  v_names int := 0;
  v_lifecycles int := 0;
  v_unlinked int := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT user_id AS pid FROM public.user_roles WHERE role = 'patient'
  LOOP
    v_total := v_total + 1;
    v_result := public.normalize_patient_data(v_patient.pid);

    IF jsonb_array_length(COALESCE(v_result->'actions', '[]'::jsonb)) > 0 THEN
      v_modified := v_modified + 1;
      INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, status, details)
        VALUES (v_patient.pid, 'data_inconsistency', 'normalized', 'fixed', v_result);

      IF v_result::text LIKE '%backfilled_full_name%' THEN v_names := v_names + 1; END IF;
      IF v_result::text LIKE '%created_lifecycle%' THEN v_lifecycles := v_lifecycles + 1; END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.nutritionist_patients WHERE patient_id = v_patient.pid) THEN
      v_unlinked := v_unlinked + 1;
      INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, status, details)
        VALUES (v_patient.pid, 'no_nutritionist_link', 'flagged', 'requires_manual_review',
                jsonb_build_object('note', 'Patient has role but no link to any nutritionist'));
    END IF;
  END LOOP;

  RAISE NOTICE 'Audit summary: total=%, modified=%, names_filled=%, lifecycles_created=%, unlinked=%',
    v_total, v_modified, v_names, v_lifecycles, v_unlinked;
END $$;
