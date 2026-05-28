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
BEGIN
    -- 1. Upsert na anamnese (Idempotência)
    -- Se já existir um registro 'draft' ou 'completed' para este usuário, atualizamos.
    -- O frontend passa o ID se tiver (draftId), mas aqui buscamos preventivamente.
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

    -- 2. Atualizar Perfil (Estado Canônico)
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

    -- 3. Sincronizar Jornada no Nutricionista
    UPDATE public.nutritionist_patients
    SET 
        journey_status = p_journey_status,
        updated_at = NOW()
    WHERE patient_id = p_patient_id 
    AND status = 'active';

    -- 4. Finalizar Pipeline (Commit Lógico)
    UPDATE public.onboarding_pipelines
    SET 
        anamnesis_completed = (p_pipeline_data->>'anamnesis_completed')::BOOLEAN,
        status = p_pipeline_data->>'status',
        weight = (p_pipeline_data->>'weight')::NUMERIC,
        height = (p_pipeline_data->>'height')::NUMERIC,
        updated_at = NOW()
    WHERE patient_id = p_patient_id
    AND status NOT IN ('completed', 'archived');

    v_result := jsonb_build_object(
        'success', true,
        'anamnesis_id', v_anamnesis_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- O rollback é automático em funções PL/pgSQL
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_onboarding_data_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_data_atomic TO service_role;
