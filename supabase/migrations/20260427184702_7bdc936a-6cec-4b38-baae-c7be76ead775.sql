DROP FUNCTION IF EXISTS public.create_patient_canonical(uuid, text, text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.create_patient_canonical(uuid, text, text, text, uuid, text, jsonb, text);

-- Recreate the correct one with clear defaults
CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text DEFAULT NULL,
  _whatsapp text DEFAULT NULL,
  _nutritionist_id uuid DEFAULT NULL,
  _source text DEFAULT 'register',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
  v_initial_journey_status text := 'awaiting_consent';
  v_res_profile_id uuid;
BEGIN
  -- 1. Resolve Tenant
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.user_tenants WHERE user_id = _nutritionist_id ORDER BY joined_at ASC LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 2. Profiles (upsert)
  INSERT INTO public.profiles (user_id, full_name, phone, whatsapp, tenant_id)
  VALUES (_patient_id, _full_name, COALESCE(_phone, _whatsapp), COALESCE(_whatsapp, _phone), v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        whatsapp  = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
        updated_at = now();

  -- 3. User Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Link to Professional
  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', v_initial_journey_status, v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          journey_status = CASE 
            WHEN nutritionist_patients.journey_status IS NULL OR nutritionist_patients.journey_status = 'invited' THEN 'awaiting_consent'
            ELSE nutritionist_patients.journey_status 
          END;

    -- 5. Ensure Onboarding Pipeline
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    SELECT _patient_id, _nutritionist_id, 'pending_anamnesis'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_pipelines
      WHERE patient_id = _patient_id AND status NOT IN ('completed','archived','rejected')
    );
  END IF;

  -- 6. Lifecycle
  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started', _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO UPDATE SET has_pending_onboarding = true;

  -- 7. Log
  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
END;
$$;