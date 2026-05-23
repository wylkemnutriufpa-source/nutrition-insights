-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPRINT B — RESTRIÇÕES CLÍNICAS DETERMINÍSTICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Baseado em auditoria forense real dos alimentos de cada template.
-- dietary_restrictions = o que o template CONTÉM (não o que aceita).
-- O matching REJEITA template se restrição do paciente conflitar com conteúdo.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════════════
-- VOCABULÁRIO DEFINITIVO DE RESTRIÇÕES
-- ════════════════════════════════════════════════════════════════════════════
-- CONTEÚDO do template (o que o template contém — base para rejeição):
--   contains_chicken    — contém frango como proteína principal
--   contains_fish       — contém peixe (tilápia, atum, salmão, sardinha)
--   contains_red_meat   — contém carne bovina como proteína
--   contains_egg        — contém ovo
--   contains_dairy      — contém laticínios (queijo, iogurte, leite, requeijão)
--   contains_whey       — contém whey protein / suplemento proteico
--   contains_gluten     — contém pão, macarrão, farinha de trigo
--   high_volume         — volume calórico/alimentar muito alto (bariátrico contraindicado)
--   high_sugar          — alto índice glicêmico / alto carb simples
--
-- RESTRIÇÃO do paciente (o que o paciente NÃO pode):
--   sem_frango          — não come frango
--   sem_peixe           — não come peixe
--   sem_carne_vermelha  — não come carne bovina
--   sem_ovos            — não come ovos
--   intolerante_lactose — intolerância a laticínios
--   sem_gluten / celiaco— doença celíaca ou intolerância a glúten
--   sem_whey            — não usa suplementos/whey
--   bariatrica          — cirurgia bariátrica (volume reduzido)
--   diabetes / resistencia_insulinica — priorizar low_carb, rejeitar high_sugar
--   vegetariano         — sem carnes (frango, peixe, carne vermelha)
--   vegano              — sem carnes e sem laticínios e sem ovos

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 1: SETAR dietary_restrictions POR SLUG (dados reais da auditoria)
-- ════════════════════════════════════════════════════════════════════════════

-- ── CLÍNICO ──────────────────────────────────────────────────────────────

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_egg','contains_dairy','contains_chicken'
] WHERE slug = 'anti-inflamatorio-premium';

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_whey','high_volume'
], contraindications = ARRAY['bariatrica_fase_inicial']
WHERE slug = 'bariatrica-solida';

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_red_meat','contains_egg','contains_dairy'
] WHERE slug = 'cetogenica-pratica';

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_red_meat','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'clinico-anemia';

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('clinico-colesterol','clinico-diabetes','clinico-gastrite',
                 'clinico-hipertensao','clinico-oncologico','clinico-pos-cirurgico',
                 'clinico-renal','clinico-tireoide');

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('colesterol-alto','diabetes-controle');

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy'
] WHERE slug = 'fodmaps-saude-intestinal';

UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_fish','contains_egg','contains_dairy'
] WHERE slug = 'pre-pos-operatorio';

-- ── EMAGRECIMENTO ─────────────────────────────────────────────────────────

-- 1200/1500 kcal — têm tudo (frango, ovo, laticínios, glúten, peixe)
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten','contains_fish'
] WHERE slug IN ('_magrecimento_1200_kcal','_magrecimento_1500_kcal');

-- Emagrecimento com Frango — dominante frango, sem laticínios confirmado
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_gluten'
] WHERE slug = 'emagrecimento-frango';

-- Emagrecimento com Peixe
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_fish','contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'emagrecimento-peixe';

-- Emagrecimento com Proteína — tem whey
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten','contains_whey'
] WHERE slug = 'emagrecimento-proteina';

-- Demais templates de emagrecimento (balanceado, express, intensivo, moderado, prático, vegetais)
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('emagrecimento-balanceado','emagrecimento-express',
                 'emagrecimento-intensivo','emagrecimento-moderado',
                 'emagrecimento-pratico','emagrecimento-vegetais');

-- ── HIPERTROFIA ───────────────────────────────────────────────────────────

-- Hipertrofia com Carne Vermelha — dominante carne, tem whey
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_red_meat','contains_chicken','contains_egg','contains_dairy',
  'contains_gluten','contains_whey','high_volume'
] WHERE slug = 'hipertrofia-carne';

-- Hipertrofia com Frango — sem carne vermelha dominante, tem whey
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten',
  'contains_whey','high_volume'
] WHERE slug IN ('hipertrofia-frango','hipertrofia-limpo');

-- Demais hipertrofia (têm tudo: carne, frango, ovo, laticínios, glúten, whey)
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_red_meat','contains_egg','contains_dairy',
  'contains_gluten','contains_whey','high_volume'
] WHERE slug IN ('hipertrofia-avancada','hipertrofia-bulking','hipertrofia-economico',
                 'hipertrofia-iniciante','hipertrofia-intermediario','hipertrofia-pratica',
                 'ganho-massa-limpa');

