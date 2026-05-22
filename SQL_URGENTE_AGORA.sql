-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🚨 SQL URGENTE - COPIE E COLE NO SUPABASE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- QUERY 1: Verificar se template existe e tem snapshot
SELECT 
  title,
  (plan_snapshot IS NOT NULL) as tem_snapshot,
  jsonb_typeof(plan_snapshot) as tipo_snapshot
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true
LIMIT 1;

-- QUERY 2: Verificar estrutura do snapshot (chaves de kcal)
SELECT 
  title,
  jsonb_object_keys(plan_snapshot) as chaves_kcal
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- QUERY 3: Verificar estrutura do perfil 1500 kcal
SELECT 
  title,
  jsonb_typeof(plan_snapshot->'1500') as tipo_1500,
  (plan_snapshot->'1500' ? 'days') as tem_chave_days,
  jsonb_typeof(plan_snapshot->'1500'->'days') as tipo_days
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- QUERY 4: Contar quantos dias existem
SELECT 
  title,
  jsonb_array_length(plan_snapshot->'1500'->'days') as qtd_dias
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- QUERY 5: Ver os dias (day_of_week) de cada dia
SELECT 
  title,
  day_index,
  day_data->>'day_of_week' as dia_semana,
  jsonb_array_length(day_data->'meals') as qtd_refeicoes
FROM v3_diet_templates,
     jsonb_array_elements(plan_snapshot->'1500'->'days') WITH ORDINALITY AS t(day_data, day_index)
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- QUERY 6: Ver a primeira refeição do primeiro dia
SELECT 
  title,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'name' as nome_refeicao,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'time' as horario,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'image' as imagem,
  jsonb_array_length(plan_snapshot->'1500'->'days'->0->'meals'->0->'foods') as qtd_foods
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- QUERY 7: Ver os alimentos (foods) da primeira refeição
SELECT 
  title,
  food_data->>'name' as nome_alimento,
  food_data->>'qty' as quantidade,
  food_data->>'kcal' as calorias
FROM v3_diet_templates,
     jsonb_array_elements(plan_snapshot->'1500'->'days'->0->'meals'->0->'foods') as food_data
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 INSTRUÇÕES:
-- 1. Copie CADA query SEPARADAMENTE
-- 2. Cole no Supabase SQL Editor
-- 3. Execute (botão RUN)
-- 4. Copie o resultado
-- 5. Me envie TODOS os 7 resultados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
