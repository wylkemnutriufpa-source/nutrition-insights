-- ============================================================
-- DIAGNÓSTICO DE TEMPLATES — ESTRUTURA E QUALIDADE
-- ============================================================
-- Identifica problemas críticos nos templates V3

-- 1. Templates com menos de 7 dias
SELECT 
  id,
  title,
  jsonb_array_length(plan_snapshot->'days') as day_count,
  CASE 
    WHEN jsonb_array_length(plan_snapshot->'days') < 7 THEN 'CRÍTICO: Menos de 7 dias'
    ELSE 'OK'
  END as status
FROM v3_diet_templates
WHERE active = true
ORDER BY day_count;

-- 2. Templates sem imagens nos items
SELECT 
  id,
  title,
  COUNT(*) as total_items,
  COUNT(CASE WHEN item->>'imageUrl' IS NULL THEN 1 END) as items_sem_imagem
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal,
  jsonb_array_elements(meal->'items') as item
WHERE active = true
GROUP BY id, title
HAVING COUNT(CASE WHEN item->>'imageUrl' IS NULL THEN 1 END) > 0
ORDER BY items_sem_imagem DESC;

-- 3. Refeições agrupadas (items com nomes compostos)
SELECT 
  id,
  title,
  day->>'day_of_week' as day,
  meal->>'name' as meal_name,
  jsonb_array_length(meal->'items') as item_count,
  CASE 
    WHEN meal->>'name' LIKE '%com%' AND jsonb_array_length(meal->'items') = 1 THEN 'CRÍTICO: Refeição agrupada'
    ELSE 'OK'
  END as status
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal
WHERE active = true
AND meal->>'name' LIKE '%com%'
ORDER BY id, day;

-- 4. Ovo em gramas (não em unidades)
SELECT 
  id,
  title,
  day->>'day_of_week' as day,
  meal->>'name' as meal_name,
  item->>'name' as item_name,
  item->>'quantity' as quantity,
  item->>'unit' as unit,
  CASE 
    WHEN (item->>'name' ILIKE '%ovo%' OR item->>'name' ILIKE '%egg%') 
      AND (item->>'unit' = 'g' OR item->>'unit' = 'gr') 
      THEN 'CRÍTICO: Ovo em gramas'
    ELSE 'OK'
  END as status
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal,
  jsonb_array_elements(meal->'items') as item
WHERE active = true
AND (item->>'name' ILIKE '%ovo%' OR item->>'name' ILIKE '%egg%')
ORDER BY id, day;

-- 5. Arroz com conversão incorreta (colheres em vez de xícara)
SELECT 
  id,
  title,
  day->>'day_of_week' as day,
  meal->>'name' as meal_name,
  item->>'name' as item_name,
  item->>'quantity' as quantity,
  item->>'unit' as unit,
  item->>'portion_label' as portion_label,
  CASE 
    WHEN (item->>'name' ILIKE '%arroz%') 
      AND (item->>'portion_label' LIKE '%colher%' OR item->>'portion_label' IS NULL)
      THEN 'CRÍTICO: Arroz com conversão incorreta'
    ELSE 'OK'
  END as status
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal,
  jsonb_array_elements(meal->'items') as item
WHERE active = true
AND item->>'name' ILIKE '%arroz%'
ORDER BY id, day;

-- 6. Resumo geral de qualidade
SELECT 
  COUNT(*) as total_templates,
  COUNT(CASE WHEN jsonb_array_length(plan_snapshot->'days') < 7 THEN 1 END) as templates_com_menos_de_7_dias,
  COUNT(CASE WHEN plan_snapshot::text NOT LIKE '%imageUrl%' THEN 1 END) as templates_sem_imagens,
  COUNT(CASE WHEN plan_snapshot::text LIKE '%com%' THEN 1 END) as templates_com_refeicoes_agrupadas
FROM v3_diet_templates
WHERE active = true;

-- 7. Detalhe de um template específico (para análise)
-- Descomente e substitua o ID
-- SELECT 
--   id,
--   title,
--   plan_snapshot
-- FROM v3_diet_templates
-- WHERE id = 'TEMPLATE_ID_AQUI'
-- LIMIT 1;
