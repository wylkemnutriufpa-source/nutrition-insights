
CREATE OR REPLACE FUNCTION public.classify_and_assign_sovereign_template(p_patient_id UUID, p_pipeline_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pipeline RECORD;
    v_profile RECORD;
    v_template_id UUID;
    v_snapshot JSONB;
    v_kcal_target INTEGER;
    v_objective TEXT;
    v_best_kcal_key TEXT;
    v_result JSONB;
BEGIN
    -- 1. Carregar Pipeline e Perfil
    SELECT * INTO v_pipeline FROM public.onboarding_pipelines WHERE id = p_pipeline_id AND patient_id = p_patient_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pipeline não encontrado.');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_patient_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado.');
    END IF;

    -- 2. Classificação Determinística (Heurística Soberana)
    -- Mapear objetivo do paciente para objetivo do protocolo
    v_objective := CASE 
        WHEN v_profile.goal = 'lose_weight' THEN 'emagrecimento'
        WHEN v_profile.goal = 'gain_muscle' THEN 'hipertrofia'
        WHEN v_profile.goal = 'maintain' THEN 'saude'
        ELSE 'saude'
    END;

    -- Cálculo simplificado de Kcal (Target)
    -- Se tiver peso e altura no pipeline, usamos eles.
    v_kcal_target := CASE 
        WHEN v_objective = 'emagrecimento' THEN (v_pipeline.weight * 22)::INTEGER
        WHEN v_objective = 'hipertrofia' THEN (v_pipeline.weight * 35)::INTEGER
        ELSE (v_pipeline.weight * 28)::INTEGER
    END;

    -- Garantir limites saudáveis
    v_kcal_target := GREATEST(1200, LEAST(4000, v_kcal_target));

    -- 3. Selecionar Protocolo Soberano V3
    -- Busca um protocolo que tenha o objetivo e que tenha o perfil de kcal mais próximo
    SELECT id, plan_snapshot INTO v_template_id, v_snapshot 
    FROM public.v3_diet_templates 
    WHERE objective = v_objective AND active = true
    ORDER BY random() -- Variabilidade entre protocolos do mesmo objetivo
    LIMIT 1;

    IF v_template_id IS NULL THEN
        -- Fallback para saude geral se não achou nada
        SELECT id, plan_snapshot INTO v_template_id, v_snapshot 
        FROM public.v3_diet_templates 
        WHERE objective = 'saude' AND active = true
        LIMIT 1;
    END IF;

    IF v_template_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum protocolo disponível no sistema.');
    END IF;

    -- 4. Escolher o melhor Snapshot de Kcal dentro do Protocolo
    SELECT key INTO v_best_kcal_key
    FROM jsonb_object_keys(v_snapshot) AS key
    ORDER BY ABS(key::INTEGER - v_kcal_target) ASC
    LIMIT 1;

    IF v_best_kcal_key IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Snapshot de calorias não encontrado no protocolo.');
    END IF;

    -- 5. Criar Plano Alimentar (Draft para Revisão Profissional)
    INSERT INTO public.meal_plans (
        patient_id,
        nutritionist_id,
        tenant_id,
        title,
        snapshot,
        total_meta_calorias,
        plan_status,
        is_active,
        editor_version,
        template_id,
        plan_mode
    ) VALUES (
        p_patient_id,
        v_pipeline.nutritionist_id,
        v_profile.tenant_id,
        'Plano Sugerido: ' || (SELECT title FROM public.v3_diet_templates WHERE id = v_template_id),
        v_snapshot->v_best_kcal_key,
        v_best_kcal_key::INTEGER,
        'draft',
        false, -- Começa inativo, aguardando revisão pro
        'v3',
        v_template_id::text,
        'weekly'
    ) RETURNING id INTO v_result;

    -- 6. Atualizar Pipeline
    UPDATE public.onboarding_pipelines 
    SET plan_generated = true, 
        generated_plan_id = v_result,
        status = 'pending_approval'
    WHERE id = p_pipeline_id;

    RETURN jsonb_build_object('success', true, 'plan_id', v_result, 'kcal', v_best_kcal_key);
END;
$$;
