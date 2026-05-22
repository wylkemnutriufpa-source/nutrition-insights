-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DIAGNÓSTICO: ONDE AS SUBSTITUIÇÕES MORRERAM?
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Hipótese: substituições existem nos templates fonte, mas se perdem no caminho.
-- Esta SQL responde: ELAS EXISTEM ou NÃO?

-- ════════════════════════════════════════════════════════════════════
-- 1. Templates V3 — quantos % dos alimentos têm substituições?
-- ════════════════════════════════════════════════════════════════════
WITH expanded AS (
  SELECT 
    t.title,
    t.slug,
    food_elem AS food
  FROM v3_diet_templates t,
    LATERAL jsonb_each(t.plan_snapshot) AS profile,
    LATERAL jsonb_array_elements(profile.value->'days') AS day_elem,
    LATERAL jsonb_array_elements(day_elem->'meals') AS meal_elem,
    LATERAL jsonb_array_elements(
      COALESCE(meal_elem->'foods', meal_elem->'items', '[]'::jsonb)
    ) AS food_elem
  WHERE t.active = true
)
SELECT 
  title,
  slug,
  COUNT(*) AS total_alimentos,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0) AS com_subs,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) = 0) AS sem_subs,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0) 
    / NULLIF(COUNT(*), 0), 
  1) AS pct_com_subs
FROM expanded
GROUP BY title, slug
ORDER BY pct_com_subs ASC NULLS LAST, title
LIMIT 20;


-- ════════════════════════════════════════════════════════════════════
-- 2. Tabela ORIGINAL (meal_plan_templates) — tem substituições?
-- ════════════════════════════════════════════════════════════════════
WITH expanded AS (
  SELECT 
    t.name AS title,
    food_elem AS food
  FROM meal_plan_templates t,
    LATERAL jsonb_array_elements(t.meals) AS day_elem,
    LATERAL jsonb_array_elements(day_elem->'meals') AS meal_elem,
    LATERAL jsonb_array_elements(
      COALESCE(meal_elem->'foods', meal_elem->'items', '[]'::jsonb)
    ) AS food_elem
)
SELECT 
  title,
  COUNT(*) AS total_alimentos,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0) AS com_subs,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0) 
    / NULLIF(COUNT(*), 0), 
  1) AS pct_com_subs
FROM expanded
GROUP BY title
ORDER BY pct_com_subs ASC NULLS LAST
LIMIT 20;


-- ════════════════════════════════════════════════════════════════════
-- 3. Planos publicados de pacientes (meal_plans.snapshot) — tem subs?
-- ════════════════════════════════════════════════════════════════════
SELECT 
  mp.id,
  mp.title,
  mp.created_at::date AS criado_em,
  -- Conta total de substituições no snapshot todo
  COALESCE((
    SELECT SUM(jsonb_array_length(COALESCE(item->'substitutions', '[]'::jsonb)))
    FROM jsonb_array_elements(mp.snapshot->'days') AS day,
         jsonb_array_elements(day->'meals') AS meal,
         jsonb_array_elements(
           COALESCE(meal->'items', meal->'foods', '[]'::jsonb)
         ) AS item
  ), 0) AS total_subs_no_plano,
  -- Conta total de alimentos
  COALESCE((
    SELECT COUNT(*)
    FROM jsonb_array_elements(mp.snapshot->'days') AS day,
         jsonb_array_elements(day->'meals') AS meal,
         jsonb_array_elements(
           COALESCE(meal->'items', meal->'foods', '[]'::jsonb)
         ) AS item
  ), 0) AS total_alimentos
FROM meal_plans mp
WHERE mp.snapshot IS NOT NULL
ORDER BY mp.created_at DESC
LIMIT 10;


-- ════════════════════════════════════════════════════════════════════
-- 4. Amostra concreta — pegar 3 substituições reais (se existirem)
-- ════════════════════════════════════════════════════════════════════
WITH expanded AS (
  SELECT 
    t.title,
    food_elem AS food
  FROM v3_diet_templates t,
    LATERAL jsonb_each(t.plan_snapshot) AS profile,
    LATERAL jsonb_array_elements(profile.value->'days') AS day_elem,
    LATERAL jsonb_array_elements(day_elem->'meals') AS meal_elem,
    LATERAL jsonb_array_elements(
      COALESCE(meal_elem->'foods', meal_elem->'items', '[]'::jsonb)
    ) AS food_elem
  WHERE t.active = true
)
SELECT 
  title,
  food->>'name' AS alimento_principal,
  food->>'qty' AS porcao,
  jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) AS qtd_subs,
  food->'substitutions' AS substituicoes_detalhadas
FROM expanded
WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0
LIMIT 3;
