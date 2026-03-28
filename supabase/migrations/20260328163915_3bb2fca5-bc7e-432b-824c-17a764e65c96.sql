
-- RPC: self_register_nutritionist (creates tenant + profile + role atomically)
CREATE OR REPLACE FUNCTION public.self_register_nutritionist(_user_id uuid, _full_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _slug text;
BEGIN
  -- Generate slug from name
  _slug := lower(regexp_replace(_full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create tenant
  INSERT INTO public.tenants (name, slug, owner_user_id)
  VALUES (_full_name, _slug, _user_id)
  RETURNING id INTO _tenant_id;

  -- Link user to tenant
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'owner')
  ON CONFLICT DO NOTHING;

  -- Create profile with tenant_id
  INSERT INTO public.profiles (user_id, full_name, tenant_id)
  VALUES (_user_id, _full_name, _tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, tenant_id = EXCLUDED.tenant_id;

  -- Assign nutritionist role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'nutritionist')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'tenant_id', _tenant_id);
END;
$$;

-- Update self_register_patient to resolve tenant_id from nutritionist
CREATE OR REPLACE FUNCTION public.self_register_patient(_user_id uuid, _referral_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nutritionist_id uuid;
  _program_id uuid;
  _tenant_id uuid;
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
      -- Resolve tenant from nutritionist
      SELECT tenant_id INTO _tenant_id
      FROM public.user_tenants
      WHERE user_id = _nutritionist_id
      ORDER BY joined_at ASC
      LIMIT 1;

      -- Link patient to nutritionist with tenant
      INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, tenant_id)
      VALUES (_nutritionist_id, _user_id, 'active', _tenant_id)
      ON CONFLICT DO NOTHING;

      -- Link patient to tenant
      IF _tenant_id IS NOT NULL THEN
        INSERT INTO public.user_tenants (user_id, tenant_id, role)
        VALUES (_user_id, _tenant_id, 'member')
        ON CONFLICT DO NOTHING;

        -- Update profile tenant_id
        UPDATE public.profiles SET tenant_id = _tenant_id WHERE user_id = _user_id AND tenant_id IS NULL;
      END IF;

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
    'nutritionist_id', _nutritionist_id,
    'tenant_id', _tenant_id
  );
END;
$$;
