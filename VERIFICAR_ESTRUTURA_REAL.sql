-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 VERIFICAR ESTRUTURA REAL DO BANCO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- QUERY 1: Verificar estrutura do snapshot
SELECT 
  title,
  jsonb_typeof(plan_snapshot) as tipo_snapshot,
  jsonb_object_keys(plan_snapshot) as chaves_kcal
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 2: Verificar estrutura do perfil 1500 kcal
SELECT 
  title,
  jsonb_typeof(plan_snapshot->'1500') as tipo_1500,
  CASE 
    WHEN plan_snapshot->'1500' ? 'days' THEN 'TEM CHAVE DAYS'
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN 'É ARRAY DIRETO'
    ELSE 'OUTRA ESTRUTURA'
  END as estrutura
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 3: Verificar quantos dias existem
SELECT 
  title,
  CASE 
    WHEN plan_snapshot->'1500' ? 'days' THEN 
      jsonb_array_length(plan_snapshot->'1500'->'days')
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN 
      jsonb_array_length(plan_snapshot->'1500')
    ELSE 0
  END as qtd_dias
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 4: Verificar a primeira refeição do primeiro dia
SELECT 
  title,
  plan_snapshot->'1500'->'days'->0->'meals'->0 as primeira_refeicao
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 5: Verificar os alimentos (foods) da primeira refeição
SELECT 
  title,
  jsonb_array_length(plan_snapshot->'1500'->'days'->0->'meals'->0->'foods') as qtd_foods,
  plan_snapshot->'1500'->'days'->0->'meals'->0->'foods' as foods_array
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 6: Verificar TODOS os dias (day_of_week)
SELECT 
  title,
  jsonb_array_elements(plan_snapshot->'1500'->'days')->>'day_of_week' as dia_semana
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- QUERY 7: Contar refeições por dia
SELECT 
  title,
  day_data->>'day_of_week' as dia_semana,
  jsonb_array_length(day_data->'meals') as qtd_refeicoes
FROM v3_diet_templates,
     jsonb_array_elements(plan_snapshot->'1500'->'days') as day_data
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 INSTRUÇÕES:
-- 1. Execute CADA query SEPARADAMENTE no Supabase SQL Editor
-- 2. Copie o resultado de CADA query
-- 3. Me envie TODOS os resultados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
