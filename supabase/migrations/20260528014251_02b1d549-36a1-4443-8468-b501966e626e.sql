-- Melhora a RPC de criação para ser mais resiliente e garantir pipeline
CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text DEFAULT NULL::text,
  _whatsapp text DEFAULT NULL::text,
  _nutritionist_id uuid DEFAULT NULL::uuid,
  _source text DEFAULT 'register'::text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
  v_initial_journey_status text := 'awaiting_consent';
BEGIN
  -- Tenta pegar o tenant do nutricionista
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
      FROM public.user_tenants
     WHERE user_id = _nutritionist_id
       AND is_active = true
     ORDER BY joined_at ASC
     LIMIT 1;
  END IF;

  -- Fallback para qualquer tenant ativo se não achou ou não tem nutri
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 1. Garante Perfil
  INSERT INTO public.profiles (user_id, full_name, phone, whatsapp, tenant_id)
  VALUES (_patient_id, _full_name, COALESCE(_phone, _whatsapp), COALESCE(_whatsapp, _phone), v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        whatsapp  = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
        tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id),
        updated_at = now();

  -- 2. Garante Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Garante Vínculo com Tenant
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (_patient_id, v_tenant_id, 'patient'::public.tenant_role, true)
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET
      role = CASE
        WHEN public.user_tenants.role IN ('owner'::public.tenant_role, 'admin'::public.tenant_role, 'nutritionist'::public.tenant_role, 'personal'::public.tenant_role, 'staff'::public.tenant_role)
          THEN public.user_tenants.role
        ELSE 'patient'::public.tenant_role
      END,
      is_active = true;
  END IF;

  -- 4. Vínculo com Nutricionista e Pipeline
  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', v_initial_journey_status, v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          tenant_id = COALESCE(nutritionist_patients.tenant_id, EXCLUDED.tenant_id),
          journey_status = CASE
            WHEN nutritionist_patients.journey_status IS NULL OR nutritionist_patients.journey_status = 'invited' THEN 'awaiting_consent'
            ELSE nutritionist_patients.journey_status
          END;

    -- Garante que o pipeline exista
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    VALUES (_patient_id, _nutritionist_id, 'pending_anamnesis')
    ON CONFLICT (patient_id) WHERE status NOT IN ('completed','archived','rejected') DO NOTHING;
    
    -- Se já existia mas estava com outro nutri (raro), podemos logar ou ajustar, mas DO NOTHING por segurança de dados.
  END IF;

  -- 5. Lifecycle
  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started', _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO UPDATE SET has_pending_onboarding = EXCLUDED.has_pending_onboarding;

  -- 6. Log
  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
END;
$function$;

