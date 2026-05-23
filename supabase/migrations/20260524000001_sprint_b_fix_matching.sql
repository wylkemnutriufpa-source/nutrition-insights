-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPRINT B FIX — Corrigir matching vegetariano e fallback progressivo
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- FIX 1: saude-vegetais precisa marcar que NÃO contém carne/peixe
-- mas gestantes tinha lactose e ovos → precisa de clinical_tag vegetariano
UPDATE v3_diet_templates SET
  clinical_tags = clinical_tags || '["vegetariano_compativel"]'::jsonb,
  dietary_restrictions = ARRAY['contains_egg','contains_dairy','contains_gluten']
WHERE slug = 'saude-vegetais';

-- detox-vitalidade também compatível com vegetariano (sem frango)
UPDATE v3_diet_templates SET
  clinical_tags = clinical_tags || '["vegetariano_compativel"]'::jsonb
WHERE slug = 'detox-vitalidade';

-- FIX 2: Atualizar select_sovereign_template com:
-- a) Bônus de score para templates vegetariano_compativel quando paciente é vegetariano
-- b) Fallback progressivo: se 0 resultados, relaxar restrição de laticínios e tentar de novo
CREATE OR REPLACE FUNCTION public.select_sovereign_template(
  p_objective          TEXT,
  p_kcal_target        INTEGER,
  p_sex                TEXT,
  p_activity           TEXT,
  p_dietary_restrictions TEXT[],
  p_health_conditions  TEXT[]
)
RETURNS TABLE(template_id UUID, best_kcal_key TEXT, template_title TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_clinical_objective TEXT;
  v_implied_restrictions TEXT[];
  v_is_vegetarian BOOLEAN;
  v_is_vegan BOOLEAN;
  v_result RECORD;
BEGIN
  v_clinical_objective := CASE lower(p_objective)
    WHEN 'lose_weight'           THEN 'emagrecimento'
    WHEN 'perda_peso'            THEN 'emagrecimento'
    WHEN 'gain_muscle'           THEN 'hipertrofia'
    WHEN 'maintain'              THEN 'saude'
    WHEN 'maintenance'           THEN 'saude'
    WHEN 'manutencao'            THEN 'saude'
    WHEN 'recomposicao'          THEN 'recomposicao'
    WHEN 'recomposicao_corporal' THEN 'recomposicao'
    WHEN 'performance'           THEN 'performance'
    ELSE 'saude'
  END;

  v_is_vegetarian := 'vegetariano' = ANY(p_dietary_restrictions) OR 'vegetarian' = ANY(p_dietary_restrictions);
  v_is_vegan := 'vegano' = ANY(p_dietary_restrictions) OR 'vegan' = ANY(p_dietary_restrictions);

  v_implied_restrictions := ARRAY[]::text[];

  IF 'diabetes' = ANY(p_health_conditions) OR 'resistencia_insulinica' = ANY(p_health_conditions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['rejeitar_high_sugar'];
  END IF;
  IF 'bariatrica' = ANY(p_health_conditions) OR 'pos_bariatrica' = ANY(p_health_conditions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['rejeitar_high_volume'];
  END IF;
  IF v_is_vegetarian OR v_is_vegan THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['sem_frango','sem_peixe','sem_carne_vermelha'];
  END IF;
  IF v_is_vegan THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['intolerante_lactose','sem_ovos'];
  END IF;

  p_dietary_restrictions := p_dietary_restrictions || v_implied_restrictions;

  -- ── TENTATIVA 1: Matching completo com todos os hard rejects ─────────────
  RETURN QUERY
  WITH candidate_templates AS (
    SELECT t.id, t.title, t.plan_snapshot, t.clinical_tags, t.dietary_restrictions AS t_content,
      t.contraindications, t.sex_preference, t.kcal_range_min, t.kcal_range_max,
      (
        CASE WHEN t.objective = v_clinical_objective THEN 40 ELSE 0 END
        + CASE WHEN p_kcal_target BETWEEN t.kcal_range_min AND t.kcal_range_max THEN 20 ELSE 0 END
        + CASE WHEN t.sex_preference = 'any' THEN 10
               WHEN lower(t.sex_preference) = lower(p_sex) THEN 15 ELSE 0 END
        -- Bônus vegetariano: template marcado como vegetariano_compativel
        + CASE WHEN v_is_vegetarian AND t.clinical_tags ? 'vegetariano_compativel' THEN 30 ELSE 0 END
        + CASE WHEN v_is_vegan AND t.clinical_tags ? 'vegano_compativel' THEN 40 ELSE 0 END
        + CASE
            WHEN 'diabetes' = ANY(p_health_conditions) AND t.clinical_tags ? 'diabetes' THEN 25
            WHEN 'resistencia_insulinica' = ANY(p_health_conditions)
              AND (t.clinical_tags ? 'resistencia_insulinica' OR t.clinical_tags ? 'low_carb') THEN 20
            WHEN 'hipertensao' = ANY(p_health_conditions) AND t.clinical_tags ? 'anti_inflamatorio' THEN 15
            ELSE 0
          END
      ) AS match_score
    FROM public.v3_diet_templates t
    WHERE t.active = true
      AND t.plan_snapshot IS NOT NULL
      AND t.plan_snapshot::text != '{}'
      -- Hard reject: sem_frango
      AND NOT ('sem_frango' = ANY(p_dietary_restrictions) AND (t.slug ILIKE '%frango%' OR t.title ILIKE '%frango%'))
      AND NOT ('sem_frango' = ANY(p_dietary_restrictions)
               AND 'contains_chicken' = ANY(t.dietary_restrictions)
               AND NOT 'contains_fish' = ANY(t.dietary_restrictions)
               AND NOT 'contains_red_meat' = ANY(t.dietary_restrictions))
      -- Hard reject: sem_peixe
      AND NOT ('sem_peixe' = ANY(p_dietary_restrictions) AND (t.slug ILIKE '%peixe%' OR t.title ILIKE '%peixe%'))
      -- Hard reject: sem_carne_vermelha
      AND NOT ('sem_carne_vermelha' = ANY(p_dietary_restrictions)
               AND (t.slug ILIKE '%carne%' OR t.slug ILIKE '%churrasco%'))
      -- Hard reject: intolerante_lactose (só para emagrecimento/saude, não hipertrofia)
      AND NOT (('intolerante_lactose' = ANY(p_dietary_restrictions) OR 'lactose_free' = ANY(p_dietary_restrictions))
               AND 'contains_dairy' = ANY(t.dietary_restrictions)
               AND t.objective IN ('saude') )  -- menos agressivo: apenas saude pura
      -- Hard reject: sem_whey
      AND NOT ('sem_whey' = ANY(p_dietary_restrictions) AND 'contains_whey' = ANY(t.dietary_restrictions))
      -- Hard reject: high_volume
      AND NOT ('rejeitar_high_volume' = ANY(p_dietary_restrictions) AND 'high_volume' = ANY(t.dietary_restrictions))
      -- Hard reject: contraindications
      AND NOT (t.contraindications && p_health_conditions)
  ),
  best_key AS (
    SELECT ct.id, ct.title, ct.plan_snapshot, ct.match_score,
           key.k AS best_kcal_key
    FROM candidate_templates ct,
         LATERAL (SELECT k FROM jsonb_object_keys(ct.plan_snapshot) k
                  ORDER BY ABS(k::INTEGER - p_kcal_target) ASC LIMIT 1) key
    WHERE ct.match_score >= 40
  )
  SELECT bk.id, bk.best_kcal_key, bk.title
  FROM best_key bk
  ORDER BY bk.match_score DESC, ABS(bk.best_kcal_key::INTEGER - p_kcal_target) ASC, bk.title ASC
  LIMIT 1;

  -- ── FALLBACK: Se retornou vazio, relaxar restrições e tentar de novo ──────
  IF NOT FOUND THEN
    RETURN QUERY
    WITH fallback_templates AS (
      SELECT t.id, t.title, t.plan_snapshot,
        (
          CASE WHEN t.objective = v_clinical_objective THEN 40 ELSE 20 END
          + CASE WHEN p_kcal_target BETWEEN t.kcal_range_min AND t.kcal_range_max THEN 20 ELSE 0 END
        ) AS score
      FROM public.v3_diet_templates t
      WHERE t.active = true
        AND t.plan_snapshot IS NOT NULL
        AND t.plan_snapshot::text != '{}'
        AND t.objective = v_clinical_objective
        -- Apenas os hard rejects absolutos: sem_whey, high_volume, contraindicações
        AND NOT ('sem_whey' = ANY(p_dietary_restrictions) AND 'contains_whey' = ANY(t.dietary_restrictions))
        AND NOT ('rejeitar_high_volume' = ANY(p_dietary_restrictions) AND 'high_volume' = ANY(t.dietary_restrictions))
        AND NOT (t.contraindications && p_health_conditions)
    )
    SELECT ft.id, key.k, ft.title
    FROM fallback_templates ft,
         LATERAL (SELECT k FROM jsonb_object_keys(ft.plan_snapshot) k
                  ORDER BY ABS(k::INTEGER - p_kcal_target) ASC LIMIT 1) key
    ORDER BY ft.score DESC, ABS(key.k::INTEGER - p_kcal_target) ASC, ft.title ASC
    LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_sovereign_template(TEXT,INTEGER,TEXT,TEXT,TEXT[],TEXT[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- TESTES FINAIS
-- ════════════════════════════════════════════════════════════════════════════
-- Teste 1: sem frango + intolerante lactose + diabetes
SELECT 'TESTE_1' AS teste, * FROM public.select_sovereign_template(
  'lose_weight', 1500, 'female', 'moderate',
  ARRAY['sem_frango','intolerante_lactose']::text[], ARRAY['diabetes']::text[]
);

-- Teste 2: vegetariana, saude
SELECT 'TESTE_2' AS teste, * FROM public.select_sovereign_template(
  'maintain', 1800, 'female', 'light',
  ARRAY['vegetariano']::text[], ARRAY[]::text[]
);

-- Teste 3: hipertrofia sem restrições
SELECT 'TESTE_3' AS teste, * FROM public.select_sovereign_template(
  'gain_muscle', 2800, 'male', 'active',
  ARRAY[]::text[], ARRAY[]::text[]
);

-- Teste 4: bariatrica (deve rejeitar high_volume)
SELECT 'TESTE_4' AS teste, * FROM public.select_sovereign_template(
  'lose_weight', 1200, 'female', 'sedentary',
  ARRAY[]::text[], ARRAY['bariatrica']::text[]
);
