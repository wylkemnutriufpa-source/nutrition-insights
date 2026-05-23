-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPRINT B — AUDITORIA FORENSE DE ALIMENTOS NOS TEMPLATES
-- Execute no Supabase SQL Editor para mapear alimentos reais
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════
-- QUERY 1: Lista TODOS os alimentos únicos em TODOS os templates
-- (Para mapear proteínas dominantes, laticínios, glúten, etc.)
-- ════════════════════════════════════════════════════════════════════
SELECT DISTINCT
  lower(trim(item->>'name')) AS alimento,
  lower(trim(item->>'title')) AS title,
  COUNT(*) OVER (PARTITION BY lower(trim(COALESCE(item->>'name', item->>'title')))) AS aparece_em_qtd_itens
FROM v3_diet_templates t,
  LATERAL jsonb_each(t.plan_snapshot) AS profile,
  LATERAL jsonb_array_elements(profile.value->'days') AS day,
  LATERAL jsonb_array_elements(day->'meals') AS meal,
  LATERAL jsonb_array_elements(COALESCE(meal->'items', '[]'::jsonb)) AS item
WHERE t.active = true
  AND (item->>'name' IS NOT NULL OR item->>'title' IS NOT NULL)
ORDER BY aparece_em_qtd_itens DESC, alimento
LIMIT 100;

-- ════════════════════════════════════════════════════════════════════
-- QUERY 2: Por template — proteína dominante e alimentos sensíveis
-- ════════════════════════════════════════════════════════════════════
WITH template_foods AS (
  SELECT
    t.id,
    t.slug,
    t.title,
    t.objective,
    lower(trim(COALESCE(item->>'name', item->>'title', ''))) AS food_name
  FROM v3_diet_templates t,
    LATERAL jsonb_each(t.plan_snapshot) AS profile,
    LATERAL jsonb_array_elements(profile.value->'days') AS day,
    LATERAL jsonb_array_elements(day->'meals') AS meal,
    LATERAL jsonb_array_elements(COALESCE(meal->'items', '[]'::jsonb)) AS item
  WHERE t.active = true
)
SELECT
  slug,
  title,
  objective,
  -- Proteínas dominantes
  bool_or(food_name ILIKE '%frango%') AS tem_frango,
  bool_or(food_name ILIKE '%peixe%' OR food_name ILIKE '%tilapia%' OR food_name ILIKE '%atum%' OR food_name ILIKE '%salmao%' OR food_name ILIKE '%sardinha%') AS tem_peixe,
  bool_or(food_name ILIKE '%carne%' OR food_name ILIKE '%boi%' OR food_name ILIKE '%alcatra%' OR food_name ILIKE '%patinho%' OR food_name ILIKE '%file%') AS tem_carne_vermelha,
  bool_or(food_name ILIKE '%ovo%') AS tem_ovo,
  bool_or(food_name ILIKE '%whey%' OR food_name ILIKE '%suplemento%' OR food_name ILIKE '%proteina em po%') AS tem_whey,
  -- Laticínios
  bool_or(food_name ILIKE '%leite%' OR food_name ILIKE '%iogurte%' OR food_name ILIKE '%queijo%' OR food_name ILIKE '%requeijao%' OR food_name ILIKE '%manteiga%') AS tem_laticinios,
  -- Glúten
  bool_or(food_name ILIKE '%pao%' OR food_name ILIKE '%macarrao%' OR food_name ILIKE '%farinha de trigo%' OR food_name ILIKE '%aveia%' OR food_name ILIKE '%tapioca%') AS pode_ter_gluten,
  -- Carbos/Açúcar
  bool_or(food_name ILIKE '%arroz%' OR food_name ILIKE '%batata%' OR food_name ILIKE '%macaxeira%' OR food_name ILIKE '%cuscuz%' OR food_name ILIKE '%inhame%') AS tem_carboidrato_complexo,
  -- Volume alto (bariátrico)
  COUNT(*) AS total_itens_distintos
FROM template_foods
GROUP BY slug, title, objective
ORDER BY objective, slug;
