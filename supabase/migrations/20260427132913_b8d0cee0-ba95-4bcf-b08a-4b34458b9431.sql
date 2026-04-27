CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text DEFAULT NULL::text,
  _nutritionist_id uuid DEFAULT NULL::uuid,
  _source text DEFAULT 'register'::text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _whatsapp text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
  v_initial_journey_status text := 'awaiting_payment';
BEGIN
  IF _patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id obrigatório (criar auth.users via GoTrue antes)';
  END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name obrigatório';
  END IF;
  IF _source NOT IN ('invite','import','register','lead_convert','admin','migration_backfill') THEN
    RAISE EXCEPTION 'source inválido: %', _source;
  END IF;

  -- Se for registro via link (invite ou register), o onboarding deve estar ativo imediatamente
  IF _source IN ('invite', 'register') THEN
    v_initial_journey_status := 'onboarding_active';
  END IF;

  -- Resolver tenant
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_tenants
    WHERE user_id = _nutritionist_id
    ORDER BY joined_at ASC NULLS LAST LIMIT 1;
  END IF;

  -- 1. Profile (upsert)
  INSERT INTO public.profiles (user_id, full_name, phone, tenant_id)
  VALUES (_patient_id, _full_name, COALESCE(_whatsapp, _phone), v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  -- 2. Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Tenant link
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (_patient_id, v_tenant_id, 'patient')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  -- 4. Vínculo nutricionista
  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', v_initial_journey_status, v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          journey_status = CASE 
            WHEN nutritionist_patients.journey_status = 'awaiting_payment' AND _source IN ('invite', 'register') THEN 'onboarding_active'
            ELSE nutritionist_patients.journey_status 
          END,
          tenant_id = COALESCE(public.nutritionist_patients.tenant_id, EXCLUDED.tenant_id);

    -- 5. Pipeline de onboarding
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    SELECT _patient_id, _nutritionist_id, 'pending_anamnesis'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_pipelines
      WHERE patient_id = _patient_id
        AND status NOT IN ('completed','archived','superseded_by_active_plan','superseded_by_published_plan','rejected','superseded_by_reset')
    );
  END IF;

  -- 6. Lifecycle OBRIGATÓRIO
  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started'::patient_lifecycle_status, _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO UPDATE
  SET has_pending_onboarding = CASE WHEN _nutritionist_id IS NOT NULL THEN true ELSE patient_lifecycle_states.has_pending_onboarding END,
      lifecycle_state = CASE WHEN _nutritionist_id IS NOT NULL THEN 'onboarding_started'::patient_lifecycle_status ELSE patient_lifecycle_states.lifecycle_state END;

  -- 7. Log de origem
  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', _patient_id,
    'tenant_id', v_tenant_id,
    'nutritionist_linked', _nutritionist_id IS NOT NULL,
    'source', _source,
    'journey_status', v_initial_journey_status
  );
END;
$function$;