-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 SQL DIAGNÓSTICO RÁPIDO - COPIE E COLE NO SUPABASE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 1: Verificar estrutura completa da primeira refeição
SELECT 
  title,
  plan_snapshot->'1500'->0->'meals'->0 as primeira_refeicao_completa
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 2: Verificar se tem foods ou items
SELECT 
  title,
  CASE 
    WHEN plan_snapshot->'1500'->0->'meals'->0->'foods' IS NOT NULL THEN 'TEM FOODS ✅'
    WHEN plan_snapshot->'1500'->0->'meals'->0->'items' IS NOT NULL THEN 'TEM ITEMS ✅'
    ELSE 'VAZIO ❌'
  END as estrutura
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 3: Listar alimentos da primeira refeição
SELECT 
  food_data->>'name' as alimento,
  food_data->>'qty' as quantidade,
  (food_data->>'kcal')::int as calorias
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals'->0->'foods') AS food_data
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RESULTADO ESPERADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Query 1: JSON com name="Cuscuz com Ovo", foods=[...], image="..."
-- Query 2: "TEM FOODS ✅"
-- Query 3: 3 linhas (Cuscuz, Ovo, Mamão)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
