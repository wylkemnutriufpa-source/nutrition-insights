CREATE OR REPLACE FUNCTION public.run_patient_realtime_fix(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_fixed INT := 0;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_link RECORD;
  v_invitation RECORD;
  v_recent_fix RECORD;
  v_patient_email TEXT;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'fixed', 0, 'issues', ARRAY['null_patient_id']);
  END IF;

  -- 1. Check for orphaned patient (no link in nutritionist_patients)
  SELECT * INTO v_link
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Try to find an invitation for this patient's email
    SELECT email INTO v_patient_email FROM auth.users WHERE id = _patient_id;
    
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE (patient_email = v_patient_email OR patient_name = (SELECT full_name FROM public.profiles WHERE user_id = _patient_id))
      AND status IN ('viewed', 'sent')
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- AUTO-REPAIR: Create the missing link
      INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
      VALUES (
        v_invitation.professional_id, 
        _patient_id, 
        'active', 
        'onboarding_active', 
        (SELECT tenant_id FROM public.profiles WHERE user_id = v_invitation.professional_id LIMIT 1)
      )
      ON CONFLICT DO NOTHING;

      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'orphaned_link_repaired_via_invitation');
      
      -- Refresh v_link for subsequent checks
      SELECT * INTO v_link
      FROM public.nutritionist_patients
      WHERE patient_id = _patient_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- 2. Continue with standard fixes if link exists
  IF v_link IS NOT NULL THEN
    -- [Existing logic for journey_status, pipeline, etc.]
    -- (Re-applying the rest of the original logic)
    
    -- Re-activate inactive link
    IF v_link.status = 'inactive' AND v_link.journey_status NOT IN ('invited','archived','cancelled') THEN
      UPDATE public.nutritionist_patients SET status = 'active' WHERE id = v_link.id;
      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'link_reactivated');
    END IF;

    -- Ensure pipeline
    IF NOT EXISTS (SELECT 1 FROM public.onboarding_pipelines WHERE patient_id = _patient_id) 
       AND v_link.journey_status IN ('onboarding_active','onboarding_completed') THEN
      INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
      VALUES (_patient_id, v_link.nutritionist_id, 'pending_anamnesis', 'released')
      ON CONFLICT DO NOTHING;
      v_fixed := v_fixed + 1;
      v_issues := array_append(v_issues, 'pipeline_created');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fixed', v_fixed,
    'issues', v_issues
  );
END;
$$;
