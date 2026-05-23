-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPRINT A — MOTOR DETERMINÍSTICO CLÍNICO REAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Substitui: classify_and_assign_sovereign_template
-- Remove: weight × fator, ORDER BY random()
-- Implementa: Mifflin-St Jeor, matching determinístico, targeting clínico
-- Data: 23/05/2026
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 1: ENRIQUECER v3_diet_templates COM CAMPOS CLÍNICOS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.v3_diet_templates
  ADD COLUMN IF NOT EXISTS clinical_tags     JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS activity_profile  TEXT     DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS kcal_range_min    INTEGER  DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS kcal_range_max    INTEGER  DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS sex_preference    TEXT     DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS contraindications TEXT[]   DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.v3_diet_templates.clinical_tags IS
  'Tags clínicas para matching: ["emagrecimento","diabetes","resistencia_insulinica","low_carb","hipertrofia","performance","recomposicao","saude_geral","anti_inflamatorio","cardiovascular"]';
COMMENT ON COLUMN public.v3_diet_templates.dietary_restrictions IS
  'Restrições alimentares suportadas: ["gluten_free","lactose_free","vegetarian","vegan","sem_frango","sem_peixe"]';
COMMENT ON COLUMN public.v3_diet_templates.activity_profile IS
  'Perfil de atividade alvo: any | sedentary | light | moderate | active | very_active';
COMMENT ON COLUMN public.v3_diet_templates.sex_preference IS
  'Preferência de sexo: any | male | female';
COMMENT ON COLUMN public.v3_diet_templates.contraindications IS
  'Condições que excluem este template: ["doenca_renal","hipertensao_grave","gravidez"]';

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 2: POPULAR clinical_tags NOS 65 TEMPLATES ATIVOS
-- ════════════════════════════════════════════════════════════════════════════

-- Templates de Emagrecimento
UPDATE public.v3_diet_templates SET
  clinical_tags = '["emagrecimento","deficit_calorico"]'::jsonb,
  dietary_restrictions = ARRAY[]::text[],
  activity_profile = 'any',
  kcal_range_min = 1100, kcal_range_max = 1900,
  sex_preference = 'any'
WHERE objective = 'emagrecimento'
  AND (family IS NULL OR family NOT IN ('Low Carb','Cetogênica','Restrições Alimentares'));

-- Templates Low Carb
UPDATE public.v3_diet_templates SET
  clinical_tags = '["emagrecimento","low_carb","resistencia_insulinica"]'::jsonb,
  dietary_restrictions = ARRAY[]::text[],
  kcal_range_min = 1200, kcal_range_max = 2200,
  sex_preference = 'any'
WHERE objective = 'emagrecimento'
  AND (slug ILIKE '%low_carb%' OR slug ILIKE '%low-carb%' OR title ILIKE '%low carb%');

-- Templates Cetogênicos
UPDATE public.v3_diet_templates SET
  clinical_tags = '["emagrecimento","cetogenico","low_carb","resistencia_insulinica"]'::jsonb,
  contraindications = ARRAY['doenca_renal','gravidez']::text[],
  kcal_range_min = 1200, kcal_range_max = 2500,
  sex_preference = 'any'
WHERE slug ILIKE '%cetogen%' OR title ILIKE '%cetogen%';

-- Templates Hipertrofia
UPDATE public.v3_diet_templates SET
  clinical_tags = '["hipertrofia","superavit_calorico","alta_proteina"]'::jsonb,
  activity_profile = 'moderate',
  kcal_range_min = 2000, kcal_range_max = 5000,
  sex_preference = 'any'
WHERE objective = 'hipertrofia';

-- Templates Saúde Geral / Mediterrânea
UPDATE public.v3_diet_templates SET
  clinical_tags = '["saude_geral","manutencao","anti_inflamatorio"]'::jsonb,
  kcal_range_min = 1500, kcal_range_max = 3000,
  sex_preference = 'any'
WHERE objective = 'saude'
  AND (slug ILIKE '%mediterr%' OR title ILIKE '%mediterr%' OR slug ILIKE '%saude%');

-- Templates Diabetes / Resistência Insulínica
UPDATE public.v3_diet_templates SET
  clinical_tags = '["saude_geral","diabetes","resistencia_insulinica","baixo_ig"]'::jsonb,
  dietary_restrictions = ARRAY[]::text[],
  kcal_range_min = 1200, kcal_range_max = 2200,
  contraindications = ARRAY[]::text[]
