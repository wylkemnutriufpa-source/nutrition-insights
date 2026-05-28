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
  v_snapshot_raw  JSONB;
  v_snapshot_full JSONB;
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
  -- Hierarquia: anamnese > pipeline > perfil > fallback seguro
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

  -- Fallback seguro para idade se date_of_birth não existir no profiles (como é o caso atual)
  v_age := COALESCE(
    (v_anamnesis->>'age')::INTEGER,
    30 -- fallback padrão
  );

  -- Fallback seguro para sexo
  v_sex := COALESCE(
    v_anamnesis->>'sex',
    v_anamnesis->>'gender',
    'female'  -- fallback conservador (TMB menor = mais seguro)
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

  -- Arrays de restrições e condições
  v_dietary_restrictions := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'dietary_restrictions')),
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'dietary_strategy')),
    ARRAY[]::text[]
  );

  v_health_conditions := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'health_conditions')),
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'clinical_history')),
    ARRAY[]::text[]
  );

  v_allergies := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_anamnesis->'allergies')),
    ARRAY[]::text[]
  );

  -- Combinar alergias com restrições alimentares
  v_dietary_restrictions := v_dietary_restrictions || v_allergies;

  -- ── 5. Calcular Meta Metabólica — Mifflin-St Jeor Real ───────────────
  v_metabolic := public.calculate_clinical_kcal_target(
    v_weight, v_height, v_age, v_sex, v_activity, v_goal
  );

  v_kcal_target := (v_metabolic->>'kcal')::INTEGER;

  -- ── 6. Selecionar Template Soberano — Matching Determinístico ─────────
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

  -- Fallback: se nenhum template passou no matching clínico, pegar o mais próximo por kcal
  IF v_template.template_id IS NULL THEN
    SELECT mt.template_id, mt.best_kcal_key, mt.template_title
    INTO v_template
    FROM public.select_sovereign_template_by_kcal(v_kcal_target) mt;
  END IF;

  IF v_template.template_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum template compatível encontrado.');
  END IF;

  -- ── 7. Capturar Snapshot do Template Selecionado ──────────────────────
  SELECT snapshot INTO v_snapshot_raw
  FROM public.nutrition_protocols
  WHERE id = v_template.template_id;

  -- Se o snapshot principal não existir, tentar montar um
  IF v_snapshot_raw IS NULL OR v_snapshot_raw = '{}'::jsonb THEN
     -- Tenta buscar o snapshot específico para a chave de kcal
     SELECT snapshot INTO v_snapshot_raw
     FROM public.protocol_kcal_variants
     WHERE protocol_id = v_template.template_id AND kcal_key = v_template.best_kcal_key;
  END IF;

  IF v_snapshot_raw IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'Snapshot do template não disponível.');
  END IF;

  -- ── 8. Atribuir Plano ao Paciente (Atomicamente) ─────────────────────
  -- Criar o registro em meal_plans baseado no snapshot
  INSERT INTO public.meal_plans (
    patient_id,
    nutritionist_id,
    title,
    description,
    kcal_target,
    macro_protein,
    macro_carbs,
    macro_fats,
    meals_data,
    is_active,
    source_protocol_id,
    metadata
  )
  VALUES (
    p_patient_id,
    v_pipeline.nutritionist_id,
    v_template.template_title,
    'Plano gerado automaticamente via Motor Soberano.',
    v_kcal_target,
    (v_snapshot_raw->'macros'->>'protein')::NUMERIC,
    (v_snapshot_raw->'macros'->>'carbs')::NUMERIC,
    (v_snapshot_raw->'macros'->>'fats')::NUMERIC,
    v_snapshot_raw->'meals',
    TRUE,
    v_template.template_id,
    jsonb_build_object(
      'generated_at', now(),
      'kcal_key', v_template.best_kcal_key,
      'metabolic_data', v_metabolic,
      'pipeline_id', p_pipeline_id
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

  -- ── 10. Atualizar Perfil (Sync Clínico) ──────────────────────────────
  UPDATE public.profiles
  SET 
    patient_state = 'active_plan',
    clinical_assessment_completed = TRUE
  WHERE user_id = p_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', v_plan_id,
    'template_id', v_template.template_id,
    'kcal', v_kcal_target
  );
END;
$function$;