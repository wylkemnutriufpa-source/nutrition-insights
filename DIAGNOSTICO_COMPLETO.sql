-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DIAGNÓSTICO COMPLETO - TEMPLATES VAZIOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASSO 1: Verificar quantos templates existem
SELECT 
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE plan_snapshot IS NOT NULL) as com_snapshot,
  COUNT(*) FILTER (WHERE plan_snapshot IS NULL) as sem_snapshot
FROM v3_diet_templates
WHERE active = true;

-- PASSO 2: Verificar a estrutura do plan_snapshot de 1 template
SELECT 
  title,
  jsonb_typeof(plan_snapshot) as tipo_snapshot,
  jsonb_object_keys(plan_snapshot) as chaves_kcal
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true
LIMIT 1;

-- PASSO 3: Verificar a estrutura interna do snapshot (chave 1500)
SELECT 
  title,
  jsonb_typeof(plan_snapshot->'1500') as tipo_1500,
  CASE 
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'object' THEN jsonb_object_keys(plan_snapshot->'1500')
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN 'É ARRAY'
    ELSE 'OUTRO'
  END as estrutura_1500
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- PASSO 4: Se for objeto, verificar se tem chave "days"
SELECT 
  title,
  (plan_snapshot->'1500' ? 'days') as tem_chave_days,
  jsonb_typeof(plan_snapshot->'1500'->'days') as tipo_days,
  jsonb_array_length(plan_snapshot->'1500'->'days') as qtd_dias
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- PASSO 5: Verificar a primeira refeição do primeiro dia
SELECT 
  title,
  plan_snapshot->'1500'->'days'->0->'day_of_week' as dia_semana,
  jsonb_array_length(plan_snapshot->'1500'->'days'->0->'meals') as qtd_refeicoes,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'name' as nome_primeira_refeicao,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'time' as horario,
  plan_snapshot->'1500'->'days'->0->'meals'->0->>'image' as imagem_url
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- PASSO 6: Verificar os alimentos (foods) da primeira refeição
SELECT 
  title,
  jsonb_array_length(plan_snapshot->'1500'->'days'->0->'meals'->0->'foods') as qtd_foods,
  plan_snapshot->'1500'->'days'->0->'meals'->0->'foods' as foods_array
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- PASSO 7: Verificar se tem campo "items" ao invés de "foods"
SELECT 
  title,
  (plan_snapshot->'1500'->'days'->0->'meals'->0 ? 'items') as tem_items,
  (plan_snapshot->'1500'->'days'->0->'meals'->0 ? 'foods') as tem_foods,
  CASE 
    WHEN plan_snapshot->'1500'->'days'->0->'meals'->0 ? 'items' THEN 
      jsonb_array_length(plan_snapshot->'1500'->'days'->0->'meals'->0->'items')
    ELSE 0
  END as qtd_items
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;

-- PASSO 8: Listar TODOS os templates com suas estruturas
SELECT 
  title,
  jsonb_object_keys(plan_snapshot) as perfis_kcal,
  CASE 
    WHEN plan_snapshot->'1500' ? 'days' THEN 'TEM DAYS'
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN 'É ARRAY DIRETO'
    ELSE 'OUTRA ESTRUTURA'
  END as estrutura,
  CASE 
    WHEN plan_snapshot->'1500' ? 'days' THEN 
      jsonb_array_length(plan_snapshot->'1500'->'days')
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN 
      jsonb_array_length(plan_snapshot->'1500')
    ELSE 0
  END as qtd_dias
FROM v3_diet_templates
WHERE active = true
ORDER BY title
LIMIT 10;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 INSTRUÇÕES:
-- 1. Execute cada query SEPARADAMENTE no Supabase SQL Editor
-- 2. Copie os resultados de CADA query
-- 3. Me envie os resultados para análise
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
