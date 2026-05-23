-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPRINT B FIX 2 — Corrigir fallback (IF NOT FOUND não funciona com RETURN QUERY)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fix: usar uma CTE unificada com fallback_level em vez de IF NOT FOUND

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
BEGIN
  -- Mapear objetivo
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

  -- Restrições derivadas das condições clínicas
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

  RETURN QUERY
  WITH all_candidates AS (
    SELECT
      t.id,
      t.title,
      t.plan_snapshot,
      t.clinical_tags,
      t.dietary_restrictions AS t_content,
      t.contraindications,
      t.sex_preference,
      t.kcal_range_min,
      t.kcal_range_max,
      t.objective,
      -- NÍVEL 1 = filtro completo, NÍVEL 2 = fallback relaxado
      CASE
        WHEN
          -- Hard rejects absolutos
          NOT ('sem_whey' = ANY(p_dietary_restrictions) AND 'contains_whey' = ANY(t.dietary_restrictions))
          AND NOT ('rejeitar_high_volume' = ANY(p_dietary_restrictions) AND 'high_volume' = ANY(t.dietary_restrictions))
          AND NOT (t.contraindications && p_health_conditions)
          -- Hard rejects opcionais (nível 1)
          AND NOT ('sem_frango' = ANY(p_dietary_restrictions) AND (t.slug ILIKE '%frango%' OR t.title ILIKE '%frango%'))
          AND NOT ('sem_peixe' = ANY(p_dietary_restrictions) AND (t.slug ILIKE '%peixe%' OR t.title ILIKE '%peixe%'))
          AND NOT ('sem_carne_vermelha' = ANY(p_dietary_restrictions)
                   AND (t.slug ILIKE '%carne%' OR t.slug ILIKE '%churrasco%'))
        THEN 1
        -- Fallback: apenas hard rejects absolutos
        WHEN
          NOT ('sem_whey' = ANY(p_dietary_restrictions) AND 'contains_whey' = ANY(t.dietary_restrictions))
          AND NOT ('rejeitar_high_volume' = ANY(p_dietary_restrictions) AND 'high_volume' = ANY(t.dietary_restrictions))
          AND NOT (t.contraindications && p_health_conditions)
        THEN 2
        ELSE NULL
      END AS filter_level
    FROM public.v3_diet_templates t
    WHERE t.active = true
      AND t.plan_snapshot IS NOT NULL
      AND t.plan_snapshot::text != '{}'
  ),
  scored AS (
    SELECT
      c.id,
      c.title,
      c.plan_snapshot,
      c.filter_level,
      (
        CASE WHEN c.objective = v_clinical_objective THEN 40 ELSE 0 END
        + CASE WHEN p_kcal_target BETWEEN c.kcal_range_min AND c.kcal_range_max THEN 20 ELSE 0 END
        + CASE WHEN c.sex_preference = 'any' THEN 10
               WHEN lower(c.sex_preference) = lower(p_sex) THEN 15 ELSE 0 END
        + CASE WHEN v_is_vegetarian AND c.clinical_tags ? 'vegetariano_compativel' THEN 30 ELSE 0 END
        + CASE WHEN v_is_vegan AND c.clinical_tags ? 'vegano_compativel' THEN 40 ELSE 0 END
        + CASE
            WHEN 'diabetes' = ANY(p_health_conditions) AND c.clinical_tags ? 'diabetes' THEN 25
            WHEN 'resistencia_insulinica' = ANY(p_health_conditions)
              AND (c.clinical_tags ? 'resistencia_insulinica' OR c.clinical_tags ? 'low_carb') THEN 20
            WHEN 'hipertensao' = ANY(p_health_conditions) AND c.clinical_tags ? 'anti_inflamatorio' THEN 15
            ELSE 0
          END
        -- Penalizar fallback level 2
        - CASE WHEN c.filter_level = 2 THEN 10 ELSE 0 END
      ) AS match_score
    FROM all_candidates c
    WHERE c.filter_level IS NOT NULL
  ),
  with_best_key AS (
    SELECT
      s.id,
      s.title,
      s.match_score,
      s.filter_level,
      key.k AS best_kcal_key
    FROM scored s,
         LATERAL (
           SELECT k FROM jsonb_object_keys(s.plan_snapshot) k
           ORDER BY ABS(k::INTEGER - p_kcal_target) ASC
           LIMIT 1
         ) key
    WHERE s.match_score >= 30  -- mínimo relaxado para permitir fallback
  )
  SELECT wbk.id, wbk.best_kcal_key, wbk.title
  FROM with_best_key wbk
  ORDER BY
    wbk.filter_level ASC,          -- nível 1 tem prioridade sobre nível 2
    wbk.match_score DESC,          -- maior score primeiro
    ABS(wbk.best_kcal_key::INTEGER - p_kcal_target) ASC,  -- mais próximo caloricamente
    wbk.title ASC                  -- desempate determinístico
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_sovereign_template(TEXT,INTEGER,TEXT,TEXT,TEXT[],TEXT[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- TESTES FINAIS DEFINITIVOS
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'T1_sem_frango_diabetes' AS teste, template_title, best_kcal_key
FROM public.select_sovereign_template(
  'lose_weight', 1500, 'female', 'moderate',
  ARRAY['sem_frango','intolerante_lactose']::text[], ARRAY['diabetes']::text[]
);

SELECT 'T2_vegetariana_saude' AS teste, template_title, best_kcal_key
FROM public.select_sovereign_template(
  'maintain', 1800, 'female', 'light',
  ARRAY['vegetariano']::text[], ARRAY[]::text[]
);

SELECT 'T3_hipertrofia_normal' AS teste, template_title, best_kcal_key
FROM public.select_sovereign_template(
  'gain_muscle', 2800, 'male', 'active',
  ARRAY[]::text[], ARRAY[]::text[]
);

SELECT 'T4_bariatrica_emagrecimento' AS teste, template_title, best_kcal_key
FROM public.select_sovereign_template(
  'lose_weight', 1200, 'female', 'sedentary',
  ARRAY[]::text[], ARRAY['bariatrica']::text[]
);

SELECT 'T5_sem_peixe_emagrecimento' AS teste, template_title, best_kcal_key
FROM public.select_sovereign_template(
  'lose_weight', 1500, 'female', 'light',
  ARRAY['sem_peixe']::text[], ARRAY[]::text[]
);