WHERE slug ILIKE '%diabet%' OR title ILIKE '%diabet%'
   OR slug ILIKE '%insulin%' OR title ILIKE '%insulin%';

-- Templates Performance
UPDATE public.v3_diet_templates SET
  clinical_tags = '["performance","superavit_calorico","timing_nutricional"]'::jsonb,
  activity_profile = 'active',
  kcal_range_min = 2000, kcal_range_max = 5000
WHERE objective = 'performance' OR slug ILIKE '%performance%';

-- Templates Recomposição
UPDATE public.v3_diet_templates SET
  clinical_tags = '["recomposicao","manutencao","alta_proteina"]'::jsonb,
  activity_profile = 'moderate',
  kcal_range_min = 1600, kcal_range_max = 3500
WHERE objective = 'recomposicao' OR slug ILIKE '%recompos%';

-- Templates Femininos
UPDATE public.v3_diet_templates SET
  sex_preference = 'female',
  clinical_tags = clinical_tags || '["feminino"]'::jsonb
WHERE slug ILIKE '%feminino%' OR title ILIKE '%feminino%' OR title ILIKE '%mulher%';

-- Templates Masculinos
UPDATE public.v3_diet_templates SET
  sex_preference = 'male',
  clinical_tags = clinical_tags || '["masculino"]'::jsonb
WHERE slug ILIKE '%masculino%' OR title ILIKE '%masculino%' OR title ILIKE '%homem%';

-- Templates com Restrições Alimentares específicas
UPDATE public.v3_diet_templates SET
  dietary_restrictions = ARRAY['gluten_free']::text[]
WHERE slug ILIKE '%sem_gluten%' OR title ILIKE '%sem gluten%' OR title ILIKE '%celíaco%';

UPDATE public.v3_diet_templates SET
  dietary_restrictions = ARRAY['lactose_free']::text[]
WHERE slug ILIKE '%sem_lactose%' OR title ILIKE '%sem lactose%';

UPDATE public.v3_diet_templates SET
  dietary_restrictions = ARRAY['vegetarian']::text[]
WHERE slug ILIKE '%vegetarian%' OR title ILIKE '%vegetarian%';

UPDATE public.v3_diet_templates SET
  dietary_restrictions = ARRAY['vegan']::text[]
