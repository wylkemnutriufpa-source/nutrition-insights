-- ============================================================
-- EXTRAIR DADOS DOS 6 TEMPLATES AGRUPADOS PARA ANÁLISE
-- ============================================================
-- Execute esta query para ver exatamente o que precisa ser corrigido

-- Encontrar os 6 templates com refeições agrupadas
WITH grouped_templates AS (
  SELECT DISTINCT
    t.id,
    t.title,
    t.plan_snapshot
  FROM v3_diet_templates t,
    jsonb_array_elements(t.plan_snapshot->'days') as day,
    jsonb_array_elements(day->'meals') as meal
  WHERE t.active = true
  AND meal->>'name' LIKE '%com%'
)
SELECT 
  id,
  title,
  plan_snapshot
FROM grouped_templates
ORDER BY id;

-- ============================================================
-- ALTERNATIVA: Ver estrutura de um template específico
-- ============================================================
-- Descomente e substitua TEMPLATE_ID para ver detalhes completos

-- SELECT 
--   id,
--   title,
--   jsonb_pretty(plan_snapshot) as formatted_snapshot
-- FROM v3_diet_templates
-- WHERE id = 'TEMPLATE_ID_AQUI'
-- LIMIT 1;

-- ============================================================
-- ANÁLISE: Contar items por refeição agrupada
-- ============================================================
-- Ver quantos items estão agrupados em cada refeição

SELECT 
  t.id,
  t.title,
  day->>'day_of_week' as day_of_week,
  meal->>'name' as meal_name,
  jsonb_array_length(meal->'items') as item_count,
  (meal->'items'->0->>'name') as first_item_name,
  (meal->'items'->0->>'kcal') as first_item_kcal
FROM v3_diet_templates t,
  jsonb_array_elements(t.plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal
WHERE t.active = true
AND meal->>'name' LIKE '%com%'
ORDER BY t.id, day->>'day_of_week';

-- ============================================================
-- EXPORTAR PARA JSON (copiar resultado)
-- ============================================================
-- Copiar o resultado desta query e salvar em arquivo JSON para editar

SELECT 
  jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'snapshot', t.plan_snapshot
  )::text as json_export
FROM v3_diet_templates t,
  jsonb_array_elements(t.plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal
WHERE t.active = true
AND meal->>'name' LIKE '%com%'
GROUP BY t.id, t.title, t.plan_snapshot
ORDER BY t.id;
