CREATE OR REPLACE FUNCTION public.run_patient_realtime_fix(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid := gen_random_uuid();
  v_fixes_applied integer := 0;
  v_issues jsonb := '[]'::jsonb;
  v_nutritionist_id uuid;
  v_journey_status text;
  v_pipeline_count integer;
  v_consent_count integer;
  v_link_status text;
  v_cached_at timestamptz;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'fixed', 0, 'issues', jsonb_build_array('null_patient_id'));
  END IF;

  SELECT last_checked_at INTO v_cached_at
  FROM public.patient_realtime_fix_cache
  WHERE patient_id = _patient_id;

  IF v_cached_at IS NOT NULL AND v_cached_at > now() - interval '5 minutes' THEN
    RETURN (SELECT last_result FROM public.patient_realtime_fix_cache WHERE patient_id = _patient_id);
  END IF;

  SELECT np.nutritionist_id, np.status, np.journey_status
    INTO v_nutritionist_id, v_link_status, v_journey_status
  FROM public.nutritionist_patients np
  WHERE np.patient_id = _patient_id
  ORDER BY np.created_at DESC
  LIMIT 1;

  SELECT count(*) INTO v_pipeline_count
  FROM public.onboarding_pipelines WHERE patient_id = _patient_id;

  SELECT count(*) INTO v_consent_count
  FROM public.clinical_consents WHERE patient_id = _patient_id;

  IF v_consent_count = 0 THEN
    INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, accepted_at)
    VALUES (_patient_id, 'v1.0', now())
    ON CONFLICT DO NOTHING;
    v_fixes_applied := v_fixes_applied + 1;
    v_issues := v_issues || jsonb_build_object('type', 'missing_consent', 'fixed', true);
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, source)
    VALUES (v_run_id, _patient_id, v_nutritionist_id, 'missing_consent', 'high', 'auto_fixed',
            'Consent created via runtime fix', 'runtime');
  END IF;

  IF v_pipeline_count = 0 AND v_nutritionist_id IS NOT NULL
     AND COALESCE(v_journey_status, 'onboarding_active') IN ('onboarding_active', 'onboarding_completed', 'active') THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
    VALUES (_patient_id, v_nutritionist_id, 'pending_anamnesis', 'released')
    ON CONFLICT DO NOTHING;
    v_fixes_applied := v_fixes_applied + 1;
    v_issues := v_issues || jsonb_build_object('type', 'missing_pipeline', 'fixed', true);
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, source)
    VALUES (v_run_id, _patient_id, v_nutritionist_id, 'missing_pipeline', 'critical', 'auto_fixed',
            'Pipeline created via runtime fix', 'runtime');
  END IF;

  UPDATE public.onboarding_pipelines
  SET release_status = 'released', updated_at = now()
  WHERE patient_id = _patient_id
    AND COALESCE(release_status, 'pending') NOT IN ('released');

  IF FOUND THEN
    v_fixes_applied := v_fixes_applied + 1;
    v_issues := v_issues || jsonb_build_object('type', 'pipeline_not_released', 'fixed', true);
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, source)
    VALUES (v_run_id, _patient_id, v_nutritionist_id, 'pipeline_not_released', 'high', 'auto_fixed',
            'Pipeline released via runtime fix', 'runtime');
  END IF;

  IF v_link_status IS NOT NULL AND v_link_status <> 'active'
     AND COALESCE(v_journey_status, '') IN ('onboarding_active', 'onboarding_completed', 'active') THEN
    UPDATE public.nutritionist_patients
    SET status = 'active', updated_at = now()
    WHERE patient_id = _patient_id;
    v_fixes_applied := v_fixes_applied + 1;
    v_issues := v_issues || jsonb_build_object('type', 'inactive_link', 'fixed', true);
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, source)
    VALUES (v_run_id, _patient_id, v_nutritionist_id, 'inactive_link', 'medium', 'auto_fixed',
            'Link reactivated via runtime fix', 'runtime');
  END IF;

  INSERT INTO public.patient_realtime_fix_cache
    (patient_id, last_checked_at, last_result, fixes_applied, updated_at)
  VALUES (
    _patient_id, now(),
    jsonb_build_object('success', true, 'fixed', v_fixes_applied, 'issues', v_issues, 'run_id', v_run_id),
    v_fixes_applied, now()
  )
  ON CONFLICT (patient_id) DO UPDATE
    SET last_checked_at = now(),
        last_result = EXCLUDED.last_result,
        fixes_applied = EXCLUDED.fixes_applied,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'fixed', v_fixes_applied, 'issues', v_issues, 'run_id', v_run_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'fixed', v_fixes_applied,
    'issues', v_issues || jsonb_build_object('type', 'exception', 'message', SQLERRM));
END;
$$;