-- Melhora a RPC de Onboarding para ser Self-Healing (cura o vínculo se estiver quebrado)
CREATE OR REPLACE FUNCTION public.save_onboarding_data_atomic(
    p_patient_id UUID,
    p_tenant_id UUID,
    p_anamnesis_data JSONB,
    p_pipeline_data JSONB,
    p_profile_data JSONB,
    p_journey_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_anamnesis_id UUID;
    v_result JSONB;
    v_nutri_id UUID;
BEGIN
    -- 1. Upsert na anamnese
    SELECT id INTO v_anamnesis_id 
    FROM public.patient_anamnesis 
    WHERE user_id = p_patient_id 
    AND status IN ('draft', 'completed')
    ORDER BY updated_at DESC 
    LIMIT 1;

    IF v_anamnesis_id IS NOT NULL THEN
        UPDATE public.patient_anamnesis
        SET 
            answers = p_anamnesis_data->'answers',
            computed_tmb = (p_anamnesis_data->>'computed_tmb')::NUMERIC,
            computed_tdee = (p_anamnesis_data->>'computed_tdee')::NUMERIC,
            computed_kcal_target = (p_anamnesis_data->>'computed_kcal_target')::NUMERIC,
            computed_protein = (p_anamnesis_data->>'computed_protein')::NUMERIC,
            computed_carbs = (p_anamnesis_data->>'computed_carbs')::NUMERIC,
            computed_fat = (p_anamnesis_data->>'computed_fat')::NUMERIC,
            status = 'completed',
            updated_at = NOW(),
            tenant_id = p_tenant_id
        WHERE id = v_anamnesis_id;
    ELSE
        INSERT INTO public.patient_anamnesis (
            user_id,
            tenant_id,
            answers,
            computed_tmb,
            computed_tdee,
            computed_kcal_target,
            computed_protein,
            computed_carbs,
            computed_fat,
            status
        ) VALUES (
            p_patient_id,
            p_tenant_id,
            p_anamnesis_data->'answers',
            (p_anamnesis_data->>'computed_tmb')::NUMERIC,
            (p_anamnesis_data->>'computed_tdee')::NUMERIC,
            (p_anamnesis_data->>'computed_kcal_target')::NUMERIC,
            (p_anamnesis_data->>'computed_protein')::NUMERIC,
            (p_anamnesis_data->>'computed_carbs')::NUMERIC,
            (p_anamnesis_data->>'computed_fat')::NUMERIC,
            'completed'
        ) RETURNING id INTO v_anamnesis_id;
    END IF;

    -- 2. Atualizar Perfil
    UPDATE public.profiles
    SET 
        patient_state = (p_profile_data->>'patient_state')::user_state,
        onboarding_completed = (p_profile_data->>'onboarding_completed')::BOOLEAN,
        current_weight_kg = (p_profile_data->>'current_weight_kg')::NUMERIC,
        current_height_cm = (p_profile_data->>'current_height_cm')::NUMERIC,
        goal = p_profile_data->>'goal',
        activity_level = p_profile_data->>'activity_level',
        restrictions = ARRAY(SELECT jsonb_array_elements_text(p_profile_data->'restrictions')),
        preferences = ARRAY(SELECT jsonb_array_elements_text(p_profile_data->'preferences')),
        updated_at = NOW()
    WHERE user_id = p_patient_id;

    -- 3. SELF-HEALING: Se o paciente não tiver vínculo ativo em nutritionist_patients, tentamos reconstruir via tenant
    IF NOT EXISTS (SELECT 1 FROM public.nutritionist_patients WHERE patient_id = p_patient_id AND status = 'active') THEN
        -- Tenta achar o nutricionista dono do tenant
        SELECT user_id INTO v_nutri_id 
        FROM public.user_tenants 
        WHERE tenant_id = p_tenant_id AND role IN ('owner', 'nutritionist') 
        LIMIT 1;

        IF v_nutri_id IS NOT NULL THEN
            INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
            VALUES (v_nutri_id, p_patient_id, 'active', p_journey_status, p_tenant_id)
            ON CONFLICT (nutritionist_id, patient_id) DO UPDATE SET status = 'active', journey_status = p_journey_status;
        END IF;
    ELSE
        UPDATE public.nutritionist_patients
        SET 
            journey_status = p_journey_status,
            updated_at = NOW()
        WHERE patient_id = p_patient_id 
        AND status = 'active';
    END IF;

    -- 4. SELF-HEALING: Garantir Pipeline
    -- Se não existe pipeline, cria um agora
    IF NOT EXISTS (SELECT 1 FROM public.onboarding_pipelines WHERE patient_id = p_patient_id AND status NOT IN ('completed', 'archived')) THEN
        -- Pega o nutri do vínculo que acabamos de garantir ou do existente
        SELECT nutritionist_id INTO v_nutri_id FROM public.nutritionist_patients WHERE patient_id = p_patient_id AND status = 'active' LIMIT 1;
        
        IF v_nutri_id IS NOT NULL THEN
            INSERT INTO public.onboarding_pipelines (
                patient_id, 
                nutritionist_id, 
                status, 
                anamnesis_completed, 
                weight, 
                height
            ) VALUES (
                p_patient_id, 
                v_nutri_id, 
                p_pipeline_data->>'status', 
                (p_pipeline_data->>'anamnesis_completed')::BOOLEAN,
                (p_pipeline_data->>'weight')::NUMERIC,
                (p_pipeline_data->>'height')::NUMERIC
            );
        END IF;
    ELSE
        UPDATE public.onboarding_pipelines
        SET 
            anamnesis_completed = (p_pipeline_data->>'anamnesis_completed')::BOOLEAN,
            status = p_pipeline_data->>'status',
            weight = (p_pipeline_data->>'weight')::NUMERIC,
            height = (p_pipeline_data->>'height')::NUMERIC,
            updated_at = NOW()
        WHERE patient_id = p_patient_id
        AND status NOT IN ('completed', 'archived');
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'anamnesis_id', v_anamnesis_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