-- ── LOW CARB ──────────────────────────────────────────────────────────────

-- Low Carb com Peixe
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_fish','contains_chicken','contains_egg','contains_dairy'
] WHERE slug = 'low-carb-peixe';

-- Low Carb Alta Proteína — tem whey
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_whey'
] WHERE slug = 'low-carb-proteina';

-- Demais low carb (frango, ovo, laticínios)
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy'
] WHERE slug IN ('emagrecimento-low-carb','low-carb-acessivel','low-carb-cetogenico',
                 'low-carb-intensivo','low-carb-moderado');

-- ── SAÚDE ─────────────────────────────────────────────────────────────────

-- Colesterol Alto 1600 kcal — tem tudo + peixe
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_fish','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = '_olesterol_lto_1600_kcal';

-- Detox e Vitalidade — sem frango, sem carne, tem ovo e laticínios
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_egg','contains_dairy'
] WHERE slug = 'detox-vitalidade';

-- Gestantes — tem tudo
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_red_meat','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'gestantes-saudavel';

-- Nordeste (cuscuz, tapioca, macaxeira) — têm frango, ovo, laticínios, glúten
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('nordeste-cuscuz','nordeste-macaxeira','nordeste-tapioca','nordeste-tradicional');

-- Saúde com Frango
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'saude-frango';

-- Saúde com Peixe
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_fish','contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'saude-peixe';

-- Saúde com Vegetais — sem carne vermelha dominante
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'saude-vegetais';

-- Sul Churrasco — dominante carne vermelha
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_red_meat','contains_chicken','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('sul-churrasco','sul-polenta','sul-tradicional');

-- Saúde Prático, Econômico, Equilibrado, Família, Idoso, Premium, Variado
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_red_meat','contains_egg','contains_dairy','contains_gluten'
] WHERE slug IN ('saude-economico','saude-equilibrado','saude-familia','saude-idoso',
                 'saude-pratico','saude-premium','saude-variado');

-- Prático Rápido Barato, Cardápio Fácil
UPDATE v3_diet_templates SET dietary_restrictions = ARRAY[
  'contains_chicken','contains_red_meat','contains_egg','contains_dairy','contains_gluten'
] WHERE slug = 'pratico-rapido-barato';

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 2: ATUALIZAR select_sovereign_template() COM HARD REJECT
-- ════════════════════════════════════════════════════════════════════════════

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
  -- Restrições derivadas das condições clínicas do paciente
  v_implied_restrictions TEXT[];
