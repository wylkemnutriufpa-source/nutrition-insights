CREATE OR REPLACE FUNCTION public.classify_and_assign_sovereign_template(p_patient_id uuid, p_pipeline_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pipeline      RECORD;
  v_profile       RECORD;
  v_anamnesis     JSONB;
  v_metabolic     JSONB;
  v_template      RECORD;
  v_snapshot_full JSONB;
  v_snapshot_final JSONB;
  v_plan_id       UUID;

  -- Dados clínicos extraídos da anamnese
  v_weight     NUMERIC;
  v_height     NUMERIC;
  v_age        INTEGER;
  v_sex        TEXT;
  v_activity   TEXT;
  v_goal       TEXT;
  v_dietary_restrictions TEXT[];
  v_health_conditions    TEXT[];
  v_allergies            TEXT[];
  v_kcal_target          INTEGER;
  v_kcal_key             TEXT;
BEGIN
  -- ── 1. Carregar Pipeline ──────────────────────────────────────────────
  SELECT * INTO v_pipeline
  FROM public.onboarding_pipelines
  WHERE id = p_pipeline_id AND patient_id = p_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pipeline não encontrado.');
  END IF;

  -- ── 2. Carregar Perfil ────────────────────────────────────────────────
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado.');
  END IF;

  -- ── 3. Carregar Anamnese Clínica (answers JSONB) ──────────────────────
  SELECT answers INTO v_anamnesis
  FROM public.patient_anamnesis
  WHERE user_id = p_patient_id AND status = 'completed'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- ── 4. Extrair Dados Clínicos da Anamnese ────────────────────────────
  v_weight := COALESCE(
    (v_anamnesis->>'weight')::NUMERIC,
    (v_anamnesis->>'current_weight')::NUMERIC,
    v_pipeline.weight,
    (v_profile.current_weight_kg)::NUMERIC,
    70
  );

  v_height := COALESCE(
    (v_anamnesis->>'height')::NUMERIC,
    (v_anamnesis->>'current_height')::NUMERIC,
    v_pipeline.height,
    (v_profile.current_height_cm)::NUMERIC,
    170
  );

  v_age := COALESCE(
    (v_anamnesis->>'age')::INTEGER,
    30 
  );

  v_sex := COALESCE(
    v_anamnesis->>'sex',
    v_anamnesis->>'gender',
    'female'
  );

  v_activity := COALESCE(
    v_anamnesis->>'activity_level',
    v_anamnesis->>'physical_activity',
    v_profile.activity_level,
    'light'
  );

  v_goal := COALESCE(
    v_anamnesis->>'goal',
    v_anamnesis->>'objective',
    v_profile.goal,
    'maintain'
  );

  v_dietary_restrictions := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'dietary_restrictions')),
    ARRAY[]::text[]
  );

  v_health_conditions := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'health_conditions')),
    ARRAY[]::text[]
  );

  v_allergies := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'allergies')),
    ARRAY[]::text[]
  );

  v_dietary_restrictions := v_dietary_restrictions || v_allergies;

  -- ── 5. Calcular Meta Metabólica ──────────────────────────────────────
  v_metabolic := public.calculate_clinical_kcal_target(
    v_weight, v_height, v_age, v_sex, v_activity, v_goal
  );

  v_kcal_target := (v_metabolic->>'kcal')::INTEGER;

  -- ── 6. Selecionar Template Soberano ──────────────────────────────────
  SELECT mt.template_id, mt.best_kcal_key, mt.template_title
  INTO v_template
  FROM public.select_sovereign_template(
    v_goal,
    v_kcal_target,
    v_sex,
    v_activity,
    v_dietary_restrictions,
    v_health_conditions
  ) mt;

  -- Fallback manual se o matching clínico falhar
  IF v_template.template_id IS NULL THEN
    SELECT mt.template_id, mt.best_kcal_key, mt.template_title
    INTO v_template
    FROM public.select_sovereign_template_by_kcal(v_kcal_target) mt;
  END IF;

  IF v_template.template_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum template compatível encontrado.');
  END IF;

  -- ── 7. Capturar e Purificar Snapshot (v3_diet_templates.plan_snapshot) 
  SELECT plan_snapshot INTO v_snapshot_full
  FROM public.v3_diet_templates
  WHERE id = v_template.template_id;

  IF v_snapshot_full IS NULL OR v_snapshot_full = '{}'::jsonb THEN
     RETURN jsonb_build_object('success', false, 'error', 'Snapshot do template não disponível.');
  END IF;

  -- 🛡️ PURIFICAÇÃO SOBERANA: Se o snapshot for um Record de Calorias, extrair a chave correta
  v_kcal_key := v_template.best_kcal_key;
  
  -- Tentar extrair o snapshot específico pela chave de kcal (ex: "1200")
  IF v_snapshot_full ? v_kcal_key THEN
    v_snapshot_final := v_snapshot_full->v_kcal_key;
  ELSE
    -- Se não encontrar a chave exata, pegar a primeira chave disponível como fallback
    v_snapshot_final := v_snapshot_full->(SELECT (jsonb_object_keys(v_snapshot_full))[1] LIMIT 1);
  END IF;

  -- Se após a tentativa de extração ainda não tivermos a estrutura V3 (com days ou meals)
  IF NOT (v_snapshot_final ? 'days' OR v_snapshot_final ? 'meals') THEN
    -- Fallback final: usar o snapshot bruto (pode ser um snapshot sem aninhamento)
    v_snapshot_final := v_snapshot_full;
  END IF;

  -- ── 8. Atribuir Plano ao Paciente ───────────────────────────────────
  INSERT INTO public.meal_plans (
    patient_id,
    nutritionist_id,
    title,
    description,
    total_meta_calorias,
    total_meta_proteinas,
    total_meta_carboidratos,
    total_meta_gorduras,
    snapshot,
    is_active,
    template_id,
    editor_version,
    start_date,
    generation_metadata
  )
  VALUES (
    p_patient_id,
    v_pipeline.nutritionist_id,
    v_template.template_title,
    'Plano gerado via Motor Soberano V3.',
    v_kcal_target,
    COALESCE((v_snapshot_final->'macros'->>'protein')::NUMERIC, (v_metabolic->>'protein_g')::NUMERIC, 0),
    COALESCE((v_snapshot_final->'macros'->>'carbs')::NUMERIC, (v_metabolic->>'carbs_g')::NUMERIC, 0),
    COALESCE((v_snapshot_final->'macros'->>'fats')::NUMERIC, (v_metabolic->>'fat_g')::NUMERIC, 0),
    v_snapshot_final,
    TRUE,
    v_template.template_id,
    'v3',
    CURRENT_DATE,
    jsonb_build_object(
      'generated_at', now(),
      'metabolic_data', v_metabolic,
      'pipeline_id', p_pipeline_id,
      'kcal_key_used', v_kcal_key
    )
  )
  RETURNING id INTO v_plan_id;

  -- ── 9. Atualizar Pipeline ───────────────────────────────────────────
  UPDATE public.onboarding_pipelines
  SET 
    plan_generated = TRUE,
    generated_plan_id = v_plan_id,
    status = 'completed',
    updated_at = now()
  WHERE id = p_pipeline_id;

  -- ── 10. Atualizar Perfil ────────────────────────────────────────────
  UPDATE public.profiles
  SET 
    patient_state = 'active_plan',
    clinical_assessment_completed = TRUE
  WHERE user_id = p_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', v_plan_id,
    'template_id', v_template.template_id,
    'template_title', v_template.template_title,
    'kcal_calculated', v_kcal_target
  );
END;
$function$;
