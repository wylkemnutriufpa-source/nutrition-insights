-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DEBUG COMPLETO - VERIFICAR ESTRUTURA DOS TEMPLATES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1️⃣ VERIFICAR ESTRUTURA COMPLETA DO EMAGRECIMENTO 1500
SELECT 
  title,
  plan_snapshot->'1500' as snapshot_completo
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 2️⃣ VERIFICAR SE É ARRAY OU OBJETO
SELECT 
  title,
  jsonb_typeof(plan_snapshot->'1500') as tipo_snapshot,
  CASE 
    WHEN jsonb_typeof(plan_snapshot->'1500') = 'array' THEN jsonb_array_length(plan_snapshot->'1500')
    ELSE NULL
  END as total_elementos
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 3️⃣ VERIFICAR PRIMEIRO ELEMENTO (DIA 1)
SELECT 
  title,
  plan_snapshot->'1500'->0 as dia_1_completo
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 4️⃣ VERIFICAR PRIMEIRA REFEIÇÃO DO DIA 1
SELECT 
  title,
  plan_snapshot->'1500'->0->'meals'->0 as primeira_refeicao_completa
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 5️⃣ VERIFICAR SE TEM FOODS OU ITEMS
SELECT 
  title,
  CASE 
    WHEN plan_snapshot->'1500'->0->'meals'->0->'foods' IS NOT NULL THEN 'TEM FOODS'
    WHEN plan_snapshot->'1500'->0->'meals'->0->'items' IS NOT NULL THEN 'TEM ITEMS'
    ELSE 'VAZIO'
  END as estrutura,
  plan_snapshot->'1500'->0->'meals'->0->'foods' as foods,
  plan_snapshot->'1500'->0->'meals'->0->'items' as items
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 6️⃣ LISTAR TODOS OS ALIMENTOS DO DIA 1
SELECT 
  title,
  food_data->>'name' as alimento,
  food_data->>'qty' as quantidade,
  (food_data->>'kcal')::int as calorias
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals'->0->'foods') AS food_data
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 7️⃣ VERIFICAR TODAS AS REFEIÇÕES DO DIA 1
SELECT 
  title,
  meal_idx as refeicao_numero,
  meal_data->>'name' as nome_refeicao,
  meal_data->>'image' as imagem,
  jsonb_array_length(meal_data->'foods') as total_alimentos
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals') WITH ORDINALITY AS t(meal_data, meal_idx)
WHERE title = 'Emagrecimento 1500 kcal'
ORDER BY meal_idx;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 8️⃣ VERIFICAR TODOS OS 7 DIAS
SELECT 
  title,
  day_idx as dia_numero,
  day_data->>'day' as dia_semana,
  jsonb_array_length(day_data->'meals') as total_refeicoes,
  day_data->'meals'->0->>'name' as primeira_refeicao
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500') WITH ORDINALITY AS t(day_data, day_idx)
WHERE title = 'Emagrecimento 1500 kcal'
ORDER BY day_idx;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RESULTADO ESPERADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Query 2: tipo_snapshot = 'array', total_elementos = 7
-- Query 5: estrutura = 'TEM FOODS', foods = [{...}], items = null
-- Query 6: 3 alimentos (Cuscuz, Ovo, Mamão)
-- Query 7: 6 refeições (Cuscuz com Ovo, Tapioca, Frango, etc)
-- Query 8: 7 dias (Segunda a Domingo)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