BEGIN
  -- Mapear objetivo
  v_clinical_objective := CASE lower(p_objective)
    WHEN 'lose_weight'          THEN 'emagrecimento'
    WHEN 'perda_peso'           THEN 'emagrecimento'
    WHEN 'gain_muscle'          THEN 'hipertrofia'
    WHEN 'maintain'             THEN 'saude'
    WHEN 'maintenance'          THEN 'saude'
    WHEN 'manutencao'           THEN 'saude'
    WHEN 'recomposicao'         THEN 'recomposicao'
    WHEN 'recomposicao_corporal'THEN 'recomposicao'
    WHEN 'performance'          THEN 'performance'
    ELSE 'saude'
  END;

  -- Derivar restrições implícitas das condições clínicas
  -- diabetes/resistência insulínica → rejeitar high_sugar
  -- bariatrica → rejeitar high_volume
  -- vegetariano → sem frango, peixe, carne
  -- vegano → sem frango, peixe, carne, laticínios, ovo
  v_implied_restrictions := ARRAY[]::text[];

  IF 'diabetes' = ANY(p_health_conditions) OR 'resistencia_insulinica' = ANY(p_health_conditions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['rejeitar_high_sugar'];
  END IF;

  IF 'bariatrica' = ANY(p_health_conditions) OR 'pos_bariatrica' = ANY(p_health_conditions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['rejeitar_high_volume'];
  END IF;

  IF 'vegetariano' = ANY(p_dietary_restrictions) OR 'vegetarian' = ANY(p_dietary_restrictions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['sem_frango','sem_peixe','sem_carne_vermelha'];
  END IF;

  IF 'vegano' = ANY(p_dietary_restrictions) OR 'vegan' = ANY(p_dietary_restrictions) THEN
    v_implied_restrictions := v_implied_restrictions || ARRAY['sem_frango','sem_peixe','sem_carne_vermelha','intolerante_lactose','sem_ovos'];
  END IF;

  -- Consolidar todas as restrições do paciente
  p_dietary_restrictions := p_dietary_restrictions || v_implied_restrictions;

  RETURN QUERY
  WITH candidate_templates AS (
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
      (
        CASE WHEN t.objective = v_clinical_objective THEN 40 ELSE 0 END
        + CASE WHEN p_kcal_target BETWEEN t.kcal_range_min AND t.kcal_range_max THEN 20 ELSE 0 END
        + CASE WHEN t.sex_preference = 'any' THEN 10
               WHEN lower(t.sex_preference) = lower(p_sex) THEN 15
               ELSE 0 END
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
      -- ══════════════════════════════════════════════════════════════════
      -- HARD REJECT — INCOMPATIBILIDADE CLÍNICA ABSOLUTA
      -- Template é descartado ANTES do scoring se conteúdo conflitar
      -- ══════════════════════════════════════════════════════════════════

      -- Rejeitar se template tem frango E paciente não come frango
      AND NOT (
        'sem_frango' = ANY(p_dietary_restrictions)
        AND 'contains_chicken' = ANY(t.dietary_restrictions)
        AND NOT 'contains_fish' = ANY(t.dietary_restrictions)  -- exceto se tem peixe como alternativa
        AND NOT 'contains_red_meat' = ANY(t.dietary_restrictions)  -- exceto se tem carne como alternativa
      )

      -- Rejeitar se template DOMINANTE em frango (no título) E paciente sem frango
      AND NOT (
        'sem_frango' = ANY(p_dietary_restrictions)
        AND (t.slug ILIKE '%frango%' OR t.title ILIKE '%frango%')
      )

      -- Rejeitar se template tem peixe E paciente não come peixe
      AND NOT (
        'sem_peixe' = ANY(p_dietary_restrictions)
        AND (t.slug ILIKE '%peixe%' OR t.title ILIKE '%peixe%')
      )

      -- Rejeitar se template dominante em carne vermelha E paciente sem carne
      AND NOT (
        'sem_carne_vermelha' = ANY(p_dietary_restrictions)
        AND (t.slug ILIKE '%carne%' OR t.slug ILIKE '%churrasco%' OR t.title ILIKE '%carne vermelha%')
      )

      -- Rejeitar se template tem laticínios E paciente intolerante
      AND NOT (
        ('intolerante_lactose' = ANY(p_dietary_restrictions) OR 'lactose_free' = ANY(p_dietary_restrictions))
        AND 'contains_dairy' = ANY(t.dietary_restrictions)
        AND t.objective IN ('saude','emagrecimento')  -- hipertrofia tem alternativas, não rejeitar cegamente
      )

      -- Rejeitar se template tem whey E paciente não usa whey
      AND NOT (
        'sem_whey' = ANY(p_dietary_restrictions)
        AND 'contains_whey' = ANY(t.dietary_restrictions)
      )

      -- Rejeitar high_volume para bariátricos
      AND NOT (
        'rejeitar_high_volume' = ANY(p_dietary_restrictions)
        AND 'high_volume' = ANY(t.dietary_restrictions)
      )

      -- Rejeitar high_sugar para diabetes/resistência
      AND NOT (
        'rejeitar_high_sugar' = ANY(p_dietary_restrictions)
        AND 'high_sugar' = ANY(t.dietary_restrictions)
      )

      -- Rejeitar contraindicated
      AND NOT (t.contraindications && p_health_conditions)
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
           SELECT k FROM jsonb_object_keys(ct.plan_snapshot) k
           ORDER BY ABS(k::INTEGER - p_kcal_target) ASC
           LIMIT 1
         ) key
    WHERE ct.match_score >= 40
  )
  SELECT bk.id, bk.best_kcal_key, bk.title
  FROM best_key bk
  ORDER BY
    bk.match_score DESC,
    ABS(bk.best_kcal_key::INTEGER - p_kcal_target) ASC,
    bk.title ASC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_sovereign_template(TEXT,INTEGER,TEXT,TEXT,TEXT[],TEXT[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- PASSO 3: VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════════════════════

-- Quantos templates têm dietary_restrictions populadas?
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE dietary_restrictions != ARRAY[]::text[] AND dietary_restrictions IS NOT NULL) AS com_restricoes,
  COUNT(*) FILTER (WHERE dietary_restrictions = ARRAY[]::text[] OR dietary_restrictions IS NULL) AS sem_restricoes
FROM v3_diet_templates WHERE active = true;

-- Teste de matching: paciente sem frango, intolerante lactose, diabetes
-- Deve retornar template sem frango e low carb
SELECT * FROM public.select_sovereign_template(
  'lose_weight',  -- objetivo
  1500,           -- kcal alvo
  'female',       -- sexo
  'moderate',     -- atividade
  ARRAY['sem_frango','intolerante_lactose']::text[],  -- restrições
  ARRAY['diabetes']::text[]                           -- condições
);

-- Teste: paciente vegetariano com objetivo saude
-- Deve retornar template sem frango, peixe e carne
SELECT * FROM public.select_sovereign_template(
  'maintain', 1800, 'female', 'light',
  ARRAY['vegetariano']::text[], ARRAY[]::text[]
);

-- Teste: paciente sem restrições, hipertrofia
-- Deve retornar template de hipertrofia normalmente
SELECT * FROM public.select_sovereign_template(
  'gain_muscle', 2800, 'male', 'active',
  ARRAY[]::text[], ARRAY[]::text[]
);
