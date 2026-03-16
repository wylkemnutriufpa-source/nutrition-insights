
CREATE OR REPLACE FUNCTION public.self_register_patient(_user_id uuid, _referral_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _nutritionist_id uuid;
  _program_id uuid;
BEGIN
  -- Assign patient role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (_user_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If referral code provided, link to nutritionist
  IF _referral_code IS NOT NULL AND _referral_code != '' THEN
    SELECT nutritionist_id, program_id INTO _nutritionist_id, _program_id
    FROM public.patient_referrals
    WHERE referral_code = _referral_code AND is_active = true
    LIMIT 1;

    IF _nutritionist_id IS NOT NULL THEN
      -- Link patient to nutritionist
      INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status)
      VALUES (_nutritionist_id, _user_id, 'active')
      ON CONFLICT DO NOTHING;

      -- Create onboarding pipeline
      INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
      VALUES (_user_id, _nutritionist_id, 'pending_anamnesis')
      ON CONFLICT DO NOTHING;

      -- If program linked, enroll patient
      IF _program_id IS NOT NULL THEN
        INSERT INTO public.program_enrollments (program_id, patient_id, status)
        VALUES (_program_id, _user_id, 'active')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', _user_id,
    'nutritionist_linked', _nutritionist_id IS NOT NULL,
    'nutritionist_id', _nutritionist_id
  );
END;
$$;