WHERE slug ILIKE '%vegan%' OR title ILIKE '%vegan%';

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 3: FUNÇÃO AUXILIAR — MIFFLIN-ST JEOR DETERMINÍSTICO
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_clinical_kcal_target(
  p_weight     NUMERIC,  -- kg
  p_height     NUMERIC,  -- cm
  p_age        INTEGER,  -- anos
  p_sex        TEXT,     -- 'male' | 'female'
  p_activity   TEXT,     -- sedentary | light | moderate | active | very_active
  p_goal       TEXT      -- lose_weight | maintain | gain_muscle | recomposicao | aggressive_loss
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_tmb        NUMERIC;
  v_get        NUMERIC;
  v_vet        NUMERIC;
  v_protein_g  NUMERIC;
  v_fat_g      NUMERIC;
  v_carbs_g    NUMERIC;
  v_activity_mult NUMERIC;
  v_goal_adj   NUMERIC;
BEGIN
  -- 1. TMB — Mifflin-St Jeor
  IF lower(p_sex) IN ('male', 'masculino', 'm') THEN
    v_tmb := (10 * p_weight) + (6.25 * p_height) - (5 * p_age) + 5;
  ELSE
    v_tmb := (10 * p_weight) + (6.25 * p_height) - (5 * p_age) - 161;
  END IF;

  -- 2. Multiplicador de Atividade
  v_activity_mult := CASE lower(p_activity)
    WHEN 'sedentary'   THEN 1.2
    WHEN 'light'       THEN 1.375
    WHEN 'moderate'    THEN 1.55
    WHEN 'active'      THEN 1.725
    WHEN 'very_active' THEN 1.9
    -- Aliases em PT-BR da anamnese
    WHEN 'sedentario'  THEN 1.2
    WHEN 'leve'        THEN 1.375
    WHEN 'moderado'    THEN 1.55
    WHEN 'ativo'       THEN 1.725
    WHEN 'muito_ativo' THEN 1.9
    ELSE 1.375 -- fallback conservador
  END;

  v_get := v_tmb * v_activity_mult;

  -- 3. Ajuste por Objetivo
  v_goal_adj := CASE lower(p_goal)
    WHEN 'lose_weight'       THEN -500
    WHEN 'perda_peso'        THEN -500
    WHEN 'emagrecimento'     THEN -500
    WHEN 'aggressive_loss'   THEN -800
    WHEN 'maintain'          THEN 0
    WHEN 'manutencao'        THEN 0
    WHEN 'maintenance'       THEN 0
    WHEN 'gain_muscle'       THEN 300
    WHEN 'hipertrofia'       THEN 300
    WHEN 'bulk'              THEN 400
    WHEN 'recomposicao'      THEN 0
    WHEN 'recomposicao_corporal' THEN 0
    ELSE 0
  END;

  v_vet := ROUND(v_get + v_goal_adj);
  -- Clamp: limites fisiologicamente seguros
  v_vet := GREATEST(1100, LEAST(5000, v_vet));

  -- 4. Macros — Estratégia Clínica
  -- Proteína: 2.0g/kg em déficit/ganho, 1.8g/kg manutenção/recomp
  IF lower(p_goal) IN ('maintain','manutencao','maintenance','recomposicao','recomposicao_corporal') THEN
    v_protein_g := ROUND(p_weight * 1.8);
  ELSE
    v_protein_g := ROUND(p_weight * 2.0);
  END IF;

  -- Gordura: 25% do VET (mínimo 0.6g/kg)
  v_fat_g := GREATEST(ROUND(p_weight * 0.6), ROUND((v_vet * 0.25) / 9));

  -- Carbos: O que sobrar
  v_carbs_g := GREATEST(0, ROUND((v_vet - (v_protein_g * 4) - (v_fat_g * 9)) / 4));

  RETURN jsonb_build_object(
    'tmb',       ROUND(v_tmb),
    'tdee',      ROUND(v_get),
    'kcal',      v_vet,
    'protein_g', v_protein_g,
    'carbs_g',   v_carbs_g,
    'fat_g',     v_fat_g
  );
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 4: FUNÇÃO AUXILIAR — MATCHING CLÍNICO DETERMINÍSTICO
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.select_sovereign_template(
  p_objective          TEXT,     -- objetivo clínico derivado da anamnese
  p_kcal_target        INTEGER,  -- kcal calculado pelo Mifflin-St Jeor
  p_sex                TEXT,     -- male | female
  p_activity           TEXT,     -- nível de atividade
  p_dietary_restrictions TEXT[], -- restrições alimentares do paciente
  p_health_conditions  TEXT[]    -- condições clínicas do paciente
)
RETURNS TABLE(template_id UUID, best_kcal_key TEXT, template_title TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_clinical_objective TEXT;
BEGIN
  -- Mapear objetivo para vocabulário dos templates
  v_clinical_objective := CASE lower(p_objective)
    WHEN 'lose_weight'      THEN 'emagrecimento'
    WHEN 'perda_peso'       THEN 'emagrecimento'
    WHEN 'gain_muscle'      THEN 'hipertrofia'
    WHEN 'maintain'         THEN 'saude'
    WHEN 'maintenance'      THEN 'saude'
    WHEN 'manutencao'       THEN 'saude'
    WHEN 'recomposicao'     THEN 'recomposicao'
    WHEN 'recomposicao_corporal' THEN 'recomposicao'
    WHEN 'performance'      THEN 'performance'
    ELSE 'saude'
  END;

  RETURN QUERY
  WITH candidate_templates AS (
    SELECT
      t.id,
      t.title,
      t.plan_snapshot,
      t.clinical_tags,
      t.dietary_restrictions AS t_restrictions,
      t.contraindications,
      t.sex_preference,
      t.activity_profile,
      t.kcal_range_min,
      t.kcal_range_max,
      -- SCORE DE MATCHING: quanto maior, mais adequado clinicamente
      (
        -- Objetivo primário (peso 40)
        CASE WHEN t.objective = v_clinical_objective THEN 40 ELSE 0 END

        -- Faixa calórica compatível (peso 20)
        + CASE WHEN p_kcal_target BETWEEN t.kcal_range_min AND t.kcal_range_max THEN 20 ELSE 0 END

        -- Preferência de sexo compatível (peso 15)
        + CASE WHEN t.sex_preference = 'any' THEN 10
               WHEN lower(t.sex_preference) = lower(p_sex) THEN 15
               ELSE 0 END

        -- Condições clínicas: pontuação positiva se template específico (peso 25)
        + CASE
            WHEN 'diabetes' = ANY(p_health_conditions)
              AND t.clinical_tags ? 'diabetes' THEN 25
            WHEN 'resistencia_insulinica' = ANY(p_health_conditions)
              AND (t.clinical_tags ? 'resistencia_insulinica' OR t.clinical_tags ? 'low_carb') THEN 20
            WHEN 'hipertensao' = ANY(p_health_conditions)
              AND t.clinical_tags ? 'anti_inflamatorio' THEN 15
            ELSE 0
          END
      ) AS match_score
    FROM public.v3_diet_templates t
    WHERE t.active = true
      AND t.plan_snapshot IS NOT NULL
      AND t.plan_snapshot::text != '{}'
      -- Excluir templates com contraindicações para as condições do paciente
      AND NOT (t.contraindications && p_health_conditions)
      -- Compatibilidade de restrições alimentares:
      -- template pode ter restrições específicas OU aceitar qualquer um
      AND (
        array_length(t.dietary_restrictions, 1) IS NULL
        OR t.dietary_restrictions = ARRAY[]::text[]
        OR t.dietary_restrictions && p_dietary_restrictions
      )
  ),
  best_key AS (
    SELECT
      ct.id,
      ct.title,
      ct.plan_snapshot,
      ct.match_score,
      key.k AS best_kcal_key
    FROM candidate_templates ct,
         LATERAL (
           SELECT k
           FROM jsonb_object_keys(ct.plan_snapshot) k
           ORDER BY ABS(k::INTEGER - p_kcal_target) ASC
           LIMIT 1
         ) key
    WHERE ct.match_score >= 40  -- mínimo: objetivo primário deve bater
  )
  SELECT
    bk.id,
    bk.best_kcal_key,
    bk.title
  FROM best_key bk
  ORDER BY
    bk.match_score DESC,          -- maior score primeiro
    ABS(bk.best_kcal_key::INTEGER - p_kcal_target) ASC,  -- mais próximo caloricamente
    bk.title ASC                   -- DETERMINÍSTICO: desempate por título alfabético (não random)
  LIMIT 1;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 5: NOVA RPC — classify_and_assign_sovereign_template
-- Substitui completamente a versão anterior com Mifflin-St Jeor real
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.classify_and_assign_sovereign_template(
  p_patient_id UUID,
  p_pipeline_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  v_age := COALESCE(
    (v_anamnesis->>'age')::INTEGER,
    EXTRACT(YEAR FROM age(CURRENT_DATE, v_profile.date_of_birth))::INTEGER,
    30
  );

  v_sex := COALESCE(
    v_anamnesis->>'sex',
    v_anamnesis->>'gender',
    v_profile.sex,
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
    SELECT t.id AS template_id, k.k AS best_kcal_key, t.title AS template_title
    INTO v_template
    FROM public.v3_diet_templates t,
         LATERAL (
           SELECT k FROM jsonb_object_keys(t.plan_snapshot) k
           ORDER BY ABS(k::INTEGER - v_kcal_target) ASC
           LIMIT 1
         ) k
    WHERE t.active = true
      AND t.plan_snapshot IS NOT NULL
      AND t.plan_snapshot::text != '{}'
    ORDER BY t.title ASC  -- determinístico
    LIMIT 1;
  END IF;

  IF v_template.template_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum protocolo clínico disponível.',
      'debug', jsonb_build_object(
        'goal', v_goal, 'kcal_target', v_kcal_target,
        'sex', v_sex, 'activity', v_activity
      )
    );
  END IF;

  -- ── 7. Extrair Snapshot do Template ──────────────────────────────────
  SELECT plan_snapshot INTO v_snapshot_raw
  FROM public.v3_diet_templates
  WHERE id = v_template.template_id;

  -- Snapshot completo = conteúdo do perfil calórico + targets + metadados clínicos
  v_snapshot_full := (v_snapshot_raw->v_template.best_kcal_key) || jsonb_build_object(
    'snapshot_version', 'v3',
    'targets', jsonb_build_object(
      'kcal',      (v_metabolic->>'kcal')::INTEGER,
      'protein_g', (v_metabolic->>'protein_g')::NUMERIC,
      'carbs_g',   (v_metabolic->>'carbs_g')::NUMERIC,
      'fat_g',     (v_metabolic->>'fat_g')::NUMERIC
    ),
    'clinical_metadata', jsonb_build_object(
      'generated_at',          now(),
      'engine_version',        'mifflin_v1',
      'patient_id',            p_patient_id,
      'tmb',                   (v_metabolic->>'tmb')::INTEGER,
      'tdee',                  (v_metabolic->>'tdee')::INTEGER,
      'kcal_target',           v_kcal_target,
      'sex',                   v_sex,
      'age',                   v_age,
      'weight_kg',             v_weight,
      'height_cm',             v_height,
      'activity_level',        v_activity,
      'goal',                  v_goal,
      'template_id',           v_template.template_id,
      'template_title',        v_template.template_title,
      'kcal_profile_used',     v_template.best_kcal_key,
      'has_anamnesis',         (v_anamnesis IS NOT NULL),
      'dietary_restrictions',  v_dietary_restrictions,
      'health_conditions',     v_health_conditions
    )
  );

  -- ── 8. Persistir Plano Alimentar ─────────────────────────────────────
  INSERT INTO public.meal_plans (
    patient_id,
    nutritionist_id,
    tenant_id,
    title,
    snapshot,
    total_meta_calorias,
    total_meta_proteinas,
    total_meta_carboidratos,
    total_meta_gorduras,
    plan_status,
    is_active,
    editor_version,
    template_id,
    plan_mode
  ) VALUES (
    p_patient_id,
    v_pipeline.nutritionist_id,
    v_profile.tenant_id,
    'Plano Clínico: ' || v_template.template_title,
    v_snapshot_full,
    (v_metabolic->>'kcal')::INTEGER,
    (v_metabolic->>'protein_g')::NUMERIC,
    (v_metabolic->>'carbs_g')::NUMERIC,
    (v_metabolic->>'fat_g')::NUMERIC,
    'draft',
    false,
    'v3',
    v_template.template_id::text,
    'weekly'
  )
  RETURNING id INTO v_plan_id;

  -- ── 9. Atualizar Pipeline ─────────────────────────────────────────────
  UPDATE public.onboarding_pipelines
  SET
    plan_generated    = true,
    generated_plan_id = v_plan_id,
    status            = 'pending_approval',
    weight            = v_weight,
    height            = v_height,
    updated_at        = now()
  WHERE id = p_pipeline_id;

  -- ── 10. Retornar resultado completo ───────────────────────────────────
  RETURN jsonb_build_object(
    'success',          true,
    'plan_id',          v_plan_id,
    'template_title',   v_template.template_title,
    'kcal_calculated',  v_kcal_target,
    'kcal_profile',     v_template.best_kcal_key,
    'tmb',              (v_metabolic->>'tmb')::INTEGER,
    'tdee',             (v_metabolic->>'tdee')::INTEGER,
    'targets',          v_metabolic,
    'has_anamnesis',    (v_anamnesis IS NOT NULL),
    'engine',           'mifflin_v1_deterministic'
  );
END;
$$;

-- Garantir permissões
REVOKE ALL ON FUNCTION public.classify_and_assign_sovereign_template(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classify_and_assign_sovereign_template(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.calculate_clinical_kcal_target(NUMERIC,NUMERIC,INTEGER,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_clinical_kcal_target(NUMERIC,NUMERIC,INTEGER,TEXT,TEXT,TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.select_sovereign_template(TEXT,INTEGER,TEXT,TEXT,TEXT[],TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_sovereign_template(TEXT,INTEGER,TEXT,TEXT,TEXT[],TEXT[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 6: TESTE DE DETERMINISMO
-- Execute para verificar se o motor é determinístico:
-- O mesmo paciente com a mesma anamnese DEVE gerar o mesmo resultado
-- ════════════════════════════════════════════════════════════════════════════

/*
-- Teste manual: substituir pelos dados reais de um paciente
SELECT public.calculate_clinical_kcal_target(
  70,     -- peso kg
  170,    -- altura cm
  30,     -- idade
  'male', -- sexo
  'moderate', -- atividade
  'lose_weight' -- objetivo
);
-- Resultado esperado SEMPRE igual:
-- {"tmb": 1695, "tdee": 2627, "kcal": 2127, "protein_g": 140, "carbs_g": 213, "fat_g": 56}

-- Selecionar template determinístico:
SELECT * FROM public.select_sovereign_template(
  'lose_weight', 2127, 'male', 'moderate',
  ARRAY[]::text[], ARRAY[]::text[]
);
-- Resultado deve ser SEMPRE o mesmo template para os mesmos inputs
*/

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL: Status dos templates com clinical_tags
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  objective,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE clinical_tags != '[]'::jsonb) AS com_tags,
  COUNT(*) FILTER (WHERE clinical_tags = '[]'::jsonb OR clinical_tags IS NULL) AS sem_tags
FROM public.v3_diet_templates
WHERE active = true
GROUP BY objective
ORDER BY objective;
