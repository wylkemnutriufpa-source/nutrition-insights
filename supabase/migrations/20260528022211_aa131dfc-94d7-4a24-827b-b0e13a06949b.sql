-- 1. Criar função de fallback por kcal que estava faltando
CREATE OR REPLACE FUNCTION public.select_sovereign_template_by_kcal(p_kcal_target integer)
 RETURNS TABLE(template_id uuid, best_kcal_key text, template_title text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as template_id,
    'base' as best_kcal_key,
    t.title as template_title
  FROM public.v3_diet_templates t
  WHERE t.active = true
    AND t.plan_snapshot IS NOT NULL
  ORDER BY ABS((t.kcal_range_min + t.kcal_range_max)/2 - p_kcal_target) ASC
  LIMIT 1;
END;
$function$;

-- 2. Corrigir a função principal para usar os campos e tabelas corretos (v3_diet_templates / plan_snapshot)
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
    30 -- fallback
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

  -- ── 7. Capturar Snapshot do Template (v3_diet_templates.plan_snapshot) 
  SELECT plan_snapshot INTO v_snapshot_raw
  FROM public.v3_diet_templates
  WHERE id = v_template.template_id;

  IF v_snapshot_raw IS NULL OR v_snapshot_raw = '{}'::jsonb THEN
     RETURN jsonb_build_object('success', false, 'error', 'Snapshot do template não disponível.');
  END IF;

  -- ── 8. Atribuir Plano ao Paciente ───────────────────────────────────
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
    'Plano gerado via Motor Soberano V3.',
    v_kcal_target,
    (v_snapshot_raw->'macros'->>'protein')::NUMERIC,
    (v_snapshot_raw->'macros'->>'carbs')::NUMERIC,
    (v_snapshot_raw->'macros'->>'fats')::NUMERIC,
    v_snapshot_raw->'meals',
    TRUE,
    v_template.template_id,
    jsonb_build_object(
      'generated_at', now(),
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
    'kcal', v_kcal_target
  );
END;
$function$;
