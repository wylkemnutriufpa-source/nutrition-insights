-- ============================================================
-- IDENTIFICAR TEMPLATES COM REFEIÇÕES AGRUPADAS
-- ============================================================
-- Lista os 6 templates que têm refeições agrupadas

SELECT 
  id,
  title,
  day->>'day_of_week' as day_of_week,
  meal->>'name' as meal_name,
  jsonb_array_length(meal->'items') as item_count,
  meal->'items' as items_json
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal
WHERE active = true
AND meal->>'name' LIKE '%com%'
ORDER BY id, day->>'day_of_week', meal->>'name';

-- ============================================================
-- DETALHE: Ver estrutura completa de um template agrupado
-- ============================================================
-- Descomente e substitua TEMPLATE_ID para ver detalhes

-- SELECT 
--   id,
--   title,
--   plan_snapshot
-- FROM v3_diet_templates
-- WHERE id = 'TEMPLATE_ID_AQUI'
-- LIMIT 1;
