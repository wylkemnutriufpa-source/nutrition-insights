-- First, drop the overloaded versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_patient_canonical(uuid, text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.create_patient_canonical(uuid, text, text, text, uuid, text, jsonb, text);

-- Create a definitive single version of the RPC
CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text,
  _nutritionist_id uuid,
  _source text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _whatsapp text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
  v_initial_journey_status text := 'awaiting_payment';
  v_res_profile_id uuid;
BEGIN
  -- Basic validations
  IF _patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id is required';
  END IF;
  
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name is required';
  END IF;

  -- Normalize source
  IF _source NOT IN ('invite','import','register','lead_convert','admin','migration_backfill') THEN
    RAISE EXCEPTION 'Invalid source: %', _source;
  END IF;

  -- 1. Resolve initial journey status
  -- All registration-via-link flows should start in onboarding_active to bypass the payment block
  IF _source IN ('invite', 'register', 'lead_convert') THEN
    v_initial_journey_status := 'onboarding_active';
  END IF;

  -- 2. Resolve Tenant
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_tenants
    WHERE user_id = _nutritionist_id
    ORDER BY joined_at ASC NULLS LAST 
    LIMIT 1;
  END IF;

  -- Fallback tenant if none resolved from professional
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 3. Profiles (upsert)
  INSERT INTO public.profiles (user_id, full_name, phone, whatsapp, tenant_id)
  VALUES (_patient_id, _full_name, COALESCE(_phone, _whatsapp), COALESCE(_whatsapp, _phone), v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        whatsapp  = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
        tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id),
        updated_at = now()
  RETURNING id INTO v_res_profile_id;

  -- 4. User Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5. User Tenant Access
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (_patient_id, v_tenant_id, 'patient')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  -- 6. Link to Professional
  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', v_initial_journey_status, v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          journey_status = CASE 
            WHEN nutritionist_patients.journey_status IN ('awaiting_payment', 'awaiting_onboarding_release') 
                 AND _source IN ('invite', 'register', 'lead_convert') THEN 'onboarding_active'
            ELSE nutritionist_patients.journey_status 
          END,
          tenant_id = COALESCE(public.nutritionist_patients.tenant_id, EXCLUDED.tenant_id),
          updated_at = now();

    -- 7. Ensure Onboarding Pipeline
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    SELECT _patient_id, _nutritionist_id, 'pending_anamnesis'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_pipelines
      WHERE patient_id = _patient_id
        AND status NOT IN ('completed','archived','superseded_by_active_plan','superseded_by_published_plan','rejected','superseded_by_reset')
    );
  END IF;

  -- 8. Patient Lifecycle State
  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started'::patient_lifecycle_status, _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO UPDATE
  SET has_pending_onboarding = CASE WHEN _nutritionist_id IS NOT NULL THEN true ELSE patient_lifecycle_states.has_pending_onboarding END,
      lifecycle_state = CASE WHEN _nutritionist_id IS NOT NULL THEN 'onboarding_started'::patient_lifecycle_status ELSE patient_lifecycle_states.lifecycle_state END;

  -- 9. Creation Log
  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', _patient_id,
    'nutritionist_id', _nutritionist_id,
    'journey_status', v_initial_journey_status,
    'tenant_id', v_tenant_id
  );
END;
$$;

-- Grant execution to public
GRANT EXECUTE ON FUNCTION public.create_patient_canonical(uuid, text, text, text, uuid, text, jsonb, text) TO anon, authenticated;

-- Create a helper function to fix orphaned patients using active invitations
CREATE OR REPLACE FUNCTION public.fix_orphaned_patient_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reconcile nutritionist_patients for patients who have an active invitation viewed for their email
  -- but no record in nutritionist_patients
  INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
  SELECT 
    i.professional_id,
    p.user_id,
    'active',
    'onboarding_active',
    (SELECT tenant_id FROM public.profiles WHERE user_id = i.professional_id LIMIT 1)
  FROM public.invitations i
  JOIN public.profiles p ON p.full_name ILIKE i.patient_name OR (i.patient_email IS NOT NULL AND p.user_id IN (SELECT id FROM auth.users WHERE email = i.patient_email))
  WHERE i.status IN ('viewed', 'sent')
    AND NOT EXISTS (
      SELECT 1 FROM public.nutritionist_patients np 
      WHERE np.patient_id = p.user_id
    )
    AND p.created_at > now() - interval '1 hour'
  ON CONFLICT DO NOTHING;
END;
$$;